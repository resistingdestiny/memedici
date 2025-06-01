#!/usr/bin/env python3
"""
Decentralized AI Training Data DAO for MemeDici
Essential functions for Filecoin storage and IPNS integration
"""

import os
import json
import hashlib
import uuid
import subprocess
import tempfile
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from pathlib import Path

from lighthouseweb3 import Lighthouse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class DatasetEntry:
    """Single entry in the decentralized training dataset."""
    id: str
    timestamp: str
    session_id: str
    input: Dict[str, Any]
    output: Dict[str, Any]
    feedback: Optional[Dict[str, Any]] = None
    provenance: Dict[str, Any] = None
    metadata: Dict[str, Any] = None

class DecentralizedDatasetManager:
    """Core dataset manager for Filecoin storage with IPNS integration."""
    
    def __init__(self):
        self.lighthouse_api_key = os.getenv('LIGHTHOUSE_API_KEY')
        if not self.lighthouse_api_key:
            raise ValueError("LIGHTHOUSE_API_KEY not found in environment variables")
        
        self.lighthouse = Lighthouse(token=self.lighthouse_api_key)
        self.dataset_tag = "memedici-ai-training-dataset"
        self.batch_size = 100
        self.local_cache_path = Path("./dataset_cache")
        self.local_cache_path.mkdir(exist_ok=True)
        
        # IPNS configuration
        self.ipns_config_file = Path("ipns_config.json")
        self._load_ipns_config()
    
    def _load_ipns_config(self):
        """Load IPNS configuration from file."""
        if self.ipns_config_file.exists():
            try:
                with open(self.ipns_config_file, 'r') as f:
                    self.ipns_config = json.load(f)
            except Exception:
                self.ipns_config = None
        else:
            self.ipns_config = None
    
    def get_ipns_info(self) -> Dict[str, Any]:
        """Get current IPNS information."""
        if not self.ipns_config:
            return {
                "status": "not_configured",
                "setup_required": True,
                "setup_script": "backend/utils/setup_lighthouse_cli.sh"
            }
        
        return {
            "status": "configured",
            "ipnsName": self.ipns_config['ipnsName'],
            "ipnsId": self.ipns_config['ipnsId'],
            "ipns_address": f"https://gateway.lighthouse.storage/ipns/{self.ipns_config['ipnsName']}",
            "created_at": self.ipns_config.get('created_at'),
            "description": self.ipns_config.get('description'),
            "lighthouse_cli_version": self.ipns_config.get('lighthouse_cli_version')
        }
    
    def create_dataset_entry(
        self,
        prompt: str,
        agent_id: str,
        agent_name: str,
        response_data: Dict[str, Any],
        session_id: str,
        model_parameters: Dict[str, Any] = None,
        generation_time_ms: int = 0
    ) -> DatasetEntry:
        """Create a new dataset entry from a chat interaction."""
        
        entry_id = f"memedici_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.utcnow().isoformat()
        
        input_data = {
            "prompt": prompt,
            "agent_id": agent_id,
            "agent_name": agent_name,
            "model_parameters": model_parameters or {},
            "interaction_type": "chat_generation"
        }
        
        output_data = {
            "response": response_data.get("response", ""),
            "assets": response_data.get("assets", {}),
            "success": response_data.get("success", False),
            "generation_time_ms": generation_time_ms,
            "tools_used": response_data.get("tools_used", []),
            "artworks_created": response_data.get("artworks_created", 0)
        }
        
        provenance_data = {
            "consent_given": True,
            "data_usage_rights": "ai_training",
            "attribution_required": False,
            "commercial_use": True,
            "platform": "MemeDici",
            "agent_creator_permission": True
        }
        
        metadata = {
            "platform": "MemeDici",
            "version": "2.0.0",
            "content_hash": self._calculate_content_hash(input_data, output_data),
            "filecoin_cid": None,
            "dataset_schema_version": "1.0"
        }
        
        entry = DatasetEntry(
            id=entry_id,
            timestamp=timestamp,
            session_id=session_id,
            input=input_data,
            output=output_data,
            provenance=provenance_data,
            metadata=metadata
        )
        
        # Save to cache
        self._save_entry_to_cache(entry)
        return entry
    
    def add_user_feedback(
        self,
        entry_id: str,
        rating: int,
        flags: List[str] = None,
        comments: str = "",
        helpful: bool = True
    ) -> bool:
        """Add user feedback to an existing dataset entry."""
        
        entry = self._load_entry_from_cache(entry_id)
        if not entry:
            return False
        
        feedback_data = {
            "rating": max(1, min(5, rating)),
            "flags": flags or [],
            "comments": comments,
            "helpful": helpful,
            "feedback_timestamp": datetime.utcnow().isoformat(),
            "version": "1.0"
        }
        
        entry.feedback = feedback_data
        self._save_entry_to_cache(entry)
        
        reward_amount = self._calculate_feedback_reward(rating, flags, helpful)
        print(f"🪙 User earned {reward_amount} tokens for feedback!")
        
        return True
    
    def upload_and_publish_to_ipns(self, data: Dict[str, Any], filename: str = None) -> Dict[str, Any]:
        """Upload data to Filecoin and publish to IPNS using CLI hybrid approach."""
        if not filename:
            filename = f"dataset_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            # Upload to Filecoin using Python SDK
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
                json.dump(data, temp_file, indent=2)
                temp_file_path = temp_file.name
            
            upload_result = self.lighthouse.upload(source=temp_file_path, tag=self.dataset_tag)
            
            if isinstance(upload_result, dict) and 'data' in upload_result:
                cid = upload_result['data']['Hash']
                file_size = upload_result['data']['Size']
            else:
                raise ValueError(f"Unexpected upload result format: {upload_result}")
            
            os.remove(temp_file_path)
            
            # Publish to IPNS using CLI
            if self.ipns_config:
                ipns_success = self._publish_to_ipns_via_cli(cid)
                
                return {
                    "success": True,
                    "cid": cid,
                    "file_size": file_size,
                    "ipns_address": f"https://gateway.lighthouse.storage/ipns/{self.ipns_config['ipnsName']}" if ipns_success else None,
                    "direct_url": f"https://gateway.lighthouse.storage/ipfs/{cid}",
                    "filename": filename,
                    "ipns_published": ipns_success
                }
            else:
                return {
                    "success": True,
                    "cid": cid,
                    "file_size": file_size,
                    "direct_url": f"https://gateway.lighthouse.storage/ipfs/{cid}",
                    "filename": filename,
                    "ipns_published": False,
                    "warning": "No IPNS configuration"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def store_batch_to_filecoin(self, force: bool = False) -> Optional[str]:
        """Store a batch of dataset entries to Filecoin via Lighthouse."""
        
        pending_entries = self._get_pending_entries()
        
        if len(pending_entries) < self.batch_size and not force:
            return None
        
        if not pending_entries:
            return None
        
        try:
            dataset_batch = {
                "dataset_info": {
                    "dataset_name": "memedici_ai_training_data",
                    "version": "1.0",
                    "description": "Decentralized AI training dataset from MemeDici platform",
                    "license": "Creative Commons Attribution 4.0",
                    "created_by": "MemeDici DAO",
                    "batch_timestamp": datetime.utcnow().isoformat(),
                    "total_entries": len(pending_entries),
                    "schema_version": "1.0"
                },
                "entries": [asdict(entry) for entry in pending_entries]
            }
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
                json.dump(dataset_batch, temp_file, indent=2)
                temp_file_path = temp_file.name
            
            upload_result = self.lighthouse.upload(source=temp_file_path, tag=self.dataset_tag)
            
            if isinstance(upload_result, dict) and 'data' in upload_result:
                file_cid = upload_result['data']['Hash']
                file_size = upload_result['data']['Size']
                filename = upload_result['data']['Name']
            else:
                file_cid = str(upload_result)
                file_size = None
                filename = None
            
            if not file_cid:
                raise ValueError("Failed to extract CID from upload result")
            
            # Mark entries as uploaded
            for entry in pending_entries:
                entry.metadata['filecoin_cid'] = file_cid
                entry.metadata['batch_upload_timestamp'] = datetime.utcnow().isoformat()
                self._mark_entry_uploaded(entry.id)
            
            os.remove(temp_file_path)
            self._save_batch_info(file_cid, len(pending_entries), pending_entries, file_size, filename)
            
            return file_cid
            
        except Exception as e:
            print(f"❌ Failed to upload dataset batch: {e}")
            return None
    
    def get_dataset_stats(self) -> Dict[str, Any]:
        """Get statistics about the decentralized dataset."""
        
        cache_files = list(self.local_cache_path.glob("entry_*.json"))
        uploaded_files = list(self.local_cache_path.glob("uploaded_*.json"))
        
        total_entries = len(cache_files)
        uploaded_entries = len(uploaded_files)
        pending_entries = total_entries - uploaded_entries
        
        # Calculate ratings distribution
        ratings = []
        for cache_file in cache_files:
            try:
                with open(cache_file, 'r') as f:
                    entry_data = json.load(f)
                    if entry_data.get('feedback') and 'rating' in entry_data['feedback']:
                        ratings.append(entry_data['feedback']['rating'])
            except:
                continue
        
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[str(i)] = ratings.count(i)
        
        return {
            "total_entries": total_entries,
            "uploaded_entries": uploaded_entries,
            "pending_entries": pending_entries,
            "avg_rating": sum(ratings) / len(ratings) if ratings else 0,
            "rating_distribution": rating_distribution,
            "dataset_tag": self.dataset_tag,
            "last_updated": datetime.utcnow().isoformat(),
            "batch_settings": {
                "batch_size": self.batch_size,
                "pending_for_upload": pending_entries
            }
        }
    
    # Private helper methods
    def _publish_to_ipns_via_cli(self, cid: str) -> bool:
        """Publish CID to IPNS using Lighthouse CLI."""
        if not self.ipns_config:
            return False
        
        try:
            cmd = [
                "lighthouse-web3", "ipns", "--publish",
                f"--key={self.ipns_config['ipnsName']}",
                f"--cid={cid}"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return result.returncode == 0
        except Exception:
            return False
    
    def _calculate_content_hash(self, input_data: Dict, output_data: Dict) -> str:
        """Calculate SHA-256 hash of content for integrity verification."""
        content = json.dumps({"input": input_data, "output": output_data}, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _calculate_feedback_reward(self, rating: int, flags: List[str], helpful: bool) -> float:
        """Calculate token reward for user feedback."""
        base_reward = 1.0
        rating_bonus = rating * 0.2
        helpful_bonus = 0.5 if helpful else 0
        flag_penalty = len(flags) * 0.1
        
        return max(0.1, base_reward + rating_bonus + helpful_bonus - flag_penalty)
    
    def _save_entry_to_cache(self, entry: DatasetEntry):
        """Save dataset entry to local cache."""
        cache_file = self.local_cache_path / f"entry_{entry.id}.json"
        with open(cache_file, 'w') as f:
            json.dump(asdict(entry), f, indent=2)
    
    def _load_entry_from_cache(self, entry_id: str) -> Optional[DatasetEntry]:
        """Load dataset entry from local cache."""
        cache_file = self.local_cache_path / f"entry_{entry_id}.json"
        if not cache_file.exists():
            return None
        
        try:
            with open(cache_file, 'r') as f:
                entry_data = json.load(f)
                return DatasetEntry(**entry_data)
        except Exception:
            return None
    
    def _get_pending_entries(self) -> List[DatasetEntry]:
        """Get all entries that haven't been uploaded to Filecoin yet."""
        pending_entries = []
        
        cache_files = list(self.local_cache_path.glob("entry_*.json"))
        
        for cache_file in cache_files:
            entry_id = cache_file.stem.replace("entry_", "")
            
            uploaded_marker = self.local_cache_path / f"uploaded_{entry_id}.marker"
            if uploaded_marker.exists():
                continue
            
            entry = self._load_entry_from_cache(entry_id)
            if entry:
                pending_entries.append(entry)
        
        return pending_entries
    
    def _mark_entry_uploaded(self, entry_id: str):
        """Mark an entry as uploaded to Filecoin."""
        marker_file = self.local_cache_path / f"uploaded_{entry_id}.marker"
        with open(marker_file, 'w') as f:
            json.dump({
                "uploaded_at": datetime.utcnow().isoformat(),
                "entry_id": entry_id
            }, f)
    
    def _save_batch_info(self, cid: str, entry_count: int, entries: List[DatasetEntry], file_size: str = None, filename: str = None):
        """Save information about uploaded batch."""
        batch_info = {
            "cid": cid,
            "entry_count": entry_count,
            "file_size": file_size,
            "filename": filename,
            "upload_timestamp": datetime.utcnow().isoformat(),
            "entry_ids": [entry.id for entry in entries],
            "dataset_tag": self.dataset_tag,
            "lighthouse_gateway_url": f"https://gateway.lighthouse.storage/ipfs/{cid}"
        }
        
        batch_file = self.local_cache_path / f"batch_{cid[:12]}.json"
        with open(batch_file, 'w') as f:
            json.dump(batch_info, f, indent=2)

# Global dataset manager instance
dataset_manager = DecentralizedDatasetManager() 