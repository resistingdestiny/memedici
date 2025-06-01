import hashlib
import time
import uuid
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3
import json
import os
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from agent_config import Base, SessionLocal

# Feedback database models
class FeedbackDB(Base):
    __tablename__ = "feedback_submissions"
    
    id = Column(String, primary_key=True)
    user_wallet = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    feedback_type = Column(String, nullable=False)  # "rating", "text", "bug_report", etc.
    feedback_content = Column(Text, nullable=False)
    quality_rating = Column(Integer, nullable=False)  # 1-10 scale
    context_data = Column(JSON, default={})  # Additional context (agent_id, artwork_id, etc.)
    
    # Oracle processing
    proof_generated = Column(Boolean, default=False)
    proof_data = Column(JSON, default={})
    blockchain_processed = Column(Boolean, default=False)
    transaction_hash = Column(String, nullable=True)
    reward_amount = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

@dataclass
class FeedbackProof:
    user: str
    feedback_id: str
    quality_rating: int
    timestamp: int
    signature: str

@dataclass
class BatchFeedbackProof:
    users: List[str]
    feedback_ids: List[str]
    quality_ratings: List[int]
    timestamps: List[int]
    signature: str

class FeedbackOracle:
    """
    Backend oracle for processing user feedback and generating blockchain proofs
    """
    
    def __init__(self, web3_provider_url: str, oracle_private_key: str, 
                 oracle_contract_address: str, reward_token_address: str):
        self.w3 = Web3(Web3.HTTPProvider(web3_provider_url))
        self.oracle_account = Account.from_key(oracle_private_key)
        self.oracle_contract_address = oracle_contract_address
        self.reward_token_address = reward_token_address
        
        # Load contract ABIs (would be loaded from files in production)
        self.oracle_abi = self._load_oracle_abi()
        self.token_abi = self._load_token_abi()
        
        # Contract instances
        self.oracle_contract = self.w3.eth.contract(
            address=oracle_contract_address,
            abi=self.oracle_abi
        )
        self.token_contract = self.w3.eth.contract(
            address=reward_token_address,
            abi=self.token_abi
        )
        
        # Quality assessment weights
        self.quality_weights = {
            'length': 0.2,      # Feedback length
            'specificity': 0.3,  # Contains specific details
            'constructiveness': 0.3,  # Constructive vs just complaint
            'usefulness': 0.2    # Actionable insights
        }
    
    def submit_feedback(self, user_wallet: str, feedback_type: str, 
                       feedback_content: str, context_data: Dict = None) -> str:
        """
        Submit user feedback and generate proof for blockchain processing
        """
        session = SessionLocal()
        try:
            # Generate feedback ID
            feedback_id = str(uuid.uuid4())
            
            # Assess feedback quality
            quality_rating = self._assess_feedback_quality(feedback_content, feedback_type)
            
            # Store feedback in database
            feedback_record = FeedbackDB(
                id=feedback_id,
                user_wallet=user_wallet.lower(),
                feedback_type=feedback_type,
                feedback_content=feedback_content,
                quality_rating=quality_rating,
                context_data=context_data or {}
            )
            
            session.add(feedback_record)
            session.commit()
            
            # Generate cryptographic proof
            proof = self._generate_feedback_proof(
                user_wallet, feedback_id, quality_rating, int(time.time())
            )
            
            # Update record with proof
            feedback_record.proof_generated = True
            feedback_record.proof_data = {
                'user': proof.user,
                'feedback_id': proof.feedback_id,
                'quality_rating': proof.quality_rating,
                'timestamp': proof.timestamp,
                'signature': proof.signature
            }
            session.commit()
            
            print(f"✅ Feedback submitted: {feedback_id} (Quality: {quality_rating}/10)")
            
            return feedback_id
            
        except Exception as e:
            session.rollback()
            print(f"❌ Error submitting feedback: {e}")
            raise
        finally:
            session.close()
    
    def _assess_feedback_quality(self, content: str, feedback_type: str) -> int:
        """
        AI-based feedback quality assessment (simplified version)
        Returns rating from 1-10
        """
        score = 5  # Base score
        
        # Length assessment
        if len(content) > 100:
            score += 1
        if len(content) > 300:
            score += 1
        
        # Content analysis (simplified - would use NLP in production)
        constructive_keywords = ['suggest', 'improve', 'recommend', 'better', 'enhance']
        specific_keywords = ['bug', 'error', 'issue', 'feature', 'function']
        
        content_lower = content.lower()
        
        # Constructiveness
        if any(keyword in content_lower for keyword in constructive_keywords):
            score += 1
        
        # Specificity
        if any(keyword in content_lower for keyword in specific_keywords):
            score += 1
        
        # Type-specific bonuses
        if feedback_type == 'bug_report' and len(content) > 200:
            score += 1
        elif feedback_type == 'feature_request' and 'would like' in content_lower:
            score += 1
        
        return min(10, max(1, score))
    
    def _generate_feedback_proof(self, user: str, feedback_id: str, 
                                quality_rating: int, timestamp: int) -> FeedbackProof:
        """
        Generate cryptographic proof for feedback submission
        """
        # Create feedback hash (same as contract)
        feedback_hash = Web3.keccak(
            Web3.toBytes(hexstr=user.lower()) + 
            feedback_id.encode('utf-8') + 
            timestamp.to_bytes(32, 'big')
        )
        
        # Sign the hash
        message = encode_defunct(feedback_hash)
        signed_message = Account.sign_message(message, self.oracle_account.key)
        
        return FeedbackProof(
            user=user.lower(),
            feedback_id=feedback_id,
            quality_rating=quality_rating,
            timestamp=timestamp,
            signature=signed_message.signature.hex()
        )
    
    def process_pending_feedback(self, batch_size: int = 10) -> bool:
        """
        Process pending feedback submissions to blockchain
        """
        session = SessionLocal()
        try:
            # Get unprocessed feedback
            pending_feedback = session.query(FeedbackDB)\
                .filter(FeedbackDB.proof_generated == True)\
                .filter(FeedbackDB.blockchain_processed == False)\
                .limit(batch_size)\
                .all()
            
            if not pending_feedback:
                print("No pending feedback to process")
                return True
            
            print(f"🔄 Processing {len(pending_feedback)} feedback submissions...")
            
            if len(pending_feedback) == 1:
                # Process single feedback
                feedback = pending_feedback[0]
                proof_data = feedback.proof_data
                
                tx_hash = self._submit_single_proof(
                    FeedbackProof(**proof_data)
                )
                
                if tx_hash:
                    feedback.blockchain_processed = True
                    feedback.transaction_hash = tx_hash
                    feedback.processed_at = datetime.utcnow()
                    feedback.reward_amount = 10.0 + (5.0 if feedback.quality_rating >= 7 else 0.0)
                    
            else:
                # Process batch
                batch_proof = self._create_batch_proof(pending_feedback)
                tx_hash = self._submit_batch_proof(batch_proof)
                
                if tx_hash:
                    for feedback in pending_feedback:
                        feedback.blockchain_processed = True
                        feedback.transaction_hash = tx_hash
                        feedback.processed_at = datetime.utcnow()
                        feedback.reward_amount = 10.0 + (5.0 if feedback.quality_rating >= 7 else 0.0)
            
            session.commit()
            print(f"✅ Successfully processed {len(pending_feedback)} feedback submissions")
            return True
            
        except Exception as e:
            session.rollback()
            print(f"❌ Error processing feedback: {e}")
            return False
        finally:
            session.close()
    
    def _create_batch_proof(self, feedback_list: List[FeedbackDB]) -> BatchFeedbackProof:
        """
        Create batch proof for multiple feedback submissions
        """
        users = []
        feedback_ids = []
        quality_ratings = []
        timestamps = []
        
        for feedback in feedback_list:
            proof_data = feedback.proof_data
            users.append(proof_data['user'])
            feedback_ids.append(proof_data['feedback_id'])
            quality_ratings.append(proof_data['quality_rating'])
            timestamps.append(proof_data['timestamp'])
        
        # Create batch hash
        batch_hash = Web3.keccak(
            Web3.toBytes(text=json.dumps({
                'users': users,
                'feedback_ids': feedback_ids,
                'quality_ratings': quality_ratings,
                'timestamps': timestamps
            }, sort_keys=True))
        )
        
        # Sign batch hash
        message = encode_defunct(batch_hash)
        signed_message = Account.sign_message(message, self.oracle_account.key)
        
        return BatchFeedbackProof(
            users=users,
            feedback_ids=feedback_ids,
            quality_ratings=quality_ratings,
            timestamps=timestamps,
            signature=signed_message.signature.hex()
        )
    
    def _submit_single_proof(self, proof: FeedbackProof) -> Optional[str]:
        """
        Submit single feedback proof to blockchain
        """
        try:
            # Build transaction
            function = self.oracle_contract.functions.processFeedback({
                'user': proof.user,
                'feedbackId': proof.feedback_id,
                'qualityRating': proof.quality_rating,
                'timestamp': proof.timestamp,
                'signature': bytes.fromhex(proof.signature.replace('0x', ''))
            })
            
            # Estimate gas
            gas_estimate = function.estimateGas({'from': self.oracle_account.address})
            
            # Build transaction
            transaction = function.buildTransaction({
                'from': self.oracle_account.address,
                'gas': gas_estimate + 50000,  # Add buffer
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.oracle_account.address)
            })
            
            # Sign and send
            signed_txn = self.oracle_account.sign_transaction(transaction)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            print(f"📝 Single feedback submitted: {tx_hash.hex()}")
            return tx_hash.hex()
            
        except Exception as e:
            print(f"❌ Error submitting single proof: {e}")
            return None
    
    def _submit_batch_proof(self, batch_proof: BatchFeedbackProof) -> Optional[str]:
        """
        Submit batch feedback proof to blockchain
        """
        try:
            # Build transaction
            function = self.oracle_contract.functions.processBatchFeedback({
                'users': batch_proof.users,
                'feedbackIds': batch_proof.feedback_ids,
                'qualityRatings': batch_proof.quality_ratings,
                'timestamps': batch_proof.timestamps,
                'signature': bytes.fromhex(batch_proof.signature.replace('0x', ''))
            })
            
            # Estimate gas
            gas_estimate = function.estimateGas({'from': self.oracle_account.address})
            
            # Build transaction
            transaction = function.buildTransaction({
                'from': self.oracle_account.address,
                'gas': gas_estimate + 100000,  # Add larger buffer for batch
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.oracle_account.address)
            })
            
            # Sign and send
            signed_txn = self.oracle_account.sign_transaction(transaction)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            print(f"📦 Batch feedback submitted: {tx_hash.hex()}")
            return tx_hash.hex()
            
        except Exception as e:
            print(f"❌ Error submitting batch proof: {e}")
            return None
    
    def get_user_feedback_stats(self, user_wallet: str) -> Dict:
        """
        Get comprehensive feedback statistics for a user
        """
        session = SessionLocal()
        try:
            # Database stats
            user_feedback = session.query(FeedbackDB)\
                .filter(FeedbackDB.user_wallet == user_wallet.lower())\
                .all()
            
            db_stats = {
                'total_feedback': len(user_feedback),
                'processed_feedback': len([f for f in user_feedback if f.blockchain_processed]),
                'total_rewards': sum(f.reward_amount for f in user_feedback if f.blockchain_processed),
                'average_quality': sum(f.quality_rating for f in user_feedback) / len(user_feedback) if user_feedback else 0,
                'feedback_by_type': {}
            }
            
            # Feedback by type
            for feedback in user_feedback:
                fb_type = feedback.feedback_type
                if fb_type not in db_stats['feedback_by_type']:
                    db_stats['feedback_by_type'][fb_type] = 0
                db_stats['feedback_by_type'][fb_type] += 1
            
            # Blockchain stats
            try:
                blockchain_stats = self.oracle_contract.functions.getUserFeedbackStats(user_wallet).call()
                db_stats['blockchain_feedback_count'] = blockchain_stats[0]
                db_stats['last_feedback_time'] = blockchain_stats[1]
                db_stats['next_allowed_time'] = blockchain_stats[2]
            except:
                db_stats['blockchain_feedback_count'] = 0
                db_stats['last_feedback_time'] = 0
                db_stats['next_allowed_time'] = 0
            
            return db_stats
            
        finally:
            session.close()
    
    def _load_oracle_abi(self) -> List:
        """Load oracle contract ABI"""
        # This would load from a JSON file in production
        return []  # Placeholder
    
    def _load_token_abi(self) -> List:
        """Load token contract ABI"""
        # This would load from a JSON file in production
        return []  # Placeholder

# Global oracle instance
feedback_oracle: Optional[FeedbackOracle] = None

def initialize_feedback_oracle():
    """Initialize the global feedback oracle"""
    global feedback_oracle
    
    provider_url = os.getenv('WEB3_PROVIDER_URL', 'http://localhost:8545')
    oracle_key = os.getenv('ORACLE_PRIVATE_KEY')
    oracle_address = os.getenv('ORACLE_CONTRACT_ADDRESS')
    token_address = os.getenv('REWARD_TOKEN_ADDRESS')
    
    if oracle_key and oracle_address and token_address:
        feedback_oracle = FeedbackOracle(
            provider_url, oracle_key, oracle_address, token_address
        )
        print("✅ Feedback oracle initialized")
    else:
        print("⚠️  Feedback oracle not initialized - missing environment variables")

def get_feedback_oracle() -> Optional[FeedbackOracle]:
    """Get the global feedback oracle instance"""
    return feedback_oracle 