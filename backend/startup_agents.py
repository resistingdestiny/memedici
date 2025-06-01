#!/usr/bin/env python3
"""
Startup script to ensure crypto artist agents and studios are loaded into the database.
"""
import json
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime
from agent_config import agent_registry, AgentConfig, Studio, StudioItem, GeneratedArtworkDB, SessionLocal

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
                persona_evolution_history=agent_data.get("persona_evolution_history", []),
                
                # Blockchain Integration
                blockchain_seed=agent_data.get("blockchain_seed")
            )
            
            # Include initial artworks data for database population
            initial_artworks = agent_data.get("initial_artworks", [])
            agents.append((agent_data["id"], config, initial_artworks))
        
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
        
        # Then, load and create all agents with their artworks
        agents = load_agents_from_file()
        agents_created = 0
        total_artworks_created = 0
        
        for agent_id, config, initial_artworks in agents:
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
                    # Always update existing agents with latest config from JSON file
                    agent_registry.create_agent(agent_id, config)
                    studio_name = "No Studio"
                    if config.studio_id:
                        studio = agent_registry.get_studio(config.studio_id)
                        studio_name = studio.name if studio else f"Studio {config.studio_id}"
                    logger.info(f"🔄 Updated agent: {config.display_name} ({agent_id}) -> {studio_name}")
                
                # Create artwork records for this agent
                if initial_artworks:
                    logger.info(f"🎨 Processing {len(initial_artworks)} initial artworks for {config.display_name}...")
                    artwork_count = create_artwork_records(agent_id, initial_artworks)
                    total_artworks_created += artwork_count
                    
                    # Update agent's artwork IDs list
                    if artwork_count > 0:
                        artwork_ids = []
                        for artwork_data in initial_artworks:
                            filename = artwork_data.get("filename", "")
                            if filename:
                                artwork_id = filename.replace("artwork_", "").replace(".png", "").replace(".mp4", "")
                                if len(artwork_id) >= 8:
                                    artwork_ids.append(artwork_id)
                        
                        if artwork_ids:
                            config.artwork_ids = artwork_ids
                            agent_registry.create_agent(agent_id, config)
                            logger.info(f"🔗 Updated agent {agent_id} with {len(artwork_ids)} artwork IDs")
                    
            except Exception as e:
                logger.error(f"❌ Error creating agent {agent_id}: {e}")
        
        logger.info(f"🎭 Agent loading complete: {agents_created} new agents created")
        logger.info(f"🖼️  Artwork loading complete: {total_artworks_created} artwork records created")
        
        # Summary
        total_studios = len(agent_registry.list_studios())
        total_agents = len(agent_registry.list_agents())
        
        # Count total artworks in database
        session = SessionLocal()
        try:
            total_artworks_db = session.query(GeneratedArtworkDB).count()
        finally:
            session.close()
        
        logger.info("=" * 60)
        logger.info(f"🎉 Startup sequence complete!")
        logger.info(f"🎨 Total studios in database: {total_studios}")
        logger.info(f"🎭 Total agents in database: {total_agents}")
        logger.info(f"🖼️  Total artworks in database: {total_artworks_db}")
        
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

def generate_full_url(filename: str, base_url: str = "https://memedici-backend.onrender.com") -> str:
    """Generate a full URL for a static file."""
    return f"{base_url}/static/artworks/{filename}"

def create_artwork_records(agent_id: str, initial_artworks: list):
    """Create database records for initial artworks."""
    if not initial_artworks:
        return 0
    
    session = SessionLocal()
    created_count = 0
    
    try:
        # Get base directory for file path validation
        static_dir = Path(__file__).parent / "static" / "artworks"
        
        for artwork_data in initial_artworks:
            filename = artwork_data.get("filename")
            prompt = artwork_data.get("prompt", "")
            created_at_str = artwork_data.get("created_at")
            
            if not filename or not prompt:
                logger.warning(f"⚠️  Skipping invalid artwork data: {artwork_data}")
                continue
            
            # Generate artwork ID from filename
            artwork_id = filename.replace("artwork_", "").replace(".png", "").replace(".mp4", "")
            if len(artwork_id) < 8:
                artwork_id = str(uuid.uuid4())[:8]
            
            # Check if artwork already exists
            existing = session.query(GeneratedArtworkDB).filter(GeneratedArtworkDB.id == artwork_id).first()
            if existing:
                logger.info(f"📍 Artwork already exists: {filename}")
                continue
            
            # Validate file exists
            file_path = static_dir / filename
            if not file_path.exists():
                logger.warning(f"⚠️  File not found: {file_path}")
                continue
            
            # Determine artwork type
            artwork_type = "video" if filename.endswith(".mp4") else "image"
            
            # Get file size
            file_size = file_path.stat().st_size
            
            # Generate file URL
            file_url = generate_full_url(filename)
            
            # Parse created_at timestamp
            try:
                created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
            except:
                # Fallback to parsing from filename timestamp
                try:
                    timestamp_part = filename.split('_')[1] + "_" + filename.split('_')[2]
                    created_at = datetime.strptime(timestamp_part, "%Y%m%d_%H%M%S")
                except:
                    created_at = datetime.utcnow()
            
            # Determine model info based on agent and artwork type
            model_name = "historical_model"
            model_type = "historical"
            
            # Create artwork record
            db_artwork = GeneratedArtworkDB(
                id=artwork_id,
                agent_id=agent_id,
                artwork_type=artwork_type,
                prompt=prompt,
                negative_prompt="",
                model_name=model_name,
                model_type=model_type,
                parameters={
                    "historical_import": True,
                    "original_filename": filename
                },
                file_path=str(file_path.relative_to(Path(__file__).parent)),
                file_url=file_url,
                file_size=file_size,
                artwork_metadata={
                    "imported_from_startup": True,
                    "original_created_at": created_at_str,
                    "import_timestamp": datetime.utcnow().isoformat()
                },
                created_at=created_at
            )
            
            session.add(db_artwork)
            created_count += 1
            logger.info(f"✅ Created artwork record: {filename} -> {artwork_id}")
        
        session.commit()
        logger.info(f"💾 Created {created_count} artwork records for agent {agent_id}")
        return created_count
        
    except Exception as e:
        logger.error(f"❌ Error creating artwork records for agent {agent_id}: {e}")
        session.rollback()
        return 0
    finally:
        session.close()

if __name__ == "__main__":
    ensure_crypto_artists_loaded() 