"""
Feedback Oracle Integration Module
Python backend integration for multi-chain feedback oracle system
"""

import hashlib
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from eth_account import Account
from eth_utils import to_checksum_address, to_hex
from web3 import Web3
import requests
import logging
import os

logger = logging.getLogger(__name__)

@dataclass
class NetworkConfig:
    """Network configuration for feedback oracle"""
    name: str
    chain_id: int
    pyth_address: str
    native_token: str
    price_feed_id: str
    rpc_url: str
    use_fixed_price: bool = False
    fixed_price_usd: Optional[float] = None

@dataclass
class FeedbackProof:
    """Feedback proof structure matching the smart contract"""
    user: str
    feedback_id: str
    quality_rating: int
    timestamp: int
    signature: str

@dataclass
class RewardCalculation:
    """Reward calculation result"""
    network: str
    native_token: str
    quality_rating: int
    has_quality_bonus: bool
    usd_value: float
    erc20_tokens: int
    native_tokens: float
    price_used: float

class FeedbackOracleIntegration:
    """Main integration class for feedback oracle system"""
    
    # Supported networks configuration
    NETWORKS = {
        545: NetworkConfig(  # Flow Testnet
            name="FlowTestnet",
            chain_id=545,
            pyth_address="0x2880aB155794e7179c9eE2e38200202908C17B43",
            native_token="FLOW",
            price_feed_id="0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a80929a2bbb0bc98b40010b",
            rpc_url="https://testnet.evm.nodes.onflow.org"
        ),
        296: NetworkConfig(  # Hedera Testnet
            name="HederaTestnet",
            chain_id=296,
            pyth_address="0xa2aa501b19aff244d90cc15a4cf739d2725b5729",
            native_token="HBAR",
            price_feed_id="0xf2fb7c5e3f75cefc890d52be7c03af6030284137e19d30d54442aca9de250c84",
            rpc_url="https://testnet.hashio.io/api"
        ),
        31: NetworkConfig(   # Rootstock Testnet
            name="RootStockTestnet",
            chain_id=31,
            pyth_address="0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
            native_token="RBTC",
            price_feed_id="0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
            rpc_url="https://public-node.testnet.rsk.co",
            use_fixed_price=True,
            fixed_price_usd=100000.0  # $100,000 USD fallback for BTC
        )
    }
    
    # Reward configuration
    BASE_REWARD_USD = 10.00
    QUALITY_BONUS_USD = 5.00
    QUALITY_THRESHOLD = 7
    BASE_ERC20_TOKENS = 10
    BONUS_ERC20_TOKENS = 5
    
    def __init__(self, signer_private_key: str, skip_verification: bool = False):
        """
        Initialize the feedback oracle integration
        
        Args:
            signer_private_key: Private key for signing feedback proofs
            skip_verification: Global flag to skip verification (owner only)
        """
        self.signer_private_key = signer_private_key
        self.account = Account.from_key(signer_private_key)
        self.signer_address = self.account.address
        self.skip_verification = skip_verification
        
        # Load skip verification flag from environment
        env_skip = os.getenv('FEEDBACK_SKIP_VERIFICATION', 'false').lower()
        if env_skip in ['true', '1', 'yes']:
            self.skip_verification = True
            
        logger.info(f"Feedback Oracle initialized. Skip verification: {self.skip_verification}")
        
    def sign_feedback(self, user_address: str, feedback_id: str, timestamp: int) -> str:
        """
        Generate cryptographic signature for feedback proof
        
        Args:
            user_address: User's wallet address
            feedback_id: Unique feedback identifier
            timestamp: Unix timestamp
            
        Returns:
            Signature hex string
        """
        # Skip signature generation if verification is disabled
        if self.skip_verification:
            logger.warning("Verification skipped - generating dummy signature")
            return "0x" + "0" * 130  # Dummy signature
            
        # Create the same hash that the contract will verify
        encoded_data = Web3.solidityKeccak(
            ['address', 'string', 'uint256'],
            [to_checksum_address(user_address), feedback_id, timestamp]
        )
        
        # Sign the hash
        signed_message = self.account.sign_message_hash(encoded_data)
        return signed_message.signature.hex()
    
    def create_feedback_proof(
        self, 
        user_address: str, 
        feedback_id: str, 
        quality_rating: int,
        timestamp: Optional[int] = None
    ) -> FeedbackProof:
        """
        Create a feedback proof object for contract interaction
        
        Args:
            user_address: User's wallet address
            feedback_id: Unique feedback identifier
            quality_rating: Rating from 1-10
            timestamp: Unix timestamp (optional, defaults to now)
            
        Returns:
            FeedbackProof object
        """
        if timestamp is None:
            timestamp = int(time.time())
            
        signature = self.sign_feedback(user_address, feedback_id, timestamp)
        
        return FeedbackProof(
            user=to_checksum_address(user_address),
            feedback_id=feedback_id,
            quality_rating=quality_rating,
            timestamp=timestamp,
            signature=signature
        )
    
    def get_pyth_price_data(self, chain_id: int) -> List[str]:
        """
        Get Pyth price update data for a specific network
        
        Args:
            chain_id: Network chain ID
            
        Returns:
            List of price update data
        """
        network = self.NETWORKS.get(chain_id)
        if not network:
            raise ValueError(f"Unsupported chain ID: {chain_id}")
            
        # For Rootstock, return empty list since we use fixed pricing
        if network.use_fixed_price:
            return []
            
        try:
            url = f"https://hermes.pyth.network/api/latest_price_feeds?ids[]={network.price_feed_id}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            price_data = data.get('binary', {}).get('data', [])
            return [price_data] if price_data else []
            
        except Exception as e:
            logger.warning(f"Failed to get Pyth price data for {network.name}: {str(e)}")
            return []
    
    def calculate_expected_rewards(
        self, 
        chain_id: int, 
        quality_rating: int, 
        token_price_usd: Optional[float] = None
    ) -> RewardCalculation:
        """
        Calculate expected rewards for a given rating and network
        
        Args:
            chain_id: Network chain ID
            quality_rating: Rating from 1-10
            token_price_usd: Current token price in USD (optional for Rootstock)
            
        Returns:
            RewardCalculation object
        """
        network = self.NETWORKS.get(chain_id)
        if not network:
            raise ValueError(f"Unsupported chain ID: {chain_id}")
            
        has_quality_bonus = quality_rating >= self.QUALITY_THRESHOLD
        usd_value = self.BASE_REWARD_USD + (self.QUALITY_BONUS_USD if has_quality_bonus else 0)
        
        # ERC20 token rewards (fixed amounts)
        erc20_tokens = self.BASE_ERC20_TOKENS + (self.BONUS_ERC20_TOKENS if has_quality_bonus else 0)
        
        # Native token calculation
        price_used = token_price_usd
        if network.use_fixed_price:
            price_used = network.fixed_price_usd
            
        native_tokens = usd_value / price_used if price_used and price_used > 0 else 0
        
        return RewardCalculation(
            network=network.name,
            native_token=network.native_token,
            quality_rating=quality_rating,
            has_quality_bonus=has_quality_bonus,
            usd_value=usd_value,
            erc20_tokens=erc20_tokens,
            native_tokens=native_tokens,
            price_used=price_used or 0
        )
    
    def validate_feedback_proof(self, proof: FeedbackProof) -> bool:
        """
        Validate feedback proof structure
        
        Args:
            proof: FeedbackProof object
            
        Returns:
            True if valid
        """
        # Always return True if verification is skipped
        if self.skip_verification:
            logger.warning("Proof validation skipped")
            return True
            
        try:
            # Check address format
            if not Web3.isAddress(proof.user):
                return False
                
            # Check feedback ID
            if not proof.feedback_id or not isinstance(proof.feedback_id, str):
                return False
                
            # Check quality rating
            if not isinstance(proof.quality_rating, int) or proof.quality_rating < 1 or proof.quality_rating > 10:
                return False
                
            # Check timestamp
            if not isinstance(proof.timestamp, int) or proof.timestamp > int(time.time()):
                return False
                
            # Check signature format
            if not proof.signature or not proof.signature.startswith('0x'):
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error validating feedback proof: {str(e)}")
            return False
    
    def set_verification_skip(self, skip: bool, owner_key: Optional[str] = None) -> bool:
        """
        Set verification skip flag (owner only)
        
        Args:
            skip: Whether to skip verification
            owner_key: Owner's private key for authorization
            
        Returns:
            True if successfully set
        """
        # Check if caller is owner (simplified check)
        if owner_key and owner_key == self.signer_private_key:
            self.skip_verification = skip
            logger.warning(f"Verification skip flag set to: {skip}")
            return True
        
        # Check environment variable for owner override
        owner_override = os.getenv('FEEDBACK_OWNER_OVERRIDE', 'false').lower()
        if owner_override in ['true', '1', 'yes']:
            self.skip_verification = skip
            logger.warning(f"Verification skip flag set via environment override: {skip}")
            return True
            
        logger.error("Unauthorized attempt to modify verification skip flag")
        return False
    
    def get_network_config(self, chain_id: int) -> Optional[NetworkConfig]:
        """
        Get network configuration
        
        Args:
            chain_id: Network chain ID
            
        Returns:
            NetworkConfig object or None
        """
        return self.NETWORKS.get(chain_id)
    
    def get_supported_networks(self) -> Dict[int, NetworkConfig]:
        """
        Get all supported networks
        
        Returns:
            Dictionary of network configurations
        """
        return self.NETWORKS.copy()
    
    def format_feedback_for_storage(
        self, 
        feedback_data: Dict[str, Any], 
        chain_id: int
    ) -> Dict[str, Any]:
        """
        Format feedback for backend storage
        
        Args:
            feedback_data: Raw feedback data
            chain_id: Target network chain ID
            
        Returns:
            Formatted feedback data
        """
        network = self.get_network_config(chain_id)
        expected_rewards = self.calculate_expected_rewards(
            chain_id,
            feedback_data.get('quality_rating', 0),
            feedback_data.get('token_price')
        )
        
        return {
            'id': feedback_data.get('feedback_id'),
            'chain_id': chain_id,
            'network': network.name if network else 'Unknown',
            'user': feedback_data.get('user'),
            'quality_rating': feedback_data.get('quality_rating'),
            'timestamp': feedback_data.get('timestamp'),
            'signature': feedback_data.get('signature'),
            'verification_skipped': self.skip_verification,
            'expected_rewards': {
                'usd_value': expected_rewards.usd_value,
                'erc20_tokens': expected_rewards.erc20_tokens,
                'native_tokens': expected_rewards.native_tokens,
                'native_token_symbol': expected_rewards.native_token,
                'has_quality_bonus': expected_rewards.has_quality_bonus
            },
            'signer_address': self.signer_address,
            'created_at': int(time.time())
        }
    
    @staticmethod
    def create_dataset_entry(
        feedback_proof: FeedbackProof,
        chain_id: int,
        session_id: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a DatasetEntry compatible with the existing dataset system
        
        Args:
            feedback_proof: FeedbackProof object
            chain_id: Network chain ID
            session_id: Session identifier
            input_data: Input data for the dataset entry
            output_data: Output data for the dataset entry
            metadata: Additional metadata
            
        Returns:
            Dataset entry dictionary
        """
        feedback_data = {
            'chain_id': chain_id,
            'user': feedback_proof.user,
            'feedback_id': feedback_proof.feedback_id,
            'quality_rating': feedback_proof.quality_rating,
            'timestamp': feedback_proof.timestamp,
            'signature': feedback_proof.signature
        }
        
        return {
            'id': feedback_proof.feedback_id,
            'timestamp': str(feedback_proof.timestamp),
            'session_id': session_id,
            'input': input_data,
            'output': output_data,
            'feedback': feedback_data,
            'provenance': {
                'source': 'feedback_oracle',
                'chain_id': chain_id,
                'signer': feedback_proof.user,
                'quality_rating': feedback_proof.quality_rating
            },
            'metadata': metadata or {}
        } 