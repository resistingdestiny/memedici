from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, Boolean, Text, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import json
import os
from prompts.system_prompts import get_comprehensive_system_prompt

Base = declarative_base()

class StudioDB(Base):
    __tablename__ = "studios"
    
    id = Column(String, primary_key=True)
    studio_name = Column(String, nullable=False)
    studio_description = Column(Text, default="A creative space for artistic expression")
    studio_theme = Column(String, default="abstract")
    art_style = Column(String, default="digital")
    studio_items = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to agents
    agents = relationship("AgentDB", back_populates="studio")

class CustomToolDB(Base):
    __tablename__ = "custom_tools"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="Custom API tool")
    category = Column(String, default="utility")
    api_config = Column(JSON, default={})
    usage_count = Column(Integer, default=0)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GeneratedArtworkDB(Base):
    __tablename__ = "generated_artworks"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, nullable=False)
    artwork_type = Column(String, nullable=False)  # "image" or "video"
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, default="")
    model_name = Column(String, nullable=False)
    model_type = Column(String, nullable=False)  # e.g., "realistic", "anime", "artistic"
    parameters = Column(JSON, default={})  # width, height, steps, etc.
    file_path = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    artwork_metadata = Column(JSON, default={})  # additional metadata (renamed from metadata)
    vlayer_proof_id = Column(String, nullable=True)  # vlayer content authenticity proof ID
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudioItem(BaseModel):
    """A comprehensive studio item with specifications."""
    name: str
    category: str  # e.g., "tool", "material", "equipment", "software"
    description: str
    specifications: Dict[str, Any] = {}
    rarity: str = "common"  # common, uncommon, rare, legendary
    condition: str = "excellent"  # poor, fair, good, excellent, pristine
    acquisition_date: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class Studio(BaseModel):
    """Configuration for a creative studio."""
    
    model_config = ConfigDict(protected_namespaces=())
    
    id: str = Field(description="Unique studio identifier")
    name: str = Field(description="Studio name")
    description: str = Field(default="A creative space for artistic expression", description="Studio description")
    theme: str = Field(default="abstract", description="Studio theme")
    art_style: str = Field(default="digital", description="Primary art style")
    studio_items: List[StudioItem] = Field(default=[], description="Comprehensive list of studio items")

class AgentDB(Base):
    __tablename__ = "agents"
    
    # Core Identity Fields
    id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    archetype = Column(String, nullable=False)
    core_traits = Column(JSON, default=[])
    origin_story = Column(Text, nullable=True)
    primary_mediums = Column(JSON, default=[])
    signature_motifs = Column(JSON, default=[])
    influences = Column(JSON, default=[])
    colour_palette = Column(JSON, default=[])
    prompt_formula = Column(Text, nullable=True)
    voice_style = Column(String, nullable=True)
    creation_rate = Column(Integer, default=4)
    collab_affinity = Column(JSON, default=[])
    
    # Studio Association
    studio_id = Column(String, ForeignKey('studios.id'), nullable=True)
    
    # Technical Configuration
    agent_type = Column(String, default="creative_artist")
    model_name = Column(String, default="gpt-3.5-turbo")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, nullable=True)
    tools_enabled = Column(JSON, default=[])
    custom_tools = Column(JSON, default=[])
    memory_enabled = Column(Boolean, default=True)
    structured_output = Column(Boolean, default=False)
    custom_instructions = Column(Text, nullable=True)
    
    # Dynamic Evolution
    interaction_count = Column(Integer, default=0)
    artworks_created = Column(Integer, default=0)
    artwork_ids = Column(JSON, default=[])  # List of artwork IDs created by this agent
    persona_evolution_history = Column(JSON, default=[])
    
    # Blockchain Integration
    blockchain_seed = Column(String, nullable=True)  # Random seed from blockchain
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to studio
    studio = relationship("StudioDB", back_populates="agents")

