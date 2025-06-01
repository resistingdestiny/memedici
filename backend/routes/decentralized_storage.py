from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import logging
from datetime import datetime
import json
from dataclasses import asdict

from decentralized_dataset import dataset_manager

logger = logging.getLogger('DecentralizedStorageRoutes')

router = APIRouter(prefix="/dataset", tags=["Decentralized Storage"])

class DatasetFeedbackRequest(BaseModel):
    entry_id: str
    rating: int = Field(ge=1, le=5, description="Rating from 1-5 stars")
    flags: List[str] = Field(default_factory=list, description="Issues to flag: inappropriate, low_quality, copyright_violation")
    comments: str = Field(default="", description="Text comments as feedback")
    helpful: bool = Field(default=True, description="Whether the response was helpful")
    wallet_address: str = Field(..., description="User's wallet address for token payout")
    signed_message: str = Field(..., description="Signed message containing entry_id")
    signature: str = Field(..., description="Wallet signature of the signed_message")

class ForceUploadRequest(BaseModel):
    force: bool = Field(default=True, description="Force upload even if batch size not reached")

@router.post("/feedback")
async def submit_dataset_feedback(request: DatasetFeedbackRequest):
    """Submit user feedback for a dataset entry to earn tokens."""
    logger.info(f"📊 Dataset feedback for entry: {request.entry_id} from wallet: {request.wallet_address}")
    
    try:
        message_to_verify = f"feedback:{request.entry_id}"
        
        if not dataset_manager.verify_wallet_signature(
            message=message_to_verify,
            signature=request.signature, 
            wallet_address=request.wallet_address
        ):
            raise HTTPException(status_code=401, detail="Invalid wallet signature")
        
        success = dataset_manager.add_user_feedback(
            entry_id=request.entry_id,
            rating=request.rating,
            flags=request.flags,
            comments=request.comments,
            helpful=request.helpful,
            wallet_address=request.wallet_address
        )
        
        if success:
            reward_amount = dataset_manager._calculate_feedback_reward(
                request.rating, request.flags, request.helpful
            )
            
            # logger.info(f"🪙 TODO: Transfer {reward_amount} tokens to {request.wallet_address}")
            
            return {
                "success": True,
                "message": "Feedback submitted successfully",
                "token_reward": reward_amount,
                "wallet_address": request.wallet_address,
                "payout_pending": True,
                "feedback": {
                    "rating": request.rating,
                    "flags": request.flags,
                    "comments": request.comments,
                    "helpful": request.helpful
                }
            }
        else:
            raise HTTPException(status_code=404, detail="Dataset entry not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_dataset_statistics():
    """Get statistics about the decentralized training dataset."""
    try:
        stats = dataset_manager.get_dataset_stats()
        return {
            "success": True,
            "dataset_statistics": stats,
            "dao_info": {
                "platform": "MemeDici",
                "description": "Decentralized AI Training Data DAO",
                "storage": "Filecoin via Lighthouse",
                "license": "Creative Commons Attribution 4.0",
                "participation_rewards": "Token rewards for quality feedback"
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting dataset stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def force_dataset_upload(request: ForceUploadRequest):
    """Manually trigger dataset batch upload to Filecoin with IPNS publishing."""
    logger.info(f"🚀 Manual dataset upload requested (force={request.force})")
    
    try:
        if request.force:
            # Force upload: get all pending entries
            pending_entries = dataset_manager._get_pending_entries()
        else:
            # Time-based upload: get entries older than upload_delay_minutes
            pending_entries = dataset_manager._get_time_based_pending_entries()
        
        if not pending_entries:
            return {
                "success": False,
                "message": "No entries to upload or batch size not reached",
                "stats": dataset_manager.get_dataset_stats()
            }
        
        # Create dataset batch
        dataset_batch = {
            "dataset_info": {
                "dataset_name": "memedici_ai_training_data",
                "version": "1.0",
                "description": "Decentralized AI training dataset from MemeDici platform",
                "license": "Creative Commons Attribution 4.0",
                "created_by": "MemeDici DAO",
                "batch_timestamp": datetime.utcnow().isoformat(),
                "total_entries": len(pending_entries),
                "schema_version": "1.0",
                "upload_trigger": "force" if request.force else "time_based"
            },
            "entries": [asdict(entry) for entry in pending_entries]
        }
        
        # Upload directly using IPNS method
        filename = f"dataset_batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{len(pending_entries)}entries.json"
        result = dataset_manager.upload_and_publish_to_ipns(dataset_batch, filename)
        
        if result["success"]:
            # Mark entries as uploaded
            file_cid = result["cid"]
            for entry in pending_entries:
                entry.metadata['filecoin_cid'] = file_cid
                entry.metadata['primary_url'] = result.get("primary_url")
                entry.metadata['ipns_address'] = result.get("ipns_address")
                entry.metadata['ipns_published'] = result.get("ipns_published", False)
                entry.metadata['addressing_method'] = result.get("addressing_method")
                entry.metadata['batch_upload_timestamp'] = datetime.utcnow().isoformat()
                entry.metadata['upload_trigger'] = "force" if request.force else "time_based"
                dataset_manager._mark_entry_uploaded(entry.id)
            
            return {
                "success": True,
                "message": "Dataset batch uploaded successfully",
                "filecoin_cid": result.get("cid"),
                "primary_url": result.get("primary_url"),
                "ipns_address": result.get("ipns_address"),
                "gateway_url": f"https://gateway.lighthouse.storage/ipfs/{result.get('cid')}",
                "dataset_tag": dataset_manager.dataset_tag,
                "ipns_published": result.get("ipns_published", False),
                "addressing_method": result.get("addressing_method"),
                "entries_uploaded": len(pending_entries)
            }
        else:
            return {
                "success": False,
                "message": "IPNS upload failed",
                "error": result.get("error")
            }
            
    except Exception as e:
        logger.error(f"❌ Error uploading dataset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/storage")
async def get_filecoin_storage_stats():
    """Get comprehensive Filecoin storage statistics with IPNS information."""
    try:
        dataset_stats = dataset_manager.get_dataset_stats()
        ipns_info = dataset_manager.get_ipns_info()
        
        # Calculate storage statistics from batch files
        batch_files = list(dataset_manager.local_cache_path.glob("batch_*.json"))
        total_files_uploaded = 0
        storage_used_bytes = 0
        cids = []
        last_upload = None
        
        for batch_file in batch_files:
            try:
                with open(batch_file, 'r') as f:
                    batch_data = json.load(f)
                    total_files_uploaded += 1
                    if batch_data.get('file_size'):
                        try:
                            storage_used_bytes += int(batch_data['file_size'])
                        except (ValueError, TypeError):
                            pass
                    if batch_data.get('cid'):
                        cids.append(batch_data['cid'])
                    if batch_data.get('upload_timestamp'):
                        if not last_upload or batch_data['upload_timestamp'] > last_upload:
                            last_upload = batch_data['upload_timestamp']
            except:
                continue
        
        storage_stats = {
            "total_files_uploaded": total_files_uploaded,
            "total_entries": dataset_stats["total_entries"],
            "storage_used_bytes": storage_used_bytes,
            "storage_used_mb": round(storage_used_bytes / (1024 * 1024), 2),
            "storage_used_gb": round(storage_used_bytes / (1024 * 1024 * 1024), 4),
            "last_upload": last_upload,
            "upload_activity": {
                "last_7_days": 0,  # Could be calculated from timestamps
                "last_30_days": 0
            },
            "cids": cids[-10:] if cids else []  # Last 10 CIDs
        }
        
        return {
            "success": True,
            "filecoin_storage": storage_stats,
            "dataset_overview": {
                "total_entries": dataset_stats["total_entries"],
                "pending_entries": dataset_stats["pending_entries"],
                "upload_settings": dataset_stats["upload_settings"]
            },
            "ipns_integration": ipns_info,
            "storage_overview": {
                "description": "Decentralized storage statistics for MemeDici AI training datasets",
                "platform": "Filecoin via Lighthouse",
                "storage_type": "Immutable datasets with IPFS addressing + IPNS consistent addressing",
                "data_format": "HuggingFace-compatible JSON batches",
                "addressing": "Hybrid immutable (IPFS) + mutable (IPNS) architecture"
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting storage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ipns")
async def get_dataset_ipns_info():
    """Get IPNS information for the dataset."""
    try:
        ipns_info = dataset_manager.get_ipns_info()
        return {
            "success": True,
            "ipns_info": ipns_info,
            "benefits": {
                "consistent_address": "Same URL always points to latest dataset",
                "automatic_updates": "IPNS updates every 5 minutes with new batches",
                "researcher_friendly": "Bookmark one address for latest training data",
                "version_control": "Access specific versions via direct CIDs"
            }
        }
    except Exception as e:
        logger.error(f"❌ Error getting IPNS info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ipns/publish")
async def publish_to_ipns():
    """Upload test data and publish to IPNS using CLI hybrid approach."""
    logger.info("🚀 Testing IPNS upload and publish")
    
    try:
        # Create test dataset
        test_data = {
            "dataset_info": {
                "dataset_name": "memedici_ipns_test",
                "version": "1.0",
                "description": "Test dataset for IPNS CLI hybrid approach",
                "created": datetime.utcnow().isoformat(),
                "license": "Creative Commons Attribution 4.0"
            },
            "test_entries": [
                {
                    "id": f"test_entry_{i}",
                    "prompt": f"Test prompt {i} for IPNS CLI hybrid",
                    "response": f"Test response {i} with CLI publishing",
                    "timestamp": datetime.utcnow().isoformat()
                }
                for i in range(1, 6)
            ],
            "metadata": {
                "approach": "CLI + Python SDK Hybrid",
                "upload_method": "Python SDK (lighthouseweb3)",
                "ipns_method": "Lighthouse CLI"
            }
        }
        
        # Upload and publish using hybrid approach
        result = dataset_manager.upload_and_publish_to_ipns(test_data, "ipns_test_dataset.json")
        
        if result["success"]:
            return {
                "success": True,
                "message": "IPNS upload and publish successful",
                "result": result
            }
        else:
            return {
                "success": False,
                "message": "IPNS upload and publish failed",
                "error": result.get("error")
            }
            
    except Exception as e:
        logger.error(f"❌ Error testing IPNS: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 