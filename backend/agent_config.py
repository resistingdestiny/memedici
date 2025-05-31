from pydantic import BaseModel, ConfigDict
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, Boolean, Text, DateTime, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
import os
from prompts.system_prompts import get_system_prompt

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

class AgentDB(Base):
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True)
    agent_type = Column(String, default="creative_artist")
    model_name = Column(String, default="gpt-3.5-turbo")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, nullable=True)
    tools_enabled = Column(JSON, default=[])
    custom_tools = Column(JSON, default=[])
    memory_enabled = Column(Boolean, default=True)
    structured_output = Column(Boolean, default=False)
    custom_instructions = Column(Text, nullable=True)
    
    # Art & Creativity Fields
    studio_name = Column(String, default="Untitled Studio")
    studio_description = Column(Text, default="A creative space for artistic expression")
    studio_theme = Column(String, default="abstract")
    art_style = Column(String, default="digital")
    
    # Persona Fields
    persona_name = Column(String, default="Creative Soul")
    persona_background = Column(Text, default="An emerging digital artist exploring the intersection of technology and creativity")
    personality_traits = Column(JSON, default=[])
    artistic_influences = Column(JSON, default=[])
    preferred_mediums = Column(JSON, default=["digital", "generative"])
    
    # Dynamic Evolution
    interaction_count = Column(Integer, default=0)
    artworks_created = Column(Integer, default=0)
    persona_evolution_history = Column(JSON, default=[])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AgentConfig(BaseModel):
    """Configuration for an artistic agent instance."""
    
    model_config = ConfigDict(protected_namespaces=())
    
    agent_type: str = "creative_artist"
    model_name: str = "gpt-3.5-turbo"
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    tools_enabled: List[str] = ["create_artwork", "analyze_art", "remix_concept"]
    custom_tools: List[Dict[str, Any]] = []
    memory_enabled: bool = True
    structured_output: bool = False
    custom_instructions: Optional[str] = None
    
    # Art & Creativity Fields
    studio_name: str = "Untitled Studio"
    studio_description: str = "A creative space for artistic expression"
    studio_theme: str = "abstract"
    art_style: str = "digital"
    
    # Persona Fields
    persona_name: str = "Creative Soul"
    persona_background: str = "An emerging digital artist exploring the intersection of technology and creativity"
    personality_traits: List[str] = ["curious", "experimental", "intuitive"]
    artistic_influences: List[str] = ["Van Gogh", "Basquiat", "AI-generated art"]
    preferred_mediums: List[str] = ["digital", "generative"]
    
    # Dynamic Evolution
    interaction_count: int = 0
    artworks_created: int = 0
    persona_evolution_history: List[Dict[str, Any]] = []
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for this artistic agent configuration."""
        base_prompt = get_system_prompt(self.agent_type)
        
        artistic_context = f"""
STUDIO CONTEXT:
You operate from "{self.studio_name}" - {self.studio_description}
Studio Theme: {self.studio_theme}
Art Style: {self.art_style}

PERSONA:
You are {self.persona_name}, {self.persona_background}
Personality: {', '.join(self.personality_traits)}
Influences: {', '.join(self.artistic_influences)}
Preferred Mediums: {', '.join(self.preferred_mediums)}