class AgentConfig(BaseModel):
    """Configuration for an artistic agent instance with comprehensive specifications."""
    
    model_config = ConfigDict(protected_namespaces=())
    
    # Core Identity Fields (New Comprehensive Spec)
    id: str = Field(description="Unique identifier (on-chain address or UUID)")
    display_name: str = Field(max_length=60, description="Human-readable name")
    avatar_url: Optional[str] = Field(None, description="Avatar image URL (supports ipfs://, http://, https://)")
    archetype: str = Field(description="Human-readable creator type phrase")
    core_traits: List[str] = Field(default=[], description="3-5 adjectives, lowercase, no symbols")
    origin_story: str = Field(description="Brief narrative, max 40 words")
    primary_mediums: List[str] = Field(default=[], description="Ranked array of creative mediums")
    signature_motifs: List[str] = Field(default=[], description="Recurring visual concepts")
    influences: List[str] = Field(default=[], description="Known artists, styles, movements")
    colour_palette: List[str] = Field(default=[], description="Hex codes and named colors")
    prompt_formula: Optional[str] = Field(None, description="Templated string for generation")
    voice_style: Optional[str] = Field(None, description="Tone/style description")
    creation_rate: int = Field(default=4, description="Times per day agent creates/publishes")
    collab_affinity: List[str] = Field(default=[], description="Collaboration tags/genres")
    
    # Studio Association
    studio_id: Optional[str] = Field(None, description="ID of the studio this agent belongs to")
    
    # Technical Configuration
    agent_type: str = "creative_artist"
    model_name: str = "gpt-4.1"
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    tools_enabled: List[str] = Field(
        default=["generate_image", "generate_video", "list_available_models"],
        description="List of tool names this agent can use. Tools are selected and assigned on agent creation. Available tools: generate_image, generate_video, list_available_models, and any custom tools."
    )
    custom_tools: List[Dict[str, Any]] = Field(
        default=[],
        description="Custom tool configurations specific to this agent. Each tool dict should contain 'name', 'description', and tool-specific config. These are specialized tools beyond the standard platform tools."
    )
    memory_enabled: bool = True
    structured_output: bool = False
    custom_instructions: Optional[str] = None
    
    # Dynamic Evolution
    interaction_count: int = 0
    artworks_created: int = 0
    artwork_ids: List[str] = []  # List of artwork IDs created by this agent
    persona_evolution_history: List[Dict[str, Any]] = []
    
    # Blockchain Integration
    blockchain_seed: Optional[int] = None  # Random seed from blockchain
    
    def get_system_prompt(self) -> str:
        """Get the comprehensive system prompt for this artistic agent configuration."""
        
        # Use comprehensive fields
        agent_name = self.display_name
        traits = ', '.join(self.core_traits)
        mediums = ', '.join(self.primary_mediums)
        agent_influences = ', '.join(self.influences)
        
        # Get studio information if studio_id is set
        studio_name = "Untitled Studio"
        studio_description = "A creative space for artistic expression"
        studio_theme = "abstract"
        art_style = "digital"
        studio_items = []
        
        if self.studio_id:
            # Try to get studio info from registry
            from agent_config import agent_registry
            studio = agent_registry.get_studio(self.studio_id)
            if studio:
                studio_name = studio.name
                studio_description = studio.description
                studio_theme = studio.theme
                art_style = studio.art_style
                studio_items = studio.studio_items
        
        # Comprehensive base system prompt
        base_prompt = get_comprehensive_system_prompt(
            agent_name=agent_name,
            archetype=self.archetype,
            origin_story=self.origin_story,
            traits=traits,
            voice_style=self.voice_style if self.voice_style else "Creative and expressive",
            mediums=mediums,
            signature_motifs=', '.join(self.signature_motifs) if self.signature_motifs else "Abstract forms, flowing lines",
            influences=agent_influences,
            colour_palette=', '.join(self.colour_palette) if self.colour_palette else "Vibrant and varied",
            collab_affinity=', '.join(self.collab_affinity) if self.collab_affinity else "Open to all creative styles",
            studio_name=studio_name,
            studio_description=studio_description,
            studio_theme=studio_theme,
            art_style=art_style,
            creation_rate=self.creation_rate,
            interaction_count=self.interaction_count,
            artworks_created=self.artworks_created,
            studio_items=studio_items,
            blockchain_seed=self.blockchain_seed
        )

        return base_prompt
    
    def evolve_persona(self, interaction_type: str, outcome: str):
        """Evolve the agent's persona based on interactions."""
        self.interaction_count += 1
        
        evolution_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "interaction_type": interaction_type,
            "outcome": outcome,
            "interaction_count": self.interaction_count
        }
        
        self.persona_evolution_history.append(evolution_entry)
        
        # Evolution logic
        if interaction_type == "artwork_creation":
            self.artworks_created += 1
            if self.artworks_created % 5 == 0:
                if "experienced" not in self.core_traits and "experienced" not in self.personality_traits:
                    if len(self.core_traits) < 5:
                        self.core_traits.append("experienced")
                    elif "experienced" not in self.personality_traits:
                        self.personality_traits.append("experienced")


