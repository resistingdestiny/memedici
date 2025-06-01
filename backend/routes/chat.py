from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from agent_system_langgraph import agent_manager
from agent_config import agent_registry
from decentralized_dataset import dataset_manager

logger = logging.getLogger('ChatRoutes')

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    agent_id: str = "ethereal_painter"
    thread_id: str = "default"

class ChatResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    assets: Dict[str, Any] = Field(default_factory=dict, description="Dictionary of created assets keyed by asset ID")
    error: Optional[str] = None
    agent_id: str
    thread_id: str
    tools_used: Optional[List[str]] = None
    artworks_created: int = 0
    persona_evolved: bool = False
    dataset_entry_id: Optional[str] = Field(None, description="ID for submitting feedback to decentralized dataset")

@router.post("", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """Chat with a creative agent and potentially evolve their persona."""
    logger.info(f"🎨 Chat request: agent={request.agent_id}, thread={request.thread_id}")
    logger.info(f"🎨 Message: {request.message[:100]}{'...' if len(request.message) > 100 else ''}")
    
    try:
        # Record start time for performance tracking
        start_time = datetime.utcnow()
        
        result = agent_manager.chat_with_agent(
            agent_id=request.agent_id,
            message=request.message,
            thread_id=request.thread_id
        )
        
        # Calculate generation time
        end_time = datetime.utcnow()
        generation_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # result should now be an AgentResponse object
        if isinstance(result, dict) and hasattr(result, 'message'):
            # Handle AgentResponse object
            response_message = result.message
            assets = result.assets
            tools_used = []  # We'll need to extract this from somewhere else if needed
            artworks_created = len(assets)
        elif hasattr(result, 'message'):
            # Handle AgentResponse object
            response_message = result.message
            assets = result.assets
            tools_used = []  # We'll need to extract this from somewhere else if needed
            artworks_created = len(assets)
        else:
            # Fallback for unexpected format
            response_message = str(result)
            assets = {}
            tools_used = []
            artworks_created = 0
        
        # Check if persona should evolve based on interaction
        persona_evolved = False
        if tools_used:
            # Evolve persona based on tool usage
            agent_config = agent_registry.get_agent_config(request.agent_id)
            
            # Check for standard art tools
            if "create_artwork" in tools_used:
                agent_config.evolve_persona("artwork_creation", "successful")
                agent_registry.create_agent(request.agent_id, agent_config)
                persona_evolved = True
            elif any(tool in tools_used for tool in ["analyze_art", "remix_concept"]):
                agent_config.evolve_persona("creative_analysis", "insightful")
                agent_registry.create_agent(request.agent_id, agent_config)
                persona_evolved = True
            
            # Check for custom tools (any tool not in standard tools)
            standard_tools = ["create_artwork", "analyze_art", "remix_concept", "blockchain_integration"]
            custom_tools_used = [tool for tool in tools_used if tool not in standard_tools]
            if custom_tools_used:
                agent_config.evolve_persona("custom_tool_usage", "creative_expansion")
                agent_registry.create_agent(request.agent_id, agent_config)
                persona_evolved = True
                logger.info(f"🎭 Persona evolved due to custom tool usage: {custom_tools_used}")
        
        # 🚀 CAPTURE FOR DECENTRALIZED DATASET
        dataset_entry_id = None
        try:
            # Get agent info for dataset entry
            agent_info = agent_registry.get_agent_info(request.agent_id)
            agent_name = agent_info.get("name", "Unknown Agent")
            
            # Serialize assets to ensure JSON compatibility
            serialized_assets = {}
            if isinstance(assets, dict):
                for asset_id, asset_info in assets.items():
                    if hasattr(asset_info, 'model_dump'):
                        # It's a Pydantic model (AssetInfo)
                        serialized_assets[asset_id] = asset_info.model_dump()
                    elif isinstance(asset_info, dict):
                        # It's already a dict
                        serialized_assets[asset_id] = asset_info
                    else:
                        # Convert to dict if possible
                        try:
                            serialized_assets[asset_id] = asset_info.__dict__ if hasattr(asset_info, '__dict__') else asset_info
                        except:
                            # Fallback: convert to string
                            serialized_assets[asset_id] = str(asset_info)
            
            # Create dataset entry for this interaction
            dataset_entry = dataset_manager.create_dataset_entry(
                prompt=request.message,
                agent_id=request.agent_id,
                agent_name=agent_name,
                response_data={
                    "response": response_message,
                    "assets": serialized_assets,  # Use serialized assets
                    "success": True,
                    "tools_used": tools_used,
                    "artworks_created": artworks_created,
                    "persona_evolved": persona_evolved
                },
                session_id=request.thread_id,
                model_parameters={
                    "agent_type": agent_info.get("persona", {}).get("archetype", ""),
                    "style_influences": agent_info.get("persona", {}).get("style_influences", []),
                    "studio_theme": agent_info.get("studio", {}).get("theme", "")
                },
                generation_time_ms=generation_time_ms
            )
            
            dataset_entry_id = dataset_entry.id
            logger.info(f"💾 Dataset entry created: {dataset_entry_id} (will upload after 2 minutes or on feedback)")
            
        except Exception as dataset_e:
            logger.warning(f"⚠️  Dataset capture failed (continuing): {dataset_e}")
        
        logger.info(f"✅ Chat successful for agent {request.agent_id}")
        
        # Ensure assets are serialized for the response as well
        response_assets = {}
        if isinstance(assets, dict):
            for asset_id, asset_info in assets.items():
                if hasattr(asset_info, 'model_dump'):
                    # It's a Pydantic model (AssetInfo)
                    response_assets[asset_id] = asset_info.model_dump()
                elif isinstance(asset_info, dict):
                    # It's already a dict
                    response_assets[asset_id] = asset_info
                else:
                    # Convert to dict if possible
                    try:
                        response_assets[asset_id] = asset_info.__dict__ if hasattr(asset_info, '__dict__') else asset_info
                    except:
                        # Fallback: convert to string
                        response_assets[asset_id] = str(asset_info)
            
        return ChatResponse(
            success=True,
            response=response_message,
            assets=response_assets,  # Use serialized assets
            agent_id=request.agent_id,
            thread_id=request.thread_id,
            tools_used=tools_used,
            artworks_created=artworks_created,
            persona_evolved=persona_evolved,
            dataset_entry_id=dataset_entry_id
        )
    except Exception as e:
        logger.error(f"❌ Exception in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}/memory")
async def reset_agent_memory(agent_id: str, thread_id: str = "default"):
    """Reset memory for a specific agent thread."""
    try:
        agent_manager.reset_agent_memory(agent_id, thread_id)
        return {
            "success": True,
            "message": f"Memory reset for agent {agent_id}, thread {thread_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 