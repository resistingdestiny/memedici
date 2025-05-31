"""
LangGraph-based Agent System using create_react_agent
"""
from typing import Dict, List, Any, Optional, TypedDict
from langchain_openai import ChatOpenAI
from langchain_core.tools import Tool
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.prebuilt import create_react_agent
from langgraph.graph import StateGraph, MessagesState
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, Field
import os
import logging
import json

from agent_tools import get_available_tools, get_tools_by_names, custom_tool_manager
from agent_config import agent_registry, AgentConfig

# Configure logging for agent thoughts and actions
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('LangGraphAgent')


class AssetInfo(BaseModel):
    """Information about a created asset"""
    type: str = Field(description="Type of asset: 'image' or 'video'")
    url: str = Field(description="Full URL to access the asset")
    file_path: str = Field(description="Local file path of the asset")
    prompt: str = Field(description="Prompt used to create the asset")
    model: str = Field(description="AI model used to create the asset")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Generation parameters used")
    created_at: str = Field(description="Timestamp when asset was created")


class AgentResponse(BaseModel):
    """Structured response from the creative agent"""
    message: str = Field(description="The agent's conversational response message")
    assets: Dict[str, AssetInfo] = Field(
        default_factory=dict, 
        description="Dictionary of created assets keyed by asset ID"
    )
    
    @classmethod
    def get_json_schema(cls):
        """Get the JSON schema for this model"""
        return cls.model_json_schema()
    
    @classmethod
    def get_schema_example(cls):
        """Get an example of the expected structure"""
        return {
            "message": "I've created a beautiful landscape image for you!",
            "assets": {
                "landscape_001": {
                    "type": "image",
                    "url": "http://localhost:8000/static/artworks/artwork_123.png",
                    "file_path": "static/artworks/artwork_123.png",
                    "prompt": "beautiful landscape with mountains and lake",
                    "model": "AnythingV5",
                    "parameters": {"width": 512, "height": 512, "steps": 25},
                    "created_at": "2024-05-31T20:30:00Z"
                }
            }
        }

    @classmethod
    def get_schema_instructions(cls):
        """Get formatted schema instructions for system prompts"""
        schema = cls.model_json_schema()
        example = cls.get_schema_example()
        
        return f"""
RESPONSE FORMAT:
You must respond with a JSON object matching this exact schema:

{json.dumps(schema, indent=2)}

EXAMPLE RESPONSE:
{json.dumps(example, indent=2)}

IMPORTANT RULES:
1. Always include both "message" and "assets" fields
2. The "message" field should contain your conversational response
3. The "assets" field should contain any artworks/files you created using tools
4. If no assets were created, use an empty object for "assets": {{}}
5. Each asset should have all required fields: type, url, file_path, prompt, model, parameters, created_at
"""


# Custom state that inherits from MessagesState and adds final_response
class CreativeAgentState(MessagesState):
    """State for the creative agent conversation"""
    final_response: Optional[AgentResponse] = None


