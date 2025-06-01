from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import logging
from datetime import datetime
import json

from decentralized_dataset import dataset_manager

logger = logging.getLogger('DecentralizedStorageRoutes')

router = APIRouter(prefix="/dataset", tags=["Decentralized Storage"])

class DatasetFeedbackRequest(BaseModel):
    entry_id: str
    rating: int = Field(ge=1, le=5, description="Rating from 1-5 stars")
    flags: List[str] = Field(default_factory=list, description="Issues to flag: inappropriate, low_quality, copyright_violation")
    comments: str = Field(default="", description="Optional feedback comments")
    helpful: bool = Field(default=True, description="Whether the response was helpful")

class ForceUploadRequest(BaseModel):
    force: bool = Field(default=True, description="Force upload even if batch size not reached")

@router.post("/feedback")
async def submit_dataset_feedback(request: DatasetFeedbackRequest):
    """Submit user feedback for a dataset entry to earn tokens."""
    logger.info(f"📊 Dataset feedback for entry: {request.entry_id}")
    
    try:
        success = dataset_manager.add_user_feedback(
            entry_id=request.entry_id,
            rating=request.rating,
            flags=request.flags,
            comments=request.comments,
            helpful=request.helpful
        )
        
        if success:
            reward_amount = dataset_manager._calculate_feedback_reward(
                request.rating, request.flags, request.helpful
            )
            
            return {
                "success": True,
                "message": "Feedback submitted successfully",
                "token_reward": reward_amount,
                "feedback": {
                    "rating": request.rating,
                    "flags": request.flags,
                    "comments": request.comments,
                    "helpful": request.helpful
                }
            }
        else:
            raise HTTPException(status_code=404, detail="Dataset entry not found")
            
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
    """Manually trigger dataset batch upload to Filecoin."""
    logger.info(f"🚀 Manual dataset upload requested (force={request.force})")
    
    try:
        uploaded_cid = dataset_manager.store_batch_to_filecoin(force=request.force)
        
        if uploaded_cid:
            return {
                "success": True,
                "message": "Dataset batch uploaded successfully",
                "filecoin_cid": uploaded_cid,
                "gateway_url": f"https://gateway.lighthouse.storage/ipfs/{uploaded_cid}",
                "dataset_tag": dataset_manager.dataset_tag
            }
        else:
            return {
                "success": False,
                "message": "No entries to upload or batch size not reached",
                "stats": dataset_manager.get_dataset_stats()
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
                "batch_settings": dataset_stats["batch_settings"]
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