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
import threading
import time
from datetime import datetime, timedelta
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
        self.upload_delay_minutes = 2  # Upload after 2 minutes if no feedback
        self.local_cache_path = Path("./dataset_cache")
        self.local_cache_path.mkdir(exist_ok=True)
        
        # IPNS configuration
        self.ipns_config_file = Path("ipns_config.json")
        self._load_ipns_config()
        
        # Start background timer for automatic uploads
        self._start_upload_timer()
    
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
    
    def verify_wallet_signature(self, message: str, signature: str, wallet_address: str) -> bool:
        """Verify that the wallet signed the message."""
        try:
            # Use eth_account or similar to verify signature
            from eth_account.messages import encode_defunct
            from eth_account import Account
            
            message_hash = encode_defunct(text=message)
            recovered_address = Account.recover_message(message_hash, signature=signature)
            return recovered_address.lower() == wallet_address.lower()
        except Exception as e:
            print(f"❌ Signature verification failed: {e}")
            return False
    
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
        helpful: bool = True,
        wallet_address: str = None
    ) -> bool:
        """Add user feedback to an existing dataset entry and trigger immediate upload."""
        
        entry = self._load_entry_from_cache(entry_id)
        if not entry:
            return False
        
        feedback_data = {
            "rating": max(1, min(5, rating)),
            "flags": flags or [],
            "comments": comments,
            "helpful": helpful,
            "feedback_timestamp": datetime.utcnow().isoformat(),
            "wallet_address": wallet_address,
            "version": "1.0"
        }
        
        entry.feedback = feedback_data
        self._save_entry_to_cache(entry)
        
        # TODO: GENERATE SMART CONTRACT CALL TO PAYOUT
        reward_amount = self._calculate_feedback_reward(rating, flags, helpful)
        print(f"🪙 TODO: Smart contract payout of {reward_amount} tokens to {wallet_address}")
        
        return True
    
    def upload_and_publish_to_ipns(self, data: Dict[str, Any], filename: str = None) -> Dict[str, Any]:
        """Upload data to Filecoin and publish to IPNS - IPNS is the primary address."""
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
            
            # Always attempt IPNS publishing - this is our primary addressing method
            if self.ipns_config:
                ipns_success = self._publish_to_ipns_via_cli(cid)
                ipns_address = f"https://gateway.lighthouse.storage/ipns/{self.ipns_config['ipnsName']}"
                
                if ipns_success:
                    # IPNS is primary - return IPNS address as the main URL
                    return {
                        "success": True,
                        "cid": cid,
                        "file_size": file_size,
                        "primary_url": ipns_address,  # IPNS is primary
                        "ipns_address": ipns_address,
                        "direct_ipfs_url": f"https://gateway.lighthouse.storage/ipfs/{cid}",  # Fallback only
                        "filename": filename,
                        "ipns_published": True,
                        "addressing_method": "ipns_primary"
                    }
                else:
                    # IPNS failed but we still have IPFS
                    print("⚠️  IPNS publishing failed, falling back to direct IPFS")
                    return {
                        "success": True,
                        "cid": cid,
                        "file_size": file_size,
                        "primary_url": f"https://gateway.lighthouse.storage/ipfs/{cid}",  # Fallback to IPFS
                        "ipns_address": None,
                        "direct_ipfs_url": f"https://gateway.lighthouse.storage/ipfs/{cid}",
                        "filename": filename,
                        "ipns_published": False,
                        "addressing_method": "ipfs_fallback",
                        "warning": "IPNS publishing failed"
                    }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "addressing_method": "failed"
            }
    
    def store_batch_to_filecoin(self, force: bool = False) -> Optional[str]:
        """Store dataset entries to Filecoin and publish to IPNS based on time or force upload."""
        
        if force:
            # Force upload: get all pending entries
            pending_entries = self._get_pending_entries()
        else:
            # Time-based upload: get entries older than upload_delay_minutes
            pending_entries = self._get_time_based_pending_entries()
        
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
                    "schema_version": "1.0",
                    "upload_trigger": "force" if force else "time_based"
                },
                "entries": [asdict(entry) for entry in pending_entries]
            }
            
            # Always use upload_and_publish_to_ipns for consistent IPNS addressing
            filename = f"dataset_batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{len(pending_entries)}entries.json"
            upload_result = self.upload_and_publish_to_ipns(dataset_batch, filename)
            
            if not upload_result.get("success"):
                raise ValueError(f"IPNS upload failed: {upload_result.get('error')}")
            
            file_cid = upload_result["cid"]
            file_size = upload_result.get("file_size")
            primary_url = upload_result.get("primary_url")
            ipns_address = upload_result.get("ipns_address")
            ipns_published = upload_result.get("ipns_published", False)
            addressing_method = upload_result.get("addressing_method", "unknown")
            
            # Mark entries as uploaded
            for entry in pending_entries:
                entry.metadata['filecoin_cid'] = file_cid
                entry.metadata['primary_url'] = primary_url  # IPNS preferred, IPFS fallback
                entry.metadata['ipns_address'] = ipns_address
                entry.metadata['ipns_published'] = ipns_published
                entry.metadata['addressing_method'] = addressing_method
                entry.metadata['batch_upload_timestamp'] = datetime.utcnow().isoformat()
                entry.metadata['upload_trigger'] = "force" if force else "time_based"
                self._mark_entry_uploaded(entry.id)
            
            self._save_batch_info(file_cid, len(pending_entries), pending_entries, file_size, filename, primary_url, ipns_address, ipns_published, addressing_method)
            
            upload_type = 'force' if force else 'time-based'
            ipns_status = 'with IPNS' if ipns_published else 'CID only'
            print(f"📦 Uploaded {len(pending_entries)} entries to Filecoin ({upload_type} upload, {ipns_status})")
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
        
        # Get time-based pending entries (older than 2 minutes)
        time_based_pending = self._get_time_based_pending_entries()
        
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
            "time_based_pending": len(time_based_pending),
            "avg_rating": sum(ratings) / len(ratings) if ratings else 0,
            "rating_distribution": rating_distribution,
            "dataset_tag": self.dataset_tag,
            "last_updated": datetime.utcnow().isoformat(),
            "upload_settings": {
                "upload_delay_minutes": self.upload_delay_minutes,
                "entries_ready_for_upload": len(time_based_pending),
                "strategy": "time_based_with_immediate_feedback"
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
    
    def _save_batch_info(self, cid: str, entry_count: int, entries: List[DatasetEntry], file_size: str = None, filename: str = None, primary_url: str = None, ipns_address: str = None, ipns_published: bool = False, addressing_method: str = "unknown"):
        """Save information about uploaded batch."""
        batch_info = {
            "cid": cid,
            "entry_count": entry_count,
            "file_size": file_size,
            "filename": filename,
            "upload_timestamp": datetime.utcnow().isoformat(),
            "entry_ids": [entry.id for entry in entries],
            "dataset_tag": self.dataset_tag,
            "primary_url": primary_url,  # IPNS preferred, IPFS fallback
            "ipns_address": ipns_address,
            "ipns_published": ipns_published,
            "addressing_method": addressing_method,
            "lighthouse_gateway_url": f"https://gateway.lighthouse.storage/ipfs/{cid}"  # Direct IPFS fallback
        }
        
        batch_file = self.local_cache_path / f"batch_{cid[:12]}.json"
        with open(batch_file, 'w') as f:
            json.dump(batch_info, f, indent=2)

    def _start_upload_timer(self):
        """Start a background timer for automatic uploads."""
        threading.Timer(self.upload_delay_minutes * 60, self._perform_automatic_uploads).start()

    def _perform_automatic_uploads(self):
        """Perform automatic uploads based on the timer."""
        pending_entries = self._get_pending_entries()
        if pending_entries:
            self.store_batch_to_filecoin()
        self._start_upload_timer()

    def _get_time_based_pending_entries(self) -> List[DatasetEntry]:
        """Get entries that are older than upload_delay_minutes and haven't been uploaded."""
        pending_entries = []
        cutoff_time = datetime.utcnow() - timedelta(minutes=self.upload_delay_minutes)
        
        cache_files = list(self.local_cache_path.glob("entry_*.json"))
        
        for cache_file in cache_files:
            entry_id = cache_file.stem.replace("entry_", "")
            
            # Skip if already uploaded
            uploaded_marker = self.local_cache_path / f"uploaded_{entry_id}.marker"
            if uploaded_marker.exists():
                continue
            
            entry = self._load_entry_from_cache(entry_id)
            if entry:
                # Parse entry timestamp and check if it's old enough
                try:
                    entry_time = datetime.fromisoformat(entry.timestamp.replace('Z', '+00:00'))
                    # Remove timezone info for comparison
                    entry_time = entry_time.replace(tzinfo=None)
                    
                    if entry_time <= cutoff_time:
                        pending_entries.append(entry)
                except Exception as e:
                    print(f"⚠️  Error parsing timestamp for entry {entry_id}: {e}")
                    # If we can't parse timestamp, include it in upload to be safe
                    pending_entries.append(entry)
        
        return pending_entries

# Global dataset manager instance
dataset_manager = DecentralizedDatasetManager() 