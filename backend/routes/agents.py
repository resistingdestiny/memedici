from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import os
import uuid
from pathlib import Path

from agent_config import agent_registry, AgentConfig

logger = logging.getLogger('AgentRoutes')

router = APIRouter(prefix="/agents", tags=["Agents"])

class CreateAgentRequest(BaseModel):
    agent_id: str
    config: AgentConfig

class PersonaEvolutionRequest(BaseModel):
    agent_id: str
    interaction_type: str
    outcome: str

class AssignAgentToStudioRequest(BaseModel):
    agent_id: str
    studio_id: str

def save_avatar_image(image_file: UploadFile, agent_id: str) -> str:
    """Save uploaded avatar image and return the local path."""
    # Ensure static avatars directory exists
    static_dir = Path("static/avatars")
    static_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(image_file.filename).suffix if image_file.filename else '.jpg'
    filename = f"{agent_id}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = static_dir / filename
    
    # Save the uploaded file
    with open(file_path, "wb") as buffer:
        buffer.write(image_file.file.read())
    
    # Return the relative path for storage
    return str(file_path)

def get_avatar_url(file_path: str, base_url: str = os.getenv("BASE_URL")) -> str:
    """Generate a full URL for an avatar file."""
    if file_path.startswith('http'):
        return file_path  # Already a full URL
    return f"{base_url}/{file_path}"

@router.get("")
async def list_agents():
    """List all available creative agents with their studio and persona information."""
    agents = agent_registry.list_agents()
    agent_info = []
    
    for agent_id in agents:
        info = agent_registry.get_agent_info(agent_id)
        agent_info.append(info)
    
    return {
        "platform": "Memedici",
        "agents": agent_info,
        "total": len(agents),
        "categories": {
            "ethereal": [a for a in agent_info if "ethereal" in a.get("studio", {}).get("theme", "")],
            "futuristic": [a for a in agent_info if "futuristic" in a.get("studio", {}).get("theme", "")],
            "minimalist": [a for a in agent_info if "minimalist" in a.get("studio", {}).get("theme", "")]
        }
    }

@router.get("/{agent_id}")
async def get_agent_info(agent_id: str):
    """Get detailed information about a specific creative agent."""
    try:
        info = agent_registry.get_agent_info(agent_id)
        return info
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

@router.post("")
async def create_agent(request: CreateAgentRequest):
    """Create or update a creative agent configuration."""
    try:
        config = request.config
        
        # Require studio_id to be provided
        if not config.studio_id:
            raise HTTPException(
                status_code=400, 
                detail="studio_id is required. Please provide a valid studio_id or create a studio first."
            )
        
        # Verify the studio exists
        studio = agent_registry.get_studio(config.studio_id)
        if not studio:
            raise HTTPException(
                status_code=400, 
                detail=f"Studio with ID '{config.studio_id}' does not exist. Please create the studio first or use an existing studio_id."
            )
        
        # Process avatar URL
        if config.avatar_url and not config.avatar_url.startswith('http'):
            if not config.avatar_url.startswith('static/'):
                config.avatar_url = f"static/avatars/{config.avatar_url}"
        
        # Create the agent with studio assignment
        agent_registry.create_agent(request.agent_id, config)
        
        return {
            "success": True,
            "message": f"Creative agent {request.agent_id} created/updated successfully",
            "agent_info": agent_registry.get_agent_info(request.agent_id)
        }
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def create_agent_with_upload(
    agent_data: str = Form(..., description="JSON string of agent configuration"),
    avatar_image: Optional[UploadFile] = File(None, description="Avatar image file")
):
    """Create a creative agent with optional avatar image upload."""
    try:
        import json
        
        # Parse the agent data from JSON string
        try:
            agent_dict = json.loads(agent_data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in agent_data")
        
        # Extract agent_id and config
        agent_id = agent_dict.get("agent_id")
        config_dict = agent_dict.get("config")
        
        if not agent_id or not config_dict:
            raise HTTPException(status_code=400, detail="agent_id and config are required")
        
        # Create AgentConfig object
        config = AgentConfig(**config_dict)
        
        # Require studio_id to be provided
        if not config.studio_id:
            raise HTTPException(
                status_code=400, 
                detail="studio_id is required. Please provide a valid studio_id or create a studio first."
            )
        
        # Verify the studio exists
        studio = agent_registry.get_studio(config.studio_id)
        if not studio:
            raise HTTPException(
                status_code=400, 
                detail=f"Studio with ID '{config.studio_id}' does not exist. Please create the studio first or use an existing studio_id."
            )
        
        # Handle avatar image upload
        if avatar_image and avatar_image.size > 0:
            # Validate file type
            allowed_types = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
            if avatar_image.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
                )
            
            # Validate file size (max 5MB)
            max_size = 5 * 1024 * 1024  # 5MB
            if avatar_image.size > max_size:
                raise HTTPException(status_code=400, detail="File size too large. Maximum 5MB allowed.")
            
            # Save the avatar image
            avatar_path = save_avatar_image(avatar_image, agent_id)
            config.avatar_url = avatar_path
            logger.info(f"💾 Avatar saved for agent {agent_id}: {avatar_path}")
        
        # Create the agent with studio assignment
        agent_registry.create_agent(agent_id, config)
        
        # Get agent info with full avatar URL
        agent_info = agent_registry.get_agent_info(agent_id)
        if config.avatar_url and not config.avatar_url.startswith('http'):
            # Add full URL for the avatar in response
            agent_info["identity"]["avatar_full_url"] = get_avatar_url(config.avatar_url)
        
        return {
            "success": True,
            "message": f"Creative agent {agent_id} created/updated successfully",
            "agent_info": agent_info,
            "avatar_uploaded": avatar_image is not None and avatar_image.size > 0
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"❌ Error creating agent with upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{agent_id}/evolve")
async def evolve_agent_persona(agent_id: str, request: PersonaEvolutionRequest):
    """Manually evolve an agent's persona based on specific interactions."""
    try:
        agent_config = agent_registry.get_agent_config(agent_id)
        agent_config.evolve_persona(request.interaction_type, request.outcome)
        agent_registry.create_agent(agent_id, agent_config)
        
        return {
            "success": True,
            "message": f"Agent {agent_id} persona evolved",
            "evolution": {
                "interaction_type": request.interaction_type,
                "outcome": request.outcome,
                "new_interaction_count": agent_config.interaction_count,
                "new_artworks_created": agent_config.artworks_created
            },
            "updated_info": agent_registry.get_agent_info(agent_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{agent_id}/assign-studio")
async def assign_agent_to_studio(agent_id: str, request: AssignAgentToStudioRequest):
    """Assign an agent to a studio."""
    try:
        # Verify studio exists
        studio = agent_registry.get_studio(request.studio_id)
        if not studio:
            raise HTTPException(status_code=404, detail=f"Studio {request.studio_id} not found")
        
        # Get agent and update studio assignment
        agent_config = agent_registry.get_agent_config(agent_id)
        agent_config.studio_id = request.studio_id
        agent_registry.create_agent(agent_id, agent_config)
        
        return {
            "success": True,
            "message": f"Agent {agent_id} assigned to studio {request.studio_id}",
            "agent_info": agent_registry.get_agent_info(agent_id),
            "studio_info": agent_registry.get_studio_info(request.studio_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 