class AgentRegistry:
    """Registry to manage different agent configurations with database persistence."""
    
    def __init__(self, db_url: str = None):
        # Use DATABASE_URL environment variable if available, otherwise default to SQLite
        if db_url is None:
            db_url = os.getenv('DATABASE_URL', 'sqlite:///agents.db')
        
        self.engine = create_engine(db_url)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.agents: Dict[str, AgentConfig] = {}
        self.studios: Dict[str, Studio] = {}
        self._load_studios_from_db()
        self._load_agents_from_db()
    
    def _load_studios_from_db(self):
        """Load studios from database."""
        session = self.SessionLocal()
        try:
            db_studios = session.query(StudioDB).all()
            for db_studio in db_studios:
                # Convert studio_items from JSON to StudioItem objects
                studio_items = []
                if db_studio.studio_items:
                    for item_data in db_studio.studio_items:
                        if isinstance(item_data, dict):
                            studio_items.append(StudioItem(**item_data))
                
                studio = Studio(
                    id=db_studio.id,
                    name=db_studio.studio_name,
                    description=db_studio.studio_description,
                    theme=db_studio.studio_theme,
                    art_style=db_studio.art_style,
                    studio_items=studio_items
                )
                self.studios[db_studio.id] = studio
        finally:
            session.close()
    
    def _load_agents_from_db(self):
        """Load agents from database."""
        session = self.SessionLocal()
        try:
            db_agents = session.query(AgentDB).all()
            for db_agent in db_agents:
                config = AgentConfig(
                    # Core Identity Fields
                    id=db_agent.id,
                    display_name=db_agent.display_name,
                    avatar_url=db_agent.avatar_url,
                    archetype=db_agent.archetype,
                    core_traits=db_agent.core_traits or [],
                    origin_story=db_agent.origin_story or "",
                    primary_mediums=db_agent.primary_mediums or [],
                    signature_motifs=db_agent.signature_motifs or [],
                    influences=db_agent.influences or [],
                    colour_palette=db_agent.colour_palette or [],
                    prompt_formula=db_agent.prompt_formula,
                    voice_style=db_agent.voice_style,
                    creation_rate=db_agent.creation_rate,
                    collab_affinity=db_agent.collab_affinity or [],
                    
                    # Studio Association
                    studio_id=db_agent.studio_id,
                    
                    # Technical Configuration
                    agent_type=db_agent.agent_type,
                    model_name=db_agent.model_name,
                    temperature=db_agent.temperature,
                    max_tokens=db_agent.max_tokens,
                    tools_enabled=db_agent.tools_enabled or [],
                    custom_tools=db_agent.custom_tools or [],
                    memory_enabled=db_agent.memory_enabled,
                    structured_output=db_agent.structured_output,
                    custom_instructions=db_agent.custom_instructions,
                    
                    # Evolution
                    interaction_count=db_agent.interaction_count,
                    artworks_created=db_agent.artworks_created,
                    artwork_ids=db_agent.artwork_ids or [],
                    persona_evolution_history=db_agent.persona_evolution_history or [],
                    
                    # Blockchain Integration
                    blockchain_seed=db_agent.blockchain_seed
                )
                self.agents[db_agent.id] = config
        finally:
            session.close()

    def get_agent_config(self, agent_id: str) -> AgentConfig:
        """Get agent configuration by ID."""
        return self.agents.get(agent_id, self._get_default_config())
    
    def _get_default_config(self) -> AgentConfig:
        """Get default artist config with all required fields."""
        return AgentConfig(
            id="default_agent",
            display_name="Creative Soul",
            archetype="Digital Artist",
            core_traits=["curious", "experimental", "intuitive"],
            origin_story="An emerging digital artist exploring the intersection of technology and creativity.",
            primary_mediums=["digital", "generative"],
            signature_motifs=["abstract forms", "flowing lines"],
            influences=["Van Gogh", "Basquiat"],
            colour_palette=["#FF6B6B", "#4ECDC4", "#45B7D1"]
        )
    
    def create_agent(self, agent_id: str, config: AgentConfig):
        """Create or update an agent configuration with database persistence."""
        self.agents[agent_id] = config
        self._save_agent_to_db(agent_id, config)
    
    def _save_agent_to_db(self, agent_id: str, config: AgentConfig):
        """Save agent configuration to database."""
        session = self.SessionLocal()
        try:
            db_agent = session.query(AgentDB).filter(AgentDB.id == agent_id).first()
            if db_agent:
                # Update existing agent with all new fields
                # Core Identity Fields
                db_agent.display_name = config.display_name
                db_agent.avatar_url = config.avatar_url
                db_agent.archetype = config.archetype
                db_agent.core_traits = config.core_traits
                db_agent.origin_story = config.origin_story
                db_agent.primary_mediums = config.primary_mediums
                db_agent.signature_motifs = config.signature_motifs
                db_agent.influences = config.influences
                db_agent.colour_palette = config.colour_palette
                db_agent.prompt_formula = config.prompt_formula
                db_agent.voice_style = config.voice_style
                db_agent.creation_rate = config.creation_rate
                db_agent.collab_affinity = config.collab_affinity
                
                # Studio Association
                db_agent.studio_id = config.studio_id
                
                # Technical Configuration
                db_agent.agent_type = config.agent_type
                db_agent.model_name = config.model_name
                db_agent.temperature = config.temperature
                db_agent.max_tokens = config.max_tokens
                db_agent.tools_enabled = config.tools_enabled
                db_agent.custom_tools = config.custom_tools
                db_agent.memory_enabled = config.memory_enabled
                db_agent.structured_output = config.structured_output
                db_agent.custom_instructions = config.custom_instructions
                
                # Evolution
                db_agent.interaction_count = config.interaction_count
                db_agent.artworks_created = config.artworks_created
                db_agent.artwork_ids = config.artwork_ids
                db_agent.persona_evolution_history = config.persona_evolution_history
                db_agent.updated_at = datetime.utcnow()
                
                # Blockchain Integration
                db_agent.blockchain_seed = config.blockchain_seed
            else:
                # Create new agent with all fields
                db_agent = AgentDB(
                    # Core Identity Fields
                    id=agent_id,
                    display_name=config.display_name,
                    avatar_url=config.avatar_url,
                    archetype=config.archetype,
                    core_traits=config.core_traits,
                    origin_story=config.origin_story,
                    primary_mediums=config.primary_mediums,
                    signature_motifs=config.signature_motifs,
                    influences=config.influences,
                    colour_palette=config.colour_palette,
                    prompt_formula=config.prompt_formula,
                    voice_style=config.voice_style,
                    creation_rate=config.creation_rate,
                    collab_affinity=config.collab_affinity,
                    
                    # Studio Association
                    studio_id=config.studio_id,
                    
                    # Technical Configuration
                    agent_type=config.agent_type,
                    model_name=config.model_name,
                    temperature=config.temperature,
                    max_tokens=config.max_tokens,
                    tools_enabled=config.tools_enabled,
                    custom_tools=config.custom_tools,
                    memory_enabled=config.memory_enabled,
                    structured_output=config.structured_output,
                    custom_instructions=config.custom_instructions,
                    
                    # Evolution
                    interaction_count=config.interaction_count,
                    artworks_created=config.artworks_created,
                    artwork_ids=config.artwork_ids,
                    persona_evolution_history=config.persona_evolution_history,
                    
                    # Blockchain Integration
                    blockchain_seed=config.blockchain_seed
                )
                
                # Blockchain Integration
                db_agent.blockchain_seed = config.blockchain_seed
                
                session.add(db_agent)
            session.commit()
        finally:
            session.close()
    
    def list_agents(self) -> List[str]:
        """List all available agent IDs."""
        return list(self.agents.keys())
    
    def reload_agents(self):
        """Reload agents from database to refresh in-memory cache."""
        self.agents.clear()
        self._load_agents_from_db()
        print(f"🔄 Reloaded {len(self.agents)} agents from database")
    
    def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent configuration from both memory and database."""
        session = self.SessionLocal()
        try:
            # Remove from database
            db_agent = session.query(AgentDB).filter(AgentDB.id == agent_id).first()
            if db_agent:
                session.delete(db_agent)
                session.commit()
                print(f"✅ Deleted agent from database: {agent_id}")
            else:
                print(f"⚠️  Agent not found in database: {agent_id}")
            
            # Remove from in-memory registry
            if agent_id in self.agents:
                del self.agents[agent_id]
                print(f"✅ Removed agent from memory: {agent_id}")
                return True
            else:
                print(f"⚠️  Agent not found in memory: {agent_id}")
                return False
                
        except Exception as e:
            print(f"❌ Error deleting agent {agent_id}: {e}")
            session.rollback()
            return False
        finally:
            session.close()
    
    def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """Get detailed information about an agent."""
        config = self.get_agent_config(agent_id)
        
        # Get studio information if agent has a studio assigned
        studio_info = {}
        if config.studio_id:
            studio = self.get_studio(config.studio_id)
            if studio:
                studio_info = {
                    "name": studio.name,
                    "description": studio.description,
                    "theme": studio.theme,
                    "art_style": studio.art_style,
                    "featured_items": [
                        {
                            "name": item.name,
                            "category": item.category,
                            "description": item.description,
                            "rarity": item.rarity
                        } for item in studio.studio_items[:5]
                    ]
                }
            else:
                studio_info = {
                    "name": f"Studio {config.studio_id} (Not Found)",
                    "description": "Studio configuration not found"
                }
        else:
            studio_info = {
                "name": "No Studio Assigned",
                "description": "Agent has no studio assignment"
            }
        
        return {
            "agent_id": agent_id,
            
            # Core Identity
            "identity": {
                "display_name": config.display_name,
                "avatar_url": config.avatar_url,
                "archetype": config.archetype,
                "core_traits": config.core_traits,
                "origin_story": config.origin_story,
                "voice_style": config.voice_style,
                "creation_rate": config.creation_rate
            },
            
            # Creative Specifications
            "creative_specs": {
                "primary_mediums": config.primary_mediums,
                "signature_motifs": config.signature_motifs,
                "influences": config.influences,
                "colour_palette": config.colour_palette,
                "collab_affinity": config.collab_affinity,
                "prompt_formula": config.prompt_formula
            },
            
            # Technical Configuration
            "technical": {
                "agent_type": config.agent_type,
                "model_name": config.model_name,
                "temperature": config.temperature,
                "tools_enabled": config.tools_enabled,
                "custom_tools": config.custom_tools,
                "memory_enabled": config.memory_enabled
            },
            
            # Studio Information
            "studio": studio_info,
            
            # Evolution & Stats
            "evolution": {
                "interaction_count": config.interaction_count,
                "artworks_created": config.artworks_created,
                "evolution_history": config.persona_evolution_history[-5:] if config.persona_evolution_history else [],
                "blockchain_seed": config.blockchain_seed
            },
            
            # System
            "system_prompt_preview": config.get_system_prompt()[:300] + "..." if len(config.get_system_prompt()) > 300 else config.get_system_prompt()
        }

    # Studio Management Methods
    def create_studio(self, studio_id: str, studio: Studio):
        """Create or update a studio configuration with database persistence."""
        self.studios[studio_id] = studio
        self._save_studio_to_db(studio_id, studio)
    
    def _save_studio_to_db(self, studio_id: str, studio: Studio):
        """Save studio configuration to database."""
        session = self.SessionLocal()
        try:
            # Convert StudioItem objects to dict for JSON storage
            studio_items_json = []
            for item in studio.studio_items:
                if isinstance(item, StudioItem):
                    studio_items_json.append(item.model_dump())
                elif isinstance(item, dict):
                    studio_items_json.append(item)
            
            db_studio = session.query(StudioDB).filter(StudioDB.id == studio_id).first()
            if db_studio:
                # Update existing studio
                db_studio.studio_name = studio.name
                db_studio.studio_description = studio.description
                db_studio.studio_theme = studio.theme
                db_studio.art_style = studio.art_style
                db_studio.studio_items = studio_items_json
                db_studio.updated_at = datetime.utcnow()
            else:
                # Create new studio
                db_studio = StudioDB(
                    id=studio_id,
                    studio_name=studio.name,
                    studio_description=studio.description,
                    studio_theme=studio.theme,
                    art_style=studio.art_style,
                    studio_items=studio_items_json
                )
                session.add(db_studio)
            session.commit()
        finally:
            session.close()
    
    def get_studio(self, studio_id: str) -> Optional[Studio]:
        """Get studio by ID."""
        return self.studios.get(studio_id)
    
    def list_studios(self) -> List[str]:
        """List all available studio IDs."""
        return list(self.studios.keys())
    
    def get_studio_info(self, studio_id: str) -> Dict[str, Any]:
        """Get detailed information about a studio."""
        studio = self.get_studio(studio_id)
        if not studio:
            return {}
        
        # Get agents assigned to this studio
        assigned_agents = [agent_id for agent_id, config in self.agents.items() if config.studio_id == studio_id]
        
        return {
            "studio_id": studio_id,
            "studio": {
                "name": studio.name,
                "description": studio.description,
                "theme": studio.theme,
                "art_style": studio.art_style,
                "items_count": len(studio.studio_items),
                "featured_items": [
                    {
                        "name": item.name,
                        "category": item.category,
                        "description": item.description,
                        "rarity": item.rarity
                    } for item in studio.studio_items[:5]
                ]
            },
            "assigned_agents": assigned_agents,
            "agent_count": len(assigned_agents)
        }

# Global agent registry instance
agent_registry = AgentRegistry(db_url=None)

# Global SessionLocal for external database access
SessionLocal = agent_registry.SessionLocal 