from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, Boolean, Text, DateTime, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
import os
from prompts.system_prompts import get_comprehensive_system_prompt

Base = declarative_base()

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    
    # Studio Fields (Preserved)
    studio_name = Column(String, default="Untitled Studio")
    studio_description = Column(Text, default="A creative space for artistic expression")
    studio_theme = Column(String, default="abstract")
    art_style = Column(String, default="digital")
    studio_items = Column(JSON, default=[])  # Comprehensive list of studio items with specs
    
    # Legacy Persona Fields (Kept for compatibility)
    persona_name = Column(String, default="Creative Soul")
    persona_background = Column(Text, default="An emerging digital artist exploring the intersection of technology and creativity")
    personality_traits = Column(JSON, default=[])
    artistic_influences = Column(JSON, default=[])
    preferred_mediums = Column(JSON, default=["digital", "generative"])
    
    # Dynamic Evolution
    interaction_count = Column(Integer, default=0)
    artworks_created = Column(Integer, default=0)
    artwork_ids = Column(JSON, default=[])  # List of artwork IDs created by this agent
    persona_evolution_history = Column(JSON, default=[])
    
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
    
    # Technical Configuration
    agent_type: str = "creative_artist"
    model_name: str = "gpt-3.5-turbo"
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
    
    # Studio Fields (Preserved and Enhanced)
    studio_name: str = "Untitled Studio"
    studio_description: str = "A creative space for artistic expression"
    studio_theme: str = "abstract"
    art_style: str = "digital"
    studio_items: List[StudioItem] = Field(default=[], description="Comprehensive list of studio items with specs")
    
    # Legacy Fields (Kept for compatibility)
    persona_name: str = "Creative Soul"
    persona_background: str = "An emerging digital artist exploring the intersection of technology and creativity"
    personality_traits: List[str] = ["curious", "experimental", "intuitive"]
    artistic_influences: List[str] = ["Van Gogh", "Basquiat", "AI-generated art"]
    preferred_mediums: List[str] = ["digital", "generative"]
    
    # Dynamic Evolution
    interaction_count: int = 0
    artworks_created: int = 0
    artwork_ids: List[str] = []  # List of artwork IDs created by this agent
    persona_evolution_history: List[Dict[str, Any]] = []
    
    def get_system_prompt(self) -> str:
        """Get the comprehensive system prompt for this artistic agent configuration."""
        
        # Use new comprehensive fields if available, fallback to legacy
        agent_name = self.display_name if hasattr(self, 'display_name') and self.display_name else self.persona_name
        traits = ', '.join(self.core_traits) if self.core_traits else ', '.join(self.personality_traits)
        mediums = ', '.join(self.primary_mediums) if self.primary_mediums else ', '.join(self.preferred_mediums)
        agent_influences = ', '.join(self.influences) if self.influences else ', '.join(self.artistic_influences)
        
        # Comprehensive base system prompt
        base_prompt = get_comprehensive_system_prompt(
            agent_name=agent_name,
            archetype=self.archetype,
            origin_story=self.origin_story if self.origin_story else self.persona_background,
            traits=traits,
            voice_style=self.voice_style if self.voice_style else "Creative and expressive",
            mediums=mediums,
            signature_motifs=', '.join(self.signature_motifs) if self.signature_motifs else "Abstract forms, flowing lines",
            influences=agent_influences,
            colour_palette=', '.join(self.colour_palette) if self.colour_palette else "Vibrant and varied",
            collab_affinity=', '.join(self.collab_affinity) if self.collab_affinity else "Open to all creative styles",
            studio_name=self.studio_name,
            studio_description=self.studio_description,
            studio_theme=self.studio_theme,
            art_style=self.art_style,
            creation_rate=self.creation_rate,
            interaction_count=self.interaction_count,
            artworks_created=self.artworks_created
        )

        # Add studio items information
        if self.studio_items:
            studio_info = "\n\nSTUDIO INVENTORY:"
            studio_info += f"\nYou have access to {len(self.studio_items)} specialized studio items:"
            for item in self.studio_items[:8]:  # Show first 8 items
                studio_info += f"\n• {item.name} ({item.category}, {item.rarity}): {item.description}"
            if len(self.studio_items) > 8:
                studio_info += f"\n• ... and {len(self.studio_items) - 8} more specialized items"
            studio_info += "\n\nUse these items creatively in your artistic process and mention them when relevant to your work."
            base_prompt += studio_info


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
    
    def __init__(self, db_url: str = "sqlite:///agents.db"):
        self.engine = create_engine(db_url)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.agents: Dict[str, AgentConfig] = {}
        self._load_agents_from_db()
    
    def _load_agents_from_db(self):
        """Load agents from database."""
        session = self.SessionLocal()
        try:
            db_agents = session.query(AgentDB).all()
            for db_agent in db_agents:
                # Convert studio_items from JSON to StudioItem objects
                studio_items = []
                if db_agent.studio_items:
                    for item_data in db_agent.studio_items:
                        if isinstance(item_data, dict):
                            studio_items.append(StudioItem(**item_data))
                
                config = AgentConfig(
                    # Core Identity Fields
                    id=db_agent.id,
                    display_name=getattr(db_agent, 'display_name', db_agent.persona_name),
                    avatar_url=getattr(db_agent, 'avatar_url', None),
                    archetype=getattr(db_agent, 'archetype', "Creative Artist"),
                    core_traits=getattr(db_agent, 'core_traits', []) or ["creative", "innovative", "expressive"],
                    origin_story=getattr(db_agent, 'origin_story', db_agent.persona_background)[:240],
                    primary_mediums=getattr(db_agent, 'primary_mediums', []) or db_agent.preferred_mediums or ["digital", "generative"],
                    signature_motifs=getattr(db_agent, 'signature_motifs', []) or ["abstract", "expressive"],
                    influences=getattr(db_agent, 'influences', []) or db_agent.artistic_influences or ["modern", "digital"],
                    colour_palette=getattr(db_agent, 'colour_palette', []) or ["#FF6B6B", "#4ECDC4", "#45B7D1"],
                    prompt_formula=getattr(db_agent, 'prompt_formula', None),
                    voice_style=getattr(db_agent, 'voice_style', None),
                    creation_rate=getattr(db_agent, 'creation_rate', 4),
                    collab_affinity=getattr(db_agent, 'collab_affinity', []) or ["creative", "artistic"],
                    
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
                    
                    # Studio Fields
                    studio_name=db_agent.studio_name,
                    studio_description=db_agent.studio_description,
                    studio_theme=db_agent.studio_theme,
                    art_style=db_agent.art_style,
                    studio_items=studio_items,
                    
                    # Legacy Fields
                    persona_name=db_agent.persona_name,
                    persona_background=db_agent.persona_background,
                    personality_traits=db_agent.personality_traits or [],
                    artistic_influences=db_agent.artistic_influences or [],
                    preferred_mediums=db_agent.preferred_mediums or [],
                    
                    # Evolution
                    interaction_count=db_agent.interaction_count,
                    artworks_created=db_agent.artworks_created,
                    artwork_ids=db_agent.artwork_ids or [],
                    persona_evolution_history=db_agent.persona_evolution_history or []
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
            # Convert StudioItem objects to dict for JSON storage
            studio_items_json = []
            for item in config.studio_items:
                if isinstance(item, StudioItem):
                    studio_items_json.append(item.model_dump())
                elif isinstance(item, dict):
                    studio_items_json.append(item)
            
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
                
                # Studio Fields
                db_agent.studio_name = config.studio_name
                db_agent.studio_description = config.studio_description
                db_agent.studio_theme = config.studio_theme
                db_agent.art_style = config.art_style
                db_agent.studio_items = studio_items_json
                
                # Legacy Fields
                db_agent.persona_name = config.persona_name
                db_agent.persona_background = config.persona_background
                db_agent.personality_traits = config.personality_traits
                db_agent.artistic_influences = config.artistic_influences
                db_agent.preferred_mediums = config.preferred_mediums
                
                # Evolution
                db_agent.interaction_count = config.interaction_count
                db_agent.artworks_created = config.artworks_created
                db_agent.artwork_ids = config.artwork_ids
                db_agent.persona_evolution_history = config.persona_evolution_history
                db_agent.updated_at = datetime.utcnow()
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
                    
                    # Studio Fields
                    studio_name=config.studio_name,
                    studio_description=config.studio_description,
                    studio_theme=config.studio_theme,
                    art_style=config.art_style,
                    studio_items=studio_items_json,
                    
                    # Legacy Fields
                    persona_name=config.persona_name,
                    persona_background=config.persona_background,
                    personality_traits=config.personality_traits,
                    artistic_influences=config.artistic_influences,
                    preferred_mediums=config.preferred_mediums,
                    
                    # Evolution
                    interaction_count=config.interaction_count,
                    artworks_created=config.artworks_created,
                    artwork_ids=config.artwork_ids,
                    persona_evolution_history=config.persona_evolution_history
                )
                session.add(db_agent)
            session.commit()
        finally:
            session.close()
    
    def list_agents(self) -> List[str]:
        """List all available agent IDs."""
        return list(self.agents.keys())
    
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
            "studio": {
                "name": config.studio_name,
                "description": config.studio_description,
                "theme": config.studio_theme,
                "art_style": config.art_style,
                "items_count": len(config.studio_items),
                "featured_items": [
                    {
                        "name": item.name,
                        "category": item.category,
                        "description": item.description,
                        "rarity": item.rarity
                    } for item in config.studio_items[:5]  # Show first 5 items
                ]
            },
            
            # Legacy Persona (for compatibility)
            "persona": {
                "name": config.persona_name,
                "background": config.persona_background,
                "personality_traits": config.personality_traits,
                "artistic_influences": config.artistic_influences,
                "preferred_mediums": config.preferred_mediums
            },
            
            # Evolution & Stats
            "evolution": {
                "interaction_count": config.interaction_count,
                "artworks_created": config.artworks_created,
                "evolution_history": config.persona_evolution_history[-5:] if config.persona_evolution_history else []
            },
            
            # System
            "system_prompt_preview": config.get_system_prompt()[:300] + "..." if len(config.get_system_prompt()) > 300 else config.get_system_prompt()
        }

# Global agent registry instance
agent_registry = AgentRegistry()

# Global SessionLocal for external database access
SessionLocal = agent_registry.SessionLocal 