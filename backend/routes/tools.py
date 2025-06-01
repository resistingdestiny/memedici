from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import json
from datetime import datetime

from agent_tools import custom_tool_manager, get_available_tools

logger = logging.getLogger('ToolRoutes')

router = APIRouter(prefix="/tools", tags=["Tools"])

class CustomToolRequest(BaseModel):
    tool_name: str
    description: str
    api_endpoint: Optional[str] = None
    parameters: Dict[str, Any] = {}
    response_format: str = "json"

@router.get("")
async def list_available_tools():
    """List all available tools including custom tools."""
    standard_tools = get_available_tools()
    custom_tools = custom_tool_manager.custom_tools
    
    return {
        "standard_tools": [
            {
                "name": tool["name"],
                "description": tool["description"],
                "category": tool.get("category", "art_creation" if ("generate" in tool["name"] or "create" in tool["name"] or "artwork" in tool["name"]) else "analysis"),
                "parameters": tool.get("parameters", {}),
                "type": tool.get("type", "standard")
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

@router.post("")
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

@router.post("/upload")
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

@router.post("/{tool_id}/execute")
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

@router.post("/custom")
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