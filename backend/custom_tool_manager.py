import requests
from typing import List, Dict, Any
import logging
import json
import hashlib
from datetime import datetime
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger('CustomToolManager')


class CustomToolManager:
    """Manager for user-created custom tools with database persistence."""
    
    def __init__(self, db_url: str = "sqlite:///agents.db"):
        self.custom_tools: Dict[str, Dict[str, Any]] = {}
        self.engine = create_engine(db_url)
        
        # Import and create tables
        from agent_config import Base
        Base.metadata.create_all(self.engine)
        
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self._load_tools_from_db()
    
    def _load_tools_from_db(self):
        """Load custom tools from database."""
        from agent_config import CustomToolDB
        
        session = self.SessionLocal()
        try:
            db_tools = session.query(CustomToolDB).all()
            for db_tool in db_tools:
                self.custom_tools[db_tool.id] = {
                    "name": db_tool.name,
                    "description": db_tool.description,
                    "category": db_tool.category,
                    "api_config": db_tool.api_config or {},
                    "created_at": db_tool.created_at.isoformat() if db_tool.created_at else datetime.utcnow().isoformat(),
                    "usage_count": db_tool.usage_count,
                    "status": db_tool.status
                }
            logger.info(f"🔧 Loaded {len(self.custom_tools)} custom tools from database")
            
            # Migrate from JSON file if database is empty but JSON file exists
            if len(self.custom_tools) == 0:
                self._migrate_from_json()
                
        except Exception as e:
            logger.error(f"❌ Error loading custom tools from database: {e}")
            self.custom_tools = {}
        finally:
            session.close()
    
    def _migrate_from_json(self):
        """Migrate custom tools from JSON file to database."""
        json_path = "custom_tools.json"
        if os.path.exists(json_path):
            try:
                with open(json_path, 'r') as f:
                    json_tools = json.load(f)
                
                logger.info(f"🔄 Migrating {len(json_tools)} tools from JSON to database")
                
                for tool_id, tool_data in json_tools.items():
                    self.custom_tools[tool_id] = tool_data
                    self._save_tool_to_db(tool_id, tool_data)
                
                # Rename the JSON file to indicate migration is complete
                os.rename(json_path, f"{json_path}.migrated")
                logger.info(f"✅ Migration complete. JSON file renamed to {json_path}.migrated")
                
            except Exception as e:
                logger.error(f"❌ Error migrating from JSON: {e}")
    
    def _save_tool_to_db(self, tool_id: str, tool_config: Dict[str, Any]):
        """Save or update a custom tool in the database."""
        from agent_config import CustomToolDB
        
        session = self.SessionLocal()
        try:
            # Check if tool exists
            db_tool = session.query(CustomToolDB).filter(CustomToolDB.id == tool_id).first()
            
            if db_tool:
                # Update existing tool
                db_tool.name = tool_config["name"]
                db_tool.description = tool_config["description"]
                db_tool.category = tool_config["category"]
                db_tool.api_config = tool_config["api_config"]
                db_tool.usage_count = tool_config["usage_count"]
                db_tool.status = tool_config["status"]
                db_tool.updated_at = datetime.utcnow()
                logger.info(f"🔧 Updated custom tool in database: {tool_config['name']}")
            else:
                # Create new tool
                db_tool = CustomToolDB(
                    id=tool_id,
                    name=tool_config["name"],
                    description=tool_config["description"],
                    category=tool_config["category"],
                    api_config=tool_config["api_config"],
                    usage_count=tool_config["usage_count"],
                    status=tool_config["status"]
                )
                session.add(db_tool)
                logger.info(f"🔧 Created new custom tool in database: {tool_config['name']}")
            
            session.commit()
        except Exception as e:
            logger.error(f"❌ Error saving custom tool to database: {e}")
            session.rollback()
        finally:
            session.close()
    
    def ensure_tools_from_agent_config(self, custom_tools_config: List[Dict[str, Any]]):
        """Ensure tools from agent config exist in the manager."""
        for tool_config in custom_tools_config:
            tool_name = tool_config.get("name")
            if not tool_name:
                continue
                
            # Check if a tool with this name already exists
            existing_tool_id = None
            for tool_id, tool_info in self.custom_tools.items():
                if tool_info.get("name") == tool_name:
                    existing_tool_id = tool_id
                    break
            
            if not existing_tool_id:
                # Create the tool if it doesn't exist
                logger.info(f"🔧 Recreating custom tool from agent config: {tool_name}")
                self.create_tool(tool_name, tool_config)
    
    def create_tool(self, tool_name: str, tool_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a custom tool from user configuration."""
        tool_id = hashlib.md5(f"{tool_name}_{datetime.utcnow().isoformat()}".encode()).hexdigest()[:8]
        
        # Enhanced tool configuration storage
        self.custom_tools[tool_id] = {
            "name": tool_config.get("name", tool_name),
            "description": tool_config.get("description", "Custom API tool"),
            "category": tool_config.get("category", "utility"),
            "api_config": tool_config.get("api_config", {}),
            "created_at": tool_config.get("created_at", datetime.utcnow().isoformat()),
            "usage_count": tool_config.get("usage_count", 0),
            "status": tool_config.get("status", "active")
        }
        
        # Save to database
        self._save_tool_to_db(tool_id, self.custom_tools[tool_id])
        
        logger.info(f"🔧 Custom tool created: {tool_name} ({tool_id})")
        return {
            "tool_id": tool_id, 
            "name": tool_config.get("name", tool_name),
            "description": tool_config.get("description", "Custom API tool"),
            "category": tool_config.get("category", "utility"),
            "status": "created"
        }
    
    def execute_custom_tool(self, tool_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a custom tool with given parameters."""
        if tool_id not in self.custom_tools:
            return {"error": "Tool not found"}
        
        tool_info = self.custom_tools[tool_id]
        api_config = tool_info.get("api_config", {})
        tool_info["usage_count"] += 1
        
        try:
            # Execute the actual API call
            endpoint = api_config.get("endpoint", "")
            method = api_config.get("method", "POST").upper()
            content_type = api_config.get("content_type", "application/json")
            auth_config = api_config.get("auth", {})
            
            headers = {"Content-Type": content_type}
            
            # Add authentication headers
            if auth_config:
                auth_type = auth_config.get("type", "none")
                auth_value = auth_config.get("value", "")
                
                if auth_type == "bearer":
                    headers["Authorization"] = f"Bearer {auth_value}"
                elif auth_type == "api_key":
                    headers["X-API-Key"] = auth_value
                elif auth_type == "basic":
                    import base64
                    credentials = base64.b64encode(auth_value.encode()).decode()
                    headers["Authorization"] = f"Basic {credentials}"
            
            # Prepare request data
            request_data = parameters
            
            # Make API call
            if method == "GET":
                response = requests.get(endpoint, params=request_data, headers=headers, timeout=30)
            elif method == "POST":
                if content_type == "application/json":
                    response = requests.post(endpoint, json=request_data, headers=headers, timeout=30)
                else:
                    response = requests.post(endpoint, data=request_data, headers=headers, timeout=30)
            elif method == "PUT":
                if content_type == "application/json":
                    response = requests.put(endpoint, json=request_data, headers=headers, timeout=30)
                else:
                    response = requests.put(endpoint, data=request_data, headers=headers, timeout=30)
            else:
                return {"error": f"Unsupported HTTP method: {method}"}
            
            # Process response
            response_format = api_config.get("response_format", "json")
            
            if response.status_code == 200:
                if response_format == "json":
                    try:
                        api_result = response.json()
                    except:
                        api_result = {"raw_response": response.text}
                elif response_format == "text":
                    api_result = {"text": response.text}
                elif response_format == "image":
                    api_result = {"image_url": response.text if response.text.startswith("http") else "Image data received"}
                else:
                    api_result = {"data": response.text}
                
                result = {
                    "tool_id": tool_id,
                    "tool_name": tool_info["name"],
                    "parameters": parameters,
                    "api_result": api_result,
                    "status": "success",
                    "executed_at": datetime.utcnow().isoformat()
                }
            else:
                result = {
                    "tool_id": tool_id,
                    "tool_name": tool_info["name"],
                    "parameters": parameters,
                    "error": f"API call failed with status {response.status_code}: {response.text}",
                    "status": "error",
                    "executed_at": datetime.utcnow().isoformat()
                }
            
        except Exception as e:
            result = {
                "tool_id": tool_id,
                "tool_name": tool_info["name"],
                "parameters": parameters,
                "error": f"Tool execution error: {str(e)}",
                "status": "error",
                "executed_at": datetime.utcnow().isoformat()
            }
        
        # Save updated usage count
        self.custom_tools[tool_id] = tool_info
        self._save_tool_to_db(tool_id, tool_info)
        
        logger.info(f"🔧 Custom tool executed: {tool_info['name']} - Status: {result.get('status', 'unknown')}")
        return result
    
    def get_tool_as_langchain_tool(self, tool_id: str):
        """Convert a custom tool to a LangChain Tool object."""
        if tool_id not in self.custom_tools:
            return None
        
        tool_info = self.custom_tools[tool_id]
        tool_name = tool_info["name"]
        tool_description = tool_info["description"]
        
        # Use the @tool decorator to create a proper LangChain tool
        from langchain_core.tools import tool
        
        # Create the tool with proper metadata
        @tool
        def dynamic_custom_tool(**kwargs) -> str:
            """Execute the custom API tool."""
            result = self.execute_custom_tool(tool_id, kwargs)
            if result.get("status") == "success":
                api_result = result.get('api_result', {})
                return json.dumps(api_result) if isinstance(api_result, dict) else str(api_result)
            else:
                return f"Error: {result.get('error', 'Unknown error')}"
        
        # Update the tool's name and description after creation
        dynamic_custom_tool.name = tool_name
        dynamic_custom_tool.description = tool_description
        
        logger.info(f"🔧 Created LangChain tool: {tool_name}")
        return dynamic_custom_tool
    
    def get_all_custom_tools_for_agent(self, custom_tool_names: List[str] = None):
        """Get all custom tools as LangChain Tool objects for an agent."""
        tools = []
        
        for tool_id, tool_info in self.custom_tools.items():
            # If specific tool names are provided, only include those
            if custom_tool_names and tool_info.get("name") not in custom_tool_names:
                continue
            
            try:
                tool = self.get_tool_as_langchain_tool(tool_id)
                tools.append(tool)
            except Exception as e:
                logger.error(f"❌ Error creating LangChain tool for {tool_info.get('name', tool_id)}: {e}")
        
        return tools
    
    def list_tools(self) -> Dict[str, Any]:
        """List all available custom tools."""
        return {
            "success": True,
            "tools": self.custom_tools,
            "total_count": len(self.custom_tools)
        } 