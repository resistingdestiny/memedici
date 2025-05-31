#!/usr/bin/env python3
"""
Startup script to ensure crypto artist agents are loaded on server start.
"""
import json
import os
from pathlib import Path
from agent_config import AgentConfig, AgentRegistry, StudioItem

def ensure_crypto_artists_loaded():
    """Ensure the 5 crypto artist agents are loaded from examples on startup."""
    
    # Initialize agent registry
    agent_registry = AgentRegistry()
    
    # The 5 crypto artist agents that should exist
    expected_agents = {
        "d43b230c-c53f-453c-9701-fc4b1949d616": "GasMask",
        "0c99f977-c501-4071-9c52-fc69b3c9a9bd": "DaoVinci", 
        "f29b4777-69ee-45e4-916a-1f865f39bdb3": "NakamotoChild",
        "6ffd78de-950a-42ec-9b04-d97f7bacafbe": "REKTangel",
        "dcb3f66a-739a-4a6a-882a-c5e9bdb8bc6b": "Singuluna"
    }
    
    # Check if any agents are missing
    existing_agents = set(agent_registry.list_agents())
    missing_agents = set(expected_agents.keys()) - existing_agents
    
    if missing_agents:
        print(f"🔄 Loading {len(missing_agents)} missing crypto artist agents...")
        
        # Load from JSON file
        examples_dir = Path(__file__).parent / "examples"
        json_file = examples_dir / "memedici_crypto_artist_agents.json"
        
        if json_file.exists():
            with open(json_file, 'r') as f:
                agents_data = json.load(f)
            
            # Load missing agents
            for agent_data in agents_data:
                agent_id = agent_data['id']
                if agent_id in missing_agents:
                    # Convert studio_items
                    studio_items = []
                    for item_data in agent_data.get('studio_items', []):
                        studio_item = StudioItem(
                            name=item_data.get('name'),
                            category=item_data.get('category'),
                            description=item_data.get('description'),
                            specifications=item_data.get('specifications', {}),
                            rarity=item_data.get('rarity', 'common'),
                            condition=item_data.get('condition', 'excellent'),
                            acquisition_date=item_data.get('acquisition_date'),
                            cost=item_data.get('cost'),
                            notes=item_data.get('notes')
                        )
                        studio_items.append(studio_item)
                    
                    # Create agent config
                    agent_config = AgentConfig(
                        # Core Identity Fields
                        id=agent_data['id'],
                        display_name=agent_data['display_name'],
                        avatar_url=agent_data.get('avatar_url'),
                        archetype=agent_data['archetype'],
                        core_traits=agent_data['core_traits'],
                        origin_story=agent_data['origin_story'],
                        primary_mediums=agent_data['primary_mediums'],
                        signature_motifs=agent_data['signature_motifs'],
                        influences=agent_data['influences'],
                        colour_palette=agent_data['colour_palette'],
                        prompt_formula=agent_data.get('prompt_formula'),
                        voice_style=agent_data.get('voice_style'),
                        creation_rate=agent_data.get('creation_rate', 4),
                        collab_affinity=agent_data['collab_affinity'],
                        
                        # Technical Configuration
                        agent_type=agent_data.get('agent_type', 'creative_artist'),
                        model_name=agent_data.get('model_name', 'gpt-4'),
                        temperature=agent_data.get('temperature', 1.3),
                        max_tokens=agent_data.get('max_tokens'),
                        tools_enabled=agent_data.get('tools_enabled', []),
                        custom_tools=agent_data.get('custom_tools', []),
                        memory_enabled=agent_data.get('memory_enabled', True),
                        structured_output=agent_data.get('structured_output', False),
                        custom_instructions=agent_data.get('custom_instructions'),
                        
                        # Studio Fields
                        studio_name=agent_data.get('studio_name', 'Untitled Studio'),
                        studio_description=agent_data.get('studio_description', 'A creative space for artistic expression'),
                        studio_theme=agent_data.get('studio_theme', 'abstract'),
                        art_style=agent_data.get('art_style', 'digital'),
                        studio_items=studio_items,
                        
                        # Legacy Fields
                        persona_name=agent_data.get('persona_name', agent_data['display_name']),
                        persona_background=agent_data.get('persona_background', agent_data['origin_story']),
                        personality_traits=agent_data.get('personality_traits', agent_data['core_traits']),
                        artistic_influences=agent_data.get('artistic_influences', agent_data['influences']),
                        preferred_mediums=agent_data.get('preferred_mediums', agent_data['primary_mediums']),
                        
                        # Dynamic Evolution
                        interaction_count=agent_data.get('interaction_count', 0),
                        artworks_created=agent_data.get('artworks_created', 0),
                        artwork_ids=agent_data.get('artwork_ids', []),
                        persona_evolution_history=agent_data.get('persona_evolution_history', [])
                    )
                    
                    # Add to registry
                    agent_registry.create_agent(agent_id, agent_config)
                    print(f"✅ Loaded: {agent_data['display_name']}")
        else:
            print(f"⚠️  JSON file not found: {json_file}")
    else:
        print(f"✅ All {len(expected_agents)} crypto artist agents already loaded")
    
    # Final verification
    final_count = len(agent_registry.list_agents())
    print(f"🎨 Total agents in database: {final_count}")

if __name__ == "__main__":
    ensure_crypto_artists_loaded() 