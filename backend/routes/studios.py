from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

from agent_config import agent_registry, Studio

logger = logging.getLogger('StudioRoutes')

router = APIRouter(prefix="/studios", tags=["Studios"])

class CreateStudioRequest(BaseModel):
    studio_id: str
    studio: Studio

@router.get("")
async def list_studios():
    """List all available creative studios."""
    studios = agent_registry.list_studios()
    studio_info = []
    
    for studio_id in studios:
        info = agent_registry.get_studio_info(studio_id)
        studio_info.append(info)
    
    return {
        "platform": "Memedici",
        "studios": studio_info,
        "total": len(studios),
        "categories": {
            theme: [s for s in studio_info if s.get("studio", {}).get("theme") == theme]
            for theme in set(s.get("studio", {}).get("theme", "unknown") for s in studio_info)
        }
    }

@router.get("/{studio_id}")
async def get_studio_info(studio_id: str):
    """Get detailed information about a specific studio."""
    try:
        info = agent_registry.get_studio_info(studio_id)
        if not info:
            raise HTTPException(status_code=404, detail=f"Studio {studio_id} not found")
        return info
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Studio {studio_id} not found")

@router.post("")
async def create_studio(request: CreateStudioRequest):
    """Create or update a studio configuration."""
    try:
        agent_registry.create_studio(request.studio_id, request.studio)
        return {
            "success": True,
            "message": f"Studio {request.studio_id} created/updated successfully",
            "studio_info": agent_registry.get_studio_info(request.studio_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 