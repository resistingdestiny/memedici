import json
import asyncio
import logging
from typing import Dict, Any, Optional
from web3 import Web3, HTTPProvider
from web3.contract import Contract
from web3.types import FilterParams, LogReceipt
import os
from agent_config import agent_registry, AgentConfig
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BlockchainEventListener:
    """Service to listen for blockchain events and sync agents to database."""
    
    def __init__(self):
        # Blockchain configuration
        self.rpc_url = os.getenv('WEB3_RPC_URL', 'http://localhost:8545')
        self.contract_address = os.getenv('LAUNCHPAD_CONTRACT_ADDRESS')
        self.private_key = os.getenv('PRIVATE_KEY')
        
        # Contract ABI for the events we need
        self.contract_abi = [
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "internalType": "uint256", "name": "agentId", "type": "uint256"},
                    {"indexed": True, "internalType": "address", "name": "creator", "type": "address"},
                    {"indexed": False, "internalType": "address", "name": "tokenAddress", "type": "address"},
                    {"indexed": False, "internalType": "string", "name": "agentName", "type": "string"},
                    {"indexed": False, "internalType": "uint256", "name": "fundingTarget", "type": "uint256"},
                    {"indexed": False, "internalType": "string", "name": "agentConfigJSON", "type": "string"}
                ],
                "name": "AgentCreated",
                "type": "event"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "internalType": "uint256", "name": "agentId", "type": "uint256"},
                    {"indexed": True, "internalType": "address", "name": "tokenAddress", "type": "address"},
                    {"indexed": True, "internalType": "address", "name": "lpPairAddress", "type": "address"},
                    {"indexed": False, "internalType": "uint256", "name": "liquidityAdded", "type": "uint256"},
                    {"indexed": False, "internalType": "uint256", "name": "seed", "type": "uint256"},
                    {"indexed": False, "internalType": "string", "name": "agentConfigJSON", "type": "string"}
                ],
                "name": "AgentBonded",
                "type": "event"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "internalType": "uint256", "name": "agentId", "type": "uint256"},
                    {"indexed": False, "internalType": "uint256", "name": "seed", "type": "uint256"}
                ],
                "name": "SeedGenerated",
                "type": "event"
            }
        ]
        
        # Initialize Web3
        self.w3 = None
        self.contract = None
        self.is_running = False
        
    async def initialize(self) -> bool:
        """Initialize Web3 connection and contract."""
        try:
            if not self.contract_address:
                logger.warning("⚠️ LAUNCHPAD_CONTRACT_ADDRESS not set, blockchain listening disabled")
                return False
                
            # Initialize Web3
            self.w3 = Web3(HTTPProvider(self.rpc_url))
            
            if not self.w3.is_connected():
                logger.error(f"❌ Failed to connect to blockchain at {self.rpc_url}")
                return False
                
            # Initialize contract
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(self.contract_address),
                abi=self.contract_abi
            )
            
            logger.info(f"✅ Connected to blockchain at {self.rpc_url}")
            logger.info(f"📋 Monitoring contract: {self.contract_address}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize blockchain connection: {e}")
            return False
    
    def parse_agent_config_json(self, config_json: str) -> Optional[Dict[str, Any]]:
        """Parse and validate agent configuration JSON."""
        try:
            config_data = json.loads(config_json)
            
            # Validate required fields
            required_fields = [
                'id', 'display_name', 'archetype', 'core_traits', 'origin_story',
                'primary_mediums', 'influences', 'colour_palette'
            ]
            
            for field in required_fields:
                if field not in config_data:
                    logger.warning(f"⚠️ Missing required field '{field}' in agent config")
                    return None
            
            return config_data
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse agent config JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Error validating agent config: {e}")
            return None
    
    def create_agent_from_blockchain_data(self, agent_id: str, config_data: Dict[str, Any], blockchain_seed: Optional[int] = None) -> bool:
        """Create agent in database from blockchain event data."""
        try:
            # Use blockchain agent ID as the database ID
            config_data['id'] = agent_id
            
            # Add blockchain seed if provided
            if blockchain_seed is not None:
                config_data['blockchain_seed'] = str(blockchain_seed)
            
            # Set default values for fields that might be missing
            defaults = {
                'agent_type': 'creative_artist',
                'model_name': 'gpt-3.5-turbo',
                'temperature': 0.7,
                'max_tokens': None,
                'tools_enabled': ['generate_image', 'generate_video', 'list_available_models'],
                'custom_tools': [],
                'memory_enabled': True,
                'structured_output': False,
                'custom_instructions': None,
                'interaction_count': 0,
                'artworks_created': 0,
                'artwork_ids': [],
                'persona_evolution_history': [],
                'studio_id': config_data.get('studio_id'),
                'voice_style': config_data.get('voice_style', 'Creative and expressive'),
                'creation_rate': config_data.get('creation_rate', 4),
                'signature_motifs': config_data.get('signature_motifs', []),
                'collab_affinity': config_data.get('collab_affinity', []),
                'prompt_formula': config_data.get('prompt_formula')
            }
            
            # Apply defaults for missing fields
            for key, default_value in defaults.items():
                if key not in config_data:
                    config_data[key] = default_value
            
            # Create AgentConfig object
            agent_config = AgentConfig(**config_data)
            
            # Check if agent already exists
            existing_agent = agent_registry.get_agent_config(agent_id)
            if existing_agent and existing_agent.id != "default_agent":
                logger.info(f"🔄 Updating existing agent: {agent_id}")
            else:
                logger.info(f"✨ Creating new agent: {agent_id}")
            
            # Save to database
            agent_registry.create_agent(agent_id, agent_config)
            
            logger.info(f"✅ Successfully synced agent {agent_id} from blockchain")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create agent {agent_id} from blockchain data: {e}")
            return False
    
    def handle_agent_created_event(self, event: LogReceipt) -> None:
        """Handle AgentCreated event."""
        try:
            args = event['args']
            agent_id = str(args['agentId'])
            creator = args['creator']
            token_address = args['tokenAddress']
            agent_name = args['agentName']
            funding_target = args['fundingTarget']
            config_json = args['agentConfigJSON']
            
            logger.info(f"🎉 AgentCreated event: ID={agent_id}, Name={agent_name}, Creator={creator}")
            
            # Parse configuration
            config_data = self.parse_agent_config_json(config_json)
            if not config_data:
                logger.error(f"❌ Failed to parse config for agent {agent_id}")
                return
            
            # Add blockchain-specific data
            config_data['token_address'] = token_address
            config_data['funding_target'] = funding_target
            config_data['creator_address'] = creator
            
            # Create agent in database
            self.create_agent_from_blockchain_data(agent_id, config_data)
            
        except Exception as e:
            logger.error(f"❌ Error handling AgentCreated event: {e}")
    
    def handle_agent_bonded_event(self, event: LogReceipt) -> None:
        """Handle AgentBonded event."""
        try:
            args = event['args']
            agent_id = str(args['agentId'])
            token_address = args['tokenAddress']
            lp_pair_address = args['lpPairAddress']
            liquidity_added = args['liquidityAdded']
            seed = args['seed']
            config_json = args['agentConfigJSON']
            
            logger.info(f"🚀 AgentBonded event: ID={agent_id}, Seed={seed}, LP={lp_pair_address}")
            
            # Parse configuration
            config_data = self.parse_agent_config_json(config_json)
            if not config_data:
                logger.error(f"❌ Failed to parse config for bonded agent {agent_id}")
                return
            
            # Add blockchain-specific data
            config_data['token_address'] = token_address
            config_data['lp_pair_address'] = lp_pair_address
            config_data['liquidity_added'] = liquidity_added
            config_data['is_bonded'] = True
            
            # Update agent with final seed
            self.create_agent_from_blockchain_data(agent_id, config_data, seed)
            
        except Exception as e:
            logger.error(f"❌ Error handling AgentBonded event: {e}")
    
    def handle_seed_generated_event(self, event: LogReceipt) -> None:
        """Handle SeedGenerated event."""
        try:
            args = event['args']
            agent_id = str(args['agentId'])
            seed = args['seed']
            
            logger.info(f"🎲 SeedGenerated event: ID={agent_id}, Seed={seed}")
            
            # Update existing agent with seed
            existing_agent = agent_registry.get_agent_config(agent_id)
            if existing_agent and existing_agent.id != "default_agent":
                existing_agent.blockchain_seed = str(seed)
                agent_registry.create_agent(agent_id, existing_agent)
                logger.info(f"✅ Updated agent {agent_id} with blockchain seed: {seed}")
            else:
                logger.warning(f"⚠️ Agent {agent_id} not found for seed update")
                
        except Exception as e:
            logger.error(f"❌ Error handling SeedGenerated event: {e}")
    
    async def listen_for_events(self, from_block: str = 'latest') -> None:
        """Listen for blockchain events and process them."""
        if not self.w3 or not self.contract:
            logger.error("❌ Blockchain not initialized")
            return
        
        logger.info(f"👂 Starting event listener from block: {from_block}")
        self.is_running = True
        
        # Create event filters
        try:
            agent_created_filter = self.contract.events.AgentCreated.create_filter(fromBlock=from_block)
            agent_bonded_filter = self.contract.events.AgentBonded.create_filter(fromBlock=from_block)
            seed_generated_filter = self.contract.events.SeedGenerated.create_filter(fromBlock=from_block)
            
            logger.info("✅ Event filters created successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to create event filters: {e}")
            return
        
        # Event processing loop
        while self.is_running:
            try:
                # Check for new AgentCreated events
                for event in agent_created_filter.get_new_entries():
                    self.handle_agent_created_event(event)
                
                # Check for new AgentBonded events
                for event in agent_bonded_filter.get_new_entries():
                    self.handle_agent_bonded_event(event)
                
                # Check for new SeedGenerated events
                for event in seed_generated_filter.get_new_entries():
                    self.handle_seed_generated_event(event)
                
                # Wait before next check
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"❌ Error in event listening loop: {e}")
                await asyncio.sleep(10)  # Wait longer on error
    
    def stop(self) -> None:
        """Stop the event listener."""
        logger.info("🛑 Stopping blockchain event listener")
        self.is_running = False
    
    async def sync_historical_events(self, from_block: int = 0) -> None:
        """Sync historical events from the blockchain."""
        if not self.w3 or not self.contract:
            logger.error("❌ Blockchain not initialized")
            return
        
        try:
            logger.info(f"🔄 Syncing historical events from block {from_block}")
            
            # Get historical AgentCreated events
            created_events = self.contract.events.AgentCreated.get_logs(fromBlock=from_block)
            logger.info(f"📋 Found {len(created_events)} AgentCreated events")
            
            for event in created_events:
                self.handle_agent_created_event(event)
            
            # Get historical AgentBonded events
            bonded_events = self.contract.events.AgentBonded.get_logs(fromBlock=from_block)
            logger.info(f"📋 Found {len(bonded_events)} AgentBonded events")
            
            for event in bonded_events:
                self.handle_agent_bonded_event(event)
            
            # Get historical SeedGenerated events
            seed_events = self.contract.events.SeedGenerated.get_logs(fromBlock=from_block)
            logger.info(f"📋 Found {len(seed_events)} SeedGenerated events")
            
            for event in seed_events:
                self.handle_seed_generated_event(event)
            
            logger.info("✅ Historical event sync completed")
            
        except Exception as e:
            logger.error(f"❌ Error syncing historical events: {e}")


# Global instance
blockchain_listener = BlockchainEventListener()

async def start_blockchain_listener():
    """Start the blockchain event listener service."""
    if await blockchain_listener.initialize():
        # Sync historical events first
        await blockchain_listener.sync_historical_events()
        
        # Start listening for new events
        await blockchain_listener.listen_for_events()
    else:
        logger.warning("⚠️ Blockchain listener not started - configuration missing")

if __name__ == "__main__":
    # Run the event listener
    asyncio.run(start_blockchain_listener()) 