class LangGraphAgentManager:
    """Manages LangGraph-based ReAct agents with proper structured output"""
    
    def __init__(self):
        self.agents: Dict[str, Any] = {}
        self.checkpointer = MemorySaver()
        self.tools = get_available_tools()
        logger.info(f"🎨 Initialized Memedici Agent Manager with {len(self.tools)} art tools")
        
    def _create_llm(self, config: AgentConfig) -> ChatOpenAI:
        """Create and configure the LLM for structured output"""
        
        # Use models with larger context windows
        model_name = config.model_name

        # Create LLM for tool usage
        llm_with_tools = ChatOpenAI(
            model=model_name,
            temperature=config.temperature,
            max_tokens=None,
            api_key=os.getenv('OPENAI_API_KEY'),
            streaming=False,
            model_kwargs={
                "max_completion_tokens": None,
            }
        )
        
        logger.info(f"🧠 Created LLM: {model_name} (with structured output via response_format)")
        
        return llm_with_tools
    
    def _get_agent_tools(self, config: AgentConfig) -> List[Tool]:
        """Get tools enabled for this agent with agent context"""
        logger.info(f"⚙️  Getting tools for agent: {config.id}")
        
        # Import here to avoid circular imports
        from agent_tools import get_agent_aware_tools, custom_tool_manager
        
        # Get standard agent-aware tools (these know about the agent context)
        enabled_tools = get_agent_aware_tools(config.id)
        logger.info(f"🔧 Standard tools loaded: {[t.name for t in enabled_tools]}")
        
        # Filter based on agent's enabled tools
        if config.tools_enabled:
            filtered_tools = []
            for tool in enabled_tools:
                if tool.name in config.tools_enabled:
                    filtered_tools.append(tool)
            enabled_tools = filtered_tools
            logger.info(f"🎯 Filtered to enabled tools: {[t.name for t in enabled_tools]}")
        
        # Add custom tools if any are configured for this agent
        if config.custom_tools:
            custom_tool_names = [tool.get("name") for tool in config.custom_tools if tool.get("name")]
            logger.info(f"🛠️  Loading custom tools: {custom_tool_names}")
            
            # Get custom tools as LangChain Tool objects
            custom_langchain_tools = custom_tool_manager.get_all_custom_tools_for_agent(custom_tool_names)
            enabled_tools.extend(custom_langchain_tools)
            
            logger.info(f"✅ Added {len(custom_langchain_tools)} custom tools: {[t.name for t in custom_langchain_tools]}")
        
        logger.info(f"🔧 Total enabled tools: {[t.name for t in enabled_tools]}")
        return enabled_tools
    
    def _log_message_details(self, msg, prefix="📝"):
        """Log detailed message information"""
        if isinstance(msg, HumanMessage):
            logger.info(f"{prefix} 👤 Human: {msg.content}")
        elif isinstance(msg, AIMessage):
            logger.info(f"{prefix} 🤖 AI: {msg.content}")
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    logger.info(f"{prefix} 🛠️  Tool Call: {tool_call.get('name')}({tool_call.get('args', {})})")
        elif isinstance(msg, ToolMessage):
            logger.info(f"{prefix} 🔧 Tool Result: {msg.content[:100]}...")
    
    def get_or_create_agent(self, agent_id: str):
        """Get or create a LangGraph ReAct agent with structured output"""
        if agent_id not in self.agents:
            logger.info(f"🎯 Creating new creative agent: {agent_id}")
            
            # Get agent configuration
            config = agent_registry.get_agent_config(agent_id)
            if not config:
                raise ValueError(f"Agent {agent_id} not found in registry")
            
            logger.info(f"⚙️  Agent config: {config.agent_type} | Studio: {config.studio_name} | Memory: {config.memory_enabled}")
            logger.info(f"🎨 Persona: {config.persona_name} | Art Style: {config.art_style}")
            
            # Create LLMs
            llm_with_tools = self._create_llm(config)
            
            # Get tools for this agent
            tools = self._get_agent_tools(config)
            
            # Get the enhanced system prompt
            system_prompt = config.get_system_prompt()
            
            # Add structured output instructions
            structured_instructions = AgentResponse.get_schema_instructions()
            print(structured_instructions)
            system_prompt += structured_instructions
                        
            # Create the ReAct agent using LangGraph
            agent = create_react_agent(
                model=llm_with_tools,
                tools=tools,
                prompt=system_prompt,
                response_format=AgentResponse,
                checkpointer=self.checkpointer if config.memory_enabled else None
            )
            logger.info(f"✅ Successfully created ReAct agent: {agent_id}")

            self.agents[agent_id] = {
                'agent': agent,
                'config': config,
                'tools': [tool.name for tool in tools]
            }
        
        return self.agents[agent_id]
    
    def chat_with_agent(self, agent_id: str, message: str, thread_id: str = "default") -> Dict[str, Any]:
        """Chat with a specific creative agent using LangGraph"""
        logger.info("=" * 70)
        logger.info(f"🎬 Starting creative session with agent '{agent_id}' (thread: {thread_id})")
        logger.info(f"👤 User input: {message}")
        
        try:
            # Get or create the agent
            agent_info = self.get_or_create_agent(agent_id)
            agent = agent_info['agent']
            config = agent_info['config']
            
            logger.info(f"🎨 Using agent: {config.persona_name} ({config.agent_type})")
            logger.info(f"🏛️  Studio: {config.studio_name} | Art Style: {config.art_style}")
            logger.info(f"🔧 Available tools: {agent_info['tools']}")
            
            # Create the conversation state
            config_dict = {"recursion_limit": 30}
            if config.memory_enabled:
                config_dict["configurable"] = {"thread_id": thread_id}
                logger.info(f"💾 Memory enabled for thread: {thread_id}")
            
            # Run the ReAct agent with structured output
            logger.info("🧠 Agent is processing with tools...")
            
            result = agent.invoke(
                {"messages": [HumanMessage(content=message)]},
                config=config_dict
            )
            logger.info(f"🎨 Agent response: {result}")

            # Extract structured response and messages
            messages = result.get("messages", [])
            logger.info(f"📋 Total messages in conversation: {len(messages)}")
            
            # Log the complete thought process
            logger.info("🧠 CONVERSATION FLOW:")
            for i, msg in enumerate(messages, 1):
                self._log_message_details(msg, f"  {i}.")
            
            # Determine which tools were used
            tools_used = []
            tool_calls_count = 0
            
            for msg in messages:
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    tool_calls_count += len(msg.tool_calls)
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get('name')
                        if tool_name and tool_name not in tools_used:
                            tools_used.append(tool_name)
            
            logger.info(f"🔧 Tools used: {tools_used} ({tool_calls_count} total calls)")
            logger.info("✅ Creative session completed successfully")
            
            # Extract structured response - prioritize parsing from AI message content
            ai_messages = [msg for msg in messages if isinstance(msg, AIMessage)]
            if ai_messages:
                last_ai_message = ai_messages[-1]
                content = last_ai_message.content
                
                # Try to parse JSON structured response from AI message content
                if isinstance(content, str):
                    try:
                        parsed_content = json.loads(content)
                        if isinstance(parsed_content, dict) and "message" in parsed_content:
                            # Convert to AgentResponse
                            assets_data = parsed_content.get("assets", {})
                            assets = {}
                            
                            # Convert asset data to AssetInfo objects
                            for asset_id, asset_data in assets_data.items():
                                if isinstance(asset_data, dict):
                                    try:
                                        assets[asset_id] = AssetInfo(**asset_data)
                                        logger.info(f"✅ Created AssetInfo for {asset_id}")
                                    except Exception as e:
                                        logger.warning(f"Failed to parse asset {asset_id}: {e}")
                                        # Keep as raw dict if AssetInfo creation fails
                                        assets[asset_id] = asset_data
                                else:
                                    assets[asset_id] = asset_data
                            
                            structured_response = AgentResponse(
                                message=parsed_content.get("message", ""),
                                assets=assets
                            )
                            logger.info(f"✅ Parsed JSON to AgentResponse with {len(assets)} assets")
                            return structured_response
                    except json.JSONDecodeError:
                        logger.info("📝 Content is not valid JSON, checking structured_response")
            
            # Fallback to result.structured_response if available
            if hasattr(result, 'structured_response') and isinstance(result.structured_response, AgentResponse):
                structured_response = result.structured_response
                logger.info(f"✅ Using result.structured_response with {len(structured_response.assets)} assets")
                return structured_response
            
            # Final fallback: create basic response
            if ai_messages:
                last_ai_message = ai_messages[-1]
                return AgentResponse(
                    message=str(last_ai_message.content),
                    assets={}
                )
            else:
                return AgentResponse(
                    message="I've processed your request.",
                    assets={}
                )
            
        except Exception as e:
            logger.error(f"❌ Error in creative session: {str(e)}")
            # Return error in AgentResponse format
            return AgentResponse(
                message=f"❌ Error: {str(e)}",
                assets={}
            )
    
    def reset_agent_memory(self, agent_id: str, thread_id: str = "default"):
        """Reset memory for a specific agent thread"""
        logger.info(f"🗑️  Resetting creative memory for agent '{agent_id}', thread '{thread_id}'")
        if agent_id in self.agents:
            agent_info = self.agents[agent_id]
            if agent_info['config'].memory_enabled and hasattr(self.checkpointer, 'delete'):
                # Try to clear the thread's memory if the checkpointer supports it
                try:
                    config_dict = {"configurable": {"thread_id": thread_id}}
                    # Note: MemorySaver doesn't have a delete method, so we'll recreate the agent
                    del self.agents[agent_id]
                    logger.info(f"✅ Creative memory reset completed for {agent_id}")
                except Exception:
                    logger.warning(f"⚠️  Could not reset memory for {agent_id}")
    
    def list_available_agents(self) -> List[str]:
        """List all available agent IDs"""
        agents = agent_registry.list_agents()
        logger.info(f"📋 Available Memedici agents: {agents}")
        return agents
    
    def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """Get information about a specific creative agent"""
        info = agent_registry.get_agent_info(agent_id)
        logger.info(f"ℹ️  Creative agent info for '{agent_id}': Studio: {info.get('studio', {}).get('name')}")
        return info


# Global agent manager instance
agent_manager = LangGraphAgentManager() 