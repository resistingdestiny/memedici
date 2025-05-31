from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import logging
from dotenv import load_dotenv
import json
from datetime import datetime
import uvicorn

# Load environment variables from .env file
load_dotenv()

# Configure logging for the server
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('FastAPIServer')

from agent_system_langgraph import agent_manager
from agent_config import agent_registry, AgentConfig
from agent_tools import custom_tool_manager

app = FastAPI(title="Memedici", version="2.0.0")

# Serve static files (for our HTML test interface)
app.mount("/static", StaticFiles(directory="static"), name="static")


class ChatRequest(BaseModel):
    message: str
    agent_id: str = "ethereal_painter"
    thread_id: str = "default"


class ChatResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    agent_id: str
    thread_id: str
    tools_used: Optional[List[str]] = None
    persona_evolved: bool = False


class CreateAgentRequest(BaseModel):
    agent_id: str
    config: AgentConfig


class CustomToolRequest(BaseModel):
    tool_name: str
    description: str
    api_endpoint: Optional[str] = None
    parameters: Dict[str, Any] = {}
    response_format: str = "json"


class PersonaEvolutionRequest(BaseModel):
    agent_id: str
    interaction_type: str
    outcome: str


@app.get("/")
async def root():
    """Root endpoint with API information for Memedici."""
    return {
        "platform": "Memedici",
        "version": "2.0.0",
        "description": "An AI-powered platform for creating artistic agents with evolving personas and creative content generation",
    }


@app.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """Chat with a creative agent and potentially evolve their persona."""
    logger.info(f"🎨 Chat request: agent={request.agent_id}, thread={request.thread_id}")
    logger.info(f"🎨 Message: {request.message[:100]}{'...' if len(request.message) > 100 else ''}")
    
    try:
        result = agent_manager.chat_with_agent(
            agent_id=request.agent_id,
            message=request.message,
            thread_id=request.thread_id
        )
        
        # Check if persona should evolve based on interaction
        persona_evolved = False
        if result["success"] and result.get("tools_used"):
            # Evolve persona based on tool usage
            agent_config = agent_registry.get_agent_config(request.agent_id)
            
            # Check for standard art tools
            if "create_artwork" in result["tools_used"]:
                agent_config.evolve_persona("artwork_creation", "successful")
                agent_registry.create_agent(request.agent_id, agent_config)
                persona_evolved = True
            elif any(tool in result["tools_used"] for tool in ["analyze_art", "remix_concept"]):
                agent_config.evolve_persona("creative_analysis", "insightful")
                agent_registry.create_agent(request.agent_id, agent_config)
                persona_evolved = True
            
            # Check for custom tools (any tool not in standard tools)
            standard_tools = ["create_artwork", "analyze_art", "remix_concept", "blockchain_integration"]
            custom_tools_used = [tool for tool in result["tools_used"] if tool not in standard_tools]
            if custom_tools_used:
                agent_config.evolve_persona("custom_tool_usage", "creative_expansion")
                agent_registry.create_agent(request.agent_id, agent_config)
                persona_evolved = True
                logger.info(f"🎭 Persona evolved due to custom tool usage: {custom_tools_used}")
        
        if result["success"]:
            logger.info(f"✅ Chat successful for agent {request.agent_id}")
        else:
            logger.error(f"❌ Chat failed for agent {request.agent_id}: {result.get('error')}")
        
        # Add persona evolution info to response
        result["persona_evolved"] = persona_evolved
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"❌ Exception in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents")
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


@app.get("/agents/{agent_id}")
async def get_agent_info(agent_id: str):
    """Get detailed information about a specific creative agent."""
    try:
        info = agent_registry.get_agent_info(agent_id)
        return info
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")