EVOLUTION:
Interactions: {self.interaction_count} | Artworks Created: {self.artworks_created}
"""
        
        # Add custom tools information if available
        if self.custom_tools:
            tools_info = "\nCUSTOM TOOLS AVAILABLE:\n"
            for tool in self.custom_tools:
                tool_name = tool.get("name", "Unknown Tool")
                tool_desc = tool.get("description", "No description")
                tools_info += f"• {tool_name}: {tool_desc}\n"
            tools_info += "\nIMPORTANT: You have access to these custom tools! Use them when relevant to user requests. They are specifically designed for your unique capabilities."
            artistic_context += tools_info
        
        if self.custom_instructions:
            return f"{base_prompt}\n\n{artistic_context}\n\nAdditional instructions: {self.custom_instructions}"
        return f"{base_prompt}\n\n{artistic_context}"
    
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
        
        # Simple evolution logic - can be expanded
        if interaction_type == "artwork_creation":
            self.artworks_created += 1
            if self.artworks_created % 5 == 0:
                if "experienced" not in self.personality_traits:
                    self.personality_traits.append("experienced")


class AgentRegistry:
    """Registry to manage different agent configurations with database persistence."""
    
    def __init__(self, db_url: str = "sqlite:///agents.db"):
        self.engine = create_engine(db_url)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.agents: Dict[str, AgentConfig] = {}
        self._load_agents_from_db()
        self._setup_default_agents()
    
    def _load_agents_from_db(self):
        """Load agents from database."""
        session = self.SessionLocal()
        try:
            db_agents = session.query(AgentDB).all()
            for db_agent in db_agents:
                config = AgentConfig(
                    agent_type=db_agent.agent_type,
                    model_name=db_agent.model_name,
                    temperature=db_agent.temperature,
                    max_tokens=db_agent.max_tokens,
                    tools_enabled=db_agent.tools_enabled or [],
                    custom_tools=db_agent.custom_tools or [],
                    memory_enabled=db_agent.memory_enabled,
                    structured_output=db_agent.structured_output,
                    custom_instructions=db_agent.custom_instructions,
                    studio_name=db_agent.studio_name,
                    studio_description=db_agent.studio_description,
                    studio_theme=db_agent.studio_theme,
                    art_style=db_agent.art_style,
                    persona_name=db_agent.persona_name,
                    persona_background=db_agent.persona_background,
                    personality_traits=db_agent.personality_traits or [],
                    artistic_influences=db_agent.artistic_influences or [],
                    preferred_mediums=db_agent.preferred_mediums or [],
                    interaction_count=db_agent.interaction_count,
                    artworks_created=db_agent.artworks_created,
                    persona_evolution_history=db_agent.persona_evolution_history or []
                )
                self.agents[db_agent.id] = config
        finally:
            session.close()
    
    def _setup_default_agents(self):
        """Set up default artistic agent configurations."""
        if "ethereal_painter" not in self.agents:
            self.agents["ethereal_painter"] = AgentConfig(
                agent_type="ethereal_artist",
                studio_name="Ethereal Visions",
                studio_description="A mystical studio where digital dreams become reality",
                studio_theme="ethereal",
                art_style="surreal_digital",
                persona_name="Ethereal",
                persona_background="A visionary digital artist who channels cosmic energy into blockchain art",
                personality_traits=["mystical", "intuitive", "boundary-pushing"],
                artistic_influences=["Salvador Dalí", "Yves Klein", "CryptoPunks"],
                preferred_mediums=["NFT", "generative", "3D"]
            )
        
        if "crypto_sculptor" not in self.agents:
            self.agents["crypto_sculptor"] = AgentConfig(
                agent_type="blockchain_artist",
                studio_name="Decentralized Forms",
                studio_description="Where traditional sculpture meets blockchain innovation",
                studio_theme="futuristic",
                art_style="crypto_sculpture",
                persona_name="CryptoForge",
                persona_background="A pioneer in blockchain-based sculptural art, merging physical and digital realms",
                personality_traits=["innovative", "technical", "revolutionary"],
                artistic_influences=["Brâncuși", "Bitcoin Genesis Block", "Ethereum Logo"],
                preferred_mediums=["3D", "AR", "blockchain"]
            )
        
        if "generative_poet" not in self.agents:
            self.agents["generative_poet"] = AgentConfig(
                agent_type="algorithmic_poet",
                studio_name="Code & Verse",
                studio_description="Where algorithms birth poetry and verse becomes smart contracts",
                studio_theme="minimalist",
                art_style="text_art",
                persona_name="Versifier",
                persona_background="An AI poet who transforms code into verse and emotions into algorithms",
                personality_traits=["philosophical", "lyrical", "analytical"],
                artistic_influences=["Emily Dickinson", "Satoshi Nakamoto", "ChatGPT"],
                preferred_mediums=["text", "smart_contracts", "interactive"]
            )
    
    def get_agent_config(self, agent_id: str) -> AgentConfig:
        """Get agent configuration by ID."""
        return self.agents.get(agent_id, self._get_default_config())
    
    def _get_default_config(self) -> AgentConfig:
        """Get default artist config."""
        return AgentConfig()
    
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
                # Update existing
                db_agent.agent_type = config.agent_type
                db_agent.model_name = config.model_name
                db_agent.temperature = config.temperature
                db_agent.max_tokens = config.max_tokens
                db_agent.tools_enabled = config.tools_enabled
                db_agent.custom_tools = config.custom_tools
                db_agent.memory_enabled = config.memory_enabled
                db_agent.structured_output = config.structured_output
                db_agent.custom_instructions = config.custom_instructions
                db_agent.studio_name = config.studio_name
                db_agent.studio_description = config.studio_description
                db_agent.studio_theme = config.studio_theme
                db_agent.art_style = config.art_style
                db_agent.persona_name = config.persona_name
                db_agent.persona_background = config.persona_background
                db_agent.personality_traits = config.personality_traits
                db_agent.artistic_influences = config.artistic_influences
                db_agent.preferred_mediums = config.preferred_mediums
                db_agent.interaction_count = config.interaction_count
                db_agent.artworks_created = config.artworks_created
                db_agent.persona_evolution_history = config.persona_evolution_history
                db_agent.updated_at = datetime.utcnow()
            else:
                # Create new
                db_agent = AgentDB(
                    id=agent_id,
                    agent_type=config.agent_type,
                    model_name=config.model_name,
                    temperature=config.temperature,
                    max_tokens=config.max_tokens,
                    tools_enabled=config.tools_enabled,
                    custom_tools=config.custom_tools,
                    memory_enabled=config.memory_enabled,
                    structured_output=config.structured_output,
                    custom_instructions=config.custom_instructions,
                    studio_name=config.studio_name,
                    studio_description=config.studio_description,
                    studio_theme=config.studio_theme,
                    art_style=config.art_style,
                    persona_name=config.persona_name,
                    persona_background=config.persona_background,
                    personality_traits=config.personality_traits,
                    artistic_influences=config.artistic_influences,
                    preferred_mediums=config.preferred_mediums,
                    interaction_count=config.interaction_count,
                    artworks_created=config.artworks_created,
                    persona_evolution_history=config.persona_evolution_history
                )
                session.add(db_agent)
            session.commit()
        finally:
            session.close()
    
    def list_agents(self) -> List[str]:
        """List all available agent IDs."""
        return list(self.agents.keys())
    
    def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """Get detailed information about an agent."""
        config = self.get_agent_config(agent_id)
        return {
            "agent_id": agent_id,
            "agent_type": config.agent_type,
            "model_name": config.model_name,
            "temperature": config.temperature,
            "tools_enabled": config.tools_enabled,
            "custom_tools": config.custom_tools,
            "memory_enabled": config.memory_enabled,
            "studio": {
                "name": config.studio_name,
                "description": config.studio_description,
                "theme": config.studio_theme,
                "art_style": config.art_style
            },
            "persona": {
                "name": config.persona_name,
                "background": config.persona_background,
                "personality_traits": config.personality_traits,
                "artistic_influences": config.artistic_influences,
                "preferred_mediums": config.preferred_mediums
            },
            "evolution": {
                "interaction_count": config.interaction_count,
                "artworks_created": config.artworks_created,
                "evolution_history": config.persona_evolution_history[-5:] if config.persona_evolution_history else []
            },
            "system_prompt": config.get_system_prompt()[:200] + "..." if len(config.get_system_prompt()) > 200 else config.get_system_prompt()
        }

# Global agent registry instance
agent_registry = AgentRegistry() 