#!/usr/bin/env python3
"""
Startup script to ensure crypto artist agents and studios are loaded into the database.
"""
import json
import os
import logging
from pathlib import Path
from agent_config import agent_registry, AgentConfig, Studio, StudioItem

logger = logging.getLogger('StartupAgents')

def load_studios_from_file():
    """Load studios from the studios JSON file."""
    studios_file = Path(__file__).parent / "examples" / "memedici_studios.json"
    
    if not studios_file.exists():
        logger.warning(f"Studios file not found: {studios_file}")
        return []
    
    try:
        with open(studios_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        studios = []
        for studio_data in data.get("studios", []):
            # Convert studio_items to StudioItem objects
            studio_items = []
            for item_data in studio_data.get("studio_items", []):
                if isinstance(item_data, dict):
                    studio_items.append(StudioItem(**item_data))
            
            studio = Studio(
                id=studio_data["id"],
                name=studio_data["studio_name"],
                description=studio_data.get("studio_description", ""),
                theme=studio_data.get("studio_theme", "abstract"),
                art_style=studio_data.get("art_style", "digital"),
                studio_items=studio_items
            )
            studios.append((studio_data["id"], studio))
        
        logger.info(f"🎨 Loaded {len(studios)} studios from {studios_file}")
        return studios
    
    except Exception as e:
        logger.error(f"❌ Error loading studios from {studios_file}: {e}")
        return []

def load_agents_from_file():
    """Load agent configurations from the agents JSON file."""
    agents_file = Path(__file__).parent / "examples" / "memedici_crypto_artist_agents.json"
    
    if not agents_file.exists():
        logger.warning(f"Agents file not found: {agents_file}")
        return []
    
    try:
        with open(agents_file, 'r', encoding='utf-8') as f:
            agents_data = json.load(f)
        
        agents = []
        for agent_data in agents_data:
            # Convert studio_items to StudioItem objects (for legacy compatibility)
            studio_items = []
            for item_data in agent_data.get("studio_items", []):
                if isinstance(item_data, dict):
                    studio_items.append(StudioItem(**item_data))
            
            config = AgentConfig(
                # Core Identity Fields
                id=agent_data["id"],
                display_name=agent_data.get("display_name", agent_data.get("persona_name", "Unknown Agent")),
                avatar_url=agent_data.get("avatar_url"),
                archetype=agent_data.get("archetype", "Creative Artist"),
                core_traits=agent_data.get("core_traits", []),
                origin_story=agent_data.get("origin_story", ""),
                primary_mediums=agent_data.get("primary_mediums", []),
                signature_motifs=agent_data.get("signature_motifs", []),
                influences=agent_data.get("influences", []),
                colour_palette=agent_data.get("colour_palette", []),
                prompt_formula=agent_data.get("prompt_formula"),
                voice_style=agent_data.get("voice_style"),
                creation_rate=agent_data.get("creation_rate", 4),
                collab_affinity=agent_data.get("collab_affinity", []),
                
                # Studio Association
                studio_id=agent_data.get("studio_id"),
                
                # Technical Configuration
                agent_type=agent_data.get("agent_type", "creative_artist"),
                model_name=agent_data.get("model_name", "gpt-3.5-turbo"),
                temperature=agent_data.get("temperature", 0.7),
                max_tokens=agent_data.get("max_tokens"),
                tools_enabled=agent_data.get("tools_enabled", []),
                custom_tools=agent_data.get("custom_tools", []),
                memory_enabled=agent_data.get("memory_enabled", True),
                structured_output=agent_data.get("structured_output", False),
                custom_instructions=agent_data.get("custom_instructions"),
                
                # Legacy Studio Fields (for compatibility)
                studio_name=agent_data.get("studio_name", "Untitled Studio"),
                studio_description=agent_data.get("studio_description", "A creative space"),
                studio_theme=agent_data.get("studio_theme", "abstract"),
                art_style=agent_data.get("art_style", "digital"),
                studio_items=studio_items,
                
                # Legacy Persona Fields
                persona_name=agent_data.get("persona_name", agent_data.get("display_name", "Unknown")),
                persona_background=agent_data.get("persona_background", ""),
                personality_traits=agent_data.get("personality_traits", []),
                artistic_influences=agent_data.get("artistic_influences", []),
                preferred_mediums=agent_data.get("preferred_mediums", []),
                
                # Evolution
                interaction_count=agent_data.get("interaction_count", 0),
                artworks_created=agent_data.get("artworks_created", 0),
                artwork_ids=agent_data.get("artwork_ids", []),
                persona_evolution_history=agent_data.get("persona_evolution_history", [])
            )
            agents.append((agent_data["id"], config))
        
        logger.info(f"🎭 Loaded {len(agents)} agent configurations from {agents_file}")
        return agents
    
    except Exception as e:
        logger.error(f"❌ Error loading agents from {agents_file}: {e}")
        return []

def ensure_crypto_artists_loaded():
    """Ensure all crypto artist studios and agents are loaded into the database."""
    logger.info("🚀 Starting crypto artists and studios startup sequence...")
    
    try:
        # First, load and create all studios
        studios = load_studios_from_file()
        studios_created = 0
        
        for studio_id, studio in studios:
            try:
                # Check if studio already exists
                existing_studio = agent_registry.get_studio(studio_id)
                if existing_studio is None:
                    agent_registry.create_studio(studio_id, studio)
                    studios_created += 1
                    logger.info(f"✅ Created studio: {studio.name} ({studio_id})")
                else:
                    logger.info(f"📍 Studio already exists: {studio.name} ({studio_id})")
            except Exception as e:
                logger.error(f"❌ Error creating studio {studio_id}: {e}")
        
        logger.info(f"🎨 Studio loading complete: {studios_created} new studios created")
        
        # Then, load and create all agents
        agents = load_agents_from_file()
        agents_created = 0
        
        for agent_id, config in agents:
            try:
                # Check if agent already exists
                existing_config = agent_registry.get_agent_config(agent_id)
                if existing_config.id == "default_agent":  # Default means not found
                    agent_registry.create_agent(agent_id, config)
                    agents_created += 1
                    studio_name = "No Studio"
                    if config.studio_id:
                        studio = agent_registry.get_studio(config.studio_id)
                        studio_name = studio.name if studio else f"Studio {config.studio_id}"
                    logger.info(f"✅ Created agent: {config.display_name} ({agent_id}) -> {studio_name}")
                else:
                    # Update existing agent to ensure studio_id is set
                    if config.studio_id and not existing_config.studio_id:
                        existing_config.studio_id = config.studio_id
                        agent_registry.create_agent(agent_id, existing_config)
                        logger.info(f"🔄 Updated studio assignment for: {config.display_name} ({agent_id})")
                    else:
                        logger.info(f"📍 Agent already exists: {config.display_name} ({agent_id})")
            except Exception as e:
                logger.error(f"❌ Error creating agent {agent_id}: {e}")
        
        logger.info(f"🎭 Agent loading complete: {agents_created} new agents created")
        
        # Summary
        total_studios = len(agent_registry.list_studios())
        total_agents = len(agent_registry.list_agents())
        
        logger.info("=" * 60)
        logger.info(f"🎉 Startup sequence complete!")
        logger.info(f"🎨 Total studios in database: {total_studios}")
        logger.info(f"🎭 Total agents in database: {total_agents}")
        
        # Show studio assignments
        for studio_id in agent_registry.list_studios():
            studio_info = agent_registry.get_studio_info(studio_id)
            agent_count = studio_info.get("agent_count", 0)
            studio_name = studio_info.get("studio", {}).get("name", "Unknown Studio")
            if agent_count > 0:
                logger.info(f"🏛️  {studio_name}: {agent_count} agents assigned")
        
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Error in startup sequence: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    ensure_crypto_artists_loaded() 