@app.post("/agents")
async def create_agent(request: CreateAgentRequest):
    """Create or update a creative agent configuration."""
    try:
        agent_registry.create_agent(request.agent_id, request.config)
        return {
            "success": True,
            "message": f"Creative agent {request.agent_id} created/updated successfully",
            "agent_info": agent_registry.get_agent_info(request.agent_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/{agent_id}/evolve")
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


@app.get("/tools")
async def list_available_tools():
    """List all available tools including custom tools."""
    from agent_tools import get_available_tools
    
    standard_tools = get_available_tools()
    custom_tools = custom_tool_manager.custom_tools
    
    return {
        "standard_tools": [
            {
                "name": tool.name,
                "description": tool.description,
                "category": "art_creation" if "create" in tool.name or "artwork" in tool.name else "analysis"
            }
            for tool in standard_tools
        ],
        "custom_tools": [
            {
                "tool_id": tool_id,
                "name": tool_info["name"],
                "created_at": tool_info["created_at"],
                "usage_count": tool_info["usage_count"]
            }
            for tool_id, tool_info in custom_tools.items()
        ],
        "total_standard": len(standard_tools),
        "total_custom": len(custom_tools)
    }


@app.post("/tools")
async def create_custom_tool(request: CustomToolRequest):
    """Create a custom tool for agents to use."""
    try:
        tool_config = {
            "name": request.tool_name,
            "description": request.description,
            "category": getattr(request, 'category', 'utility'),
            "api_config": {
                "endpoint": request.api_endpoint,
                "method": getattr(request, 'method', 'POST'),
                "content_type": getattr(request, 'content_type', 'application/json'),
                "response_format": request.response_format,
                "auth": getattr(request, 'auth', {}),
                "request_schema": request.parameters,
                "response_example": getattr(request, 'response_example', 'API response')
            },
            "created_at": datetime.utcnow().isoformat(),
            "usage_count": 0,
            "status": "active"
        }
        
        result = custom_tool_manager.create_tool(request.tool_name, tool_config)
        
        return {
            "success": True,
            "message": f"Custom tool '{request.tool_name}' created successfully",
            "tool_info": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tools/upload")
async def upload_tool_spec(file: UploadFile = File(...)):
    """Upload an API specification file to create a custom tool."""
    try:
        # Read the uploaded file
        content = await file.read()
        
        # Parse based on file type
        if file.filename.endswith('.json'):
            spec_data = json.loads(content.decode('utf-8'))
        elif file.filename.endswith(('.yaml', '.yml')):
            import yaml
            spec_data = yaml.safe_load(content.decode('utf-8'))
        else:
            raise HTTPException(status_code=400, detail="File must be JSON or YAML")
        
        # Extract tool information from spec
        tool_name = spec_data.get('name', file.filename.split('.')[0])
        description = spec_data.get('description', 'Custom API tool')
        endpoint = spec_data.get('endpoint', spec_data.get('url', ''))
        method = spec_data.get('method', 'GET').upper()
        
        # Handle OpenAPI/Swagger specs
        if 'openapi' in spec_data or 'swagger' in spec_data:
            # Extract from OpenAPI spec
            servers = spec_data.get('servers', [])
            if servers:
                base_url = servers[0].get('url', '')
                paths = spec_data.get('paths', {})
                if paths:
                    first_path = list(paths.keys())[0]
                    endpoint = f"{base_url}{first_path}"
                    path_methods = paths[first_path]
                    method = list(path_methods.keys())[0].upper()
                    description = path_methods[method].get('summary', description)
        
        if not endpoint:
            raise HTTPException(status_code=400, detail="No endpoint found in specification")
        
        # Create tool configuration
        tool_config = {
            "name": tool_name,
            "description": description,
            "category": spec_data.get('category', 'utility'),
            "api_config": {
                "endpoint": endpoint,
                "method": method,
                "content_type": spec_data.get('content_type', 'application/json'),
                "response_format": spec_data.get('response_format', 'json'),
                "auth": spec_data.get('auth', {}),
                "request_schema": spec_data.get('parameters', {}),
                "response_example": spec_data.get('response_example', 'API response')
            },
            "created_at": datetime.utcnow().isoformat(),
            "usage_count": 0,
            "status": "active"
        }
        
        result = custom_tool_manager.create_tool(tool_name, tool_config)
        
        return {
            "success": True,
            "message": f"Custom tool '{tool_name}' created from uploaded specification",
            "tool_info": result,
            "spec_type": "openapi" if ('openapi' in spec_data or 'swagger' in spec_data) else "custom"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tools/{tool_id}/execute")
async def execute_custom_tool(tool_id: str, parameters: Dict[str, Any]):
    """Execute a custom tool with given parameters."""
    try:
        result = custom_tool_manager.execute_custom_tool(tool_id, parameters)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return {
            "success": True,
            "execution_result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/agents/{agent_id}/memory")
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


@app.get("/studios")
async def list_studios():
    """List all creative studios by theme and style."""
    agents = agent_registry.list_agents()
    studios = {}
    
    for agent_id in agents:
        info = agent_registry.get_agent_info(agent_id)
        studio = info.get("studio", {})
        theme = studio.get("theme", "unknown")
        
        if theme not in studios:
            studios[theme] = []
        
        studios[theme].append({
            "agent_id": agent_id,
            "studio_name": studio.get("name"),
            "description": studio.get("description"),
            "art_style": studio.get("art_style")
        })
    
    return {
        "studios_by_theme": studios,
        "total_themes": len(studios),
        "featured_studios": [
            studio for theme_studios in studios.values() 
            for studio in theme_studios[:1]  # One per theme
        ]
    }


@app.get("/test", response_class=HTMLResponse)
async def test_interface():
    """Serve the test HTML interface."""
    return FileResponse("static/test.html")


@app.post("/tools/custom")
async def create_custom_tool_v2(request: Dict[str, Any]):
    """Create a custom tool from manual entry or uploaded specification."""
    try:
        method = request.get('method', 'manual')
        
        if method == 'upload':
            # Handle uploaded specification
            spec_text = request.get('spec', '')
            if not spec_text:
                raise HTTPException(status_code=400, detail="No specification provided")
            
            try:
                spec_data = json.loads(spec_text)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in specification")
            
            # Extract tool information from spec
            tool_name = spec_data.get('name', 'uploaded_tool')
            description = spec_data.get('description', 'Custom API tool from uploaded spec')
            endpoint = spec_data.get('endpoint', '')
            method_http = spec_data.get('method', 'GET').upper()
            
            # Handle OpenAPI/Swagger specs
            if 'openapi' in spec_data or 'swagger' in spec_data:
                servers = spec_data.get('servers', [])
                if servers:
                    base_url = servers[0].get('url', '')
                    paths = spec_data.get('paths', {})
                    if paths:
                        first_path = list(paths.keys())[0]
                        endpoint = f"{base_url}{first_path}"
                        path_methods = paths[first_path]
                        method_http = list(path_methods.keys())[0].upper()
                        description = path_methods[method_http].get('summary', description)
            
            if not endpoint:
                raise HTTPException(status_code=400, detail="No endpoint found in specification")
            
            tool_config = {
                "name": tool_name,
                "description": description,
                "category": spec_data.get('category', 'utility'),
                "api_config": {
                    "endpoint": endpoint,
                    "method": method_http,
                    "content_type": spec_data.get('content_type', 'application/json'),
                    "response_format": spec_data.get('response_format', 'json'),
                    "auth": spec_data.get('auth', {}),
                    "request_schema": spec_data.get('parameters', {}),
                    "response_example": spec_data.get('response_example', 'API response')
                },
                "created_at": datetime.utcnow().isoformat(),
                "usage_count": 0,
                "status": "active"
            }
            
        else:
            # Handle manual entry
            tool_name = request.get('name', '')
            description = request.get('description', '')
            api_config = request.get('api_config', {})
            
            if not tool_name or not description:
                raise HTTPException(status_code=400, detail="Tool name and description are required")
            
            if not api_config.get('endpoint'):
                raise HTTPException(status_code=400, detail="API endpoint is required")
            
            tool_config = {
                "name": tool_name,
                "description": description,
                "category": request.get('category', 'utility'),
                "api_config": api_config,
                "created_at": datetime.utcnow().isoformat(),
                "usage_count": 0,
                "status": "active"
            }
        
        # Create the tool
        result = custom_tool_manager.create_tool(tool_config["name"], tool_config)
        
        return {
            "success": True,
            "message": f"Custom tool '{tool_config['name']}' created successfully",
            "tool": result
        }
        
    except Exception as e:
        logger.error(f"Error creating custom tool: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 