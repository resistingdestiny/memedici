"""
LangGraph-based Agent System using create_react_agent
"""
from typing import Dict, List, Any, Optional, TypedDict
from langchain_openai import ChatOpenAI
from langchain_core.tools import Tool
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.prebuilt import create_react_agent
from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver
import os
import logging

from agent_tools import get_available_tools, get_tools_by_names, custom_tool_manager
from agent_config import agent_registry, AgentConfig
from prompts.system_prompts import get_system_prompt

# Configure logging for agent thoughts and actions
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('LangGraphAgent')


class AgentState(TypedDict):
    """State for the agent conversation"""
    messages: List[Any]
    agent_id: str
    thread_id: str


class LangGraphAgentManager:
    """Manages LangGraph-based ReAct agents with proper state management"""
    
    def __init__(self):
        self.agents: Dict[str, Any] = {}
        self.checkpointer = MemorySaver()
        self.tools = get_available_tools()
        logger.info(f"🎨 Initialized Memedici Agent Manager with {len(self.tools)} art tools")
        
    def _create_llm(self, config: AgentConfig) -> ChatOpenAI:
        """Create and configure the LLM for an agent with unrestricted context"""
        
        # Use models with larger context windows
        model_name = config.model_name

        llm = ChatOpenAI(
            model=model_name,
            temperature=config.temperature,
            max_tokens=None,  # No token limit for unrestricted context
            api_key=os.getenv('OPENAI_API_KEY'),
            streaming=False,
            model_kwargs={
                "max_completion_tokens": None,  # Remove completion token limits
            }
        )
        logger.info(f"🧠 Created unrestricted LLM: {model_name} (temp: {config.temperature}, context: unlimited)")
        return llm
    
    def _get_agent_tools(self, config: AgentConfig) -> List[Tool]:
        """Get tools for the agent based on configuration."""
        from agent_tools import get_tools_by_names, custom_tool_manager
        
        # Get standard enabled tools
        enabled_tools = get_tools_by_names(config.tools_enabled)
        
        # Add custom tools
        if config.custom_tools:
            logger.info(f"🔧 Integrating {len(config.custom_tools)} custom tools")
            
            # First, ensure all custom tools from agent config exist in the manager
            custom_tool_manager.ensure_tools_from_agent_config(config.custom_tools)
            
            # Extract custom tool names from the custom_tools list
            custom_tool_names = []
            for custom_tool in config.custom_tools:
                if isinstance(custom_tool, dict):
                    # Tool data from frontend (when creating agent)
                    tool_name = custom_tool.get("name")
                    if tool_name:
                        custom_tool_names.append(tool_name)
                elif isinstance(custom_tool, str):
                    # Tool name reference
                    custom_tool_names.append(custom_tool)
            
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
        """Get or create a LangGraph ReAct agent"""
        if agent_id not in self.agents:
            logger.info(f"🎯 Creating new creative agent: {agent_id}")
            
            # Get agent configuration
            config = agent_registry.get_agent_config(agent_id)
            if not config:
                raise ValueError(f"Agent {agent_id} not found in registry")
            
            logger.info(f"⚙️  Agent config: {config.agent_type} | Studio: {config.studio_name} | Memory: {config.memory_enabled}")
            logger.info(f"🎨 Persona: {config.persona_name} | Art Style: {config.art_style}")
            
            # Create LLM
            llm = self._create_llm(config)
            
            # Get tools for this agent
            tools = self._get_agent_tools(config)
            
            # Get the enhanced system prompt with studio and persona context
            system_prompt = config.get_system_prompt()
            
            logger.info(f"💬 System prompt: {system_prompt[:150]}...")
            
            # Create the ReAct agent using LangGraph
            try:
                agent = create_react_agent(
                    model=llm,
                    tools=tools,
                    prompt=system_prompt,
                    checkpointer=self.checkpointer if config.memory_enabled else None
                )
                logger.info(f"✅ Successfully created ReAct agent: {agent_id}")
            except Exception as e:
                logger.error(f"❌ Error creating agent {agent_id}: {e}")
                # Create a simple agent without checkpointer as fallback
                agent = create_react_agent(
                    model=llm,
                    tools=tools,
                    prompt=system_prompt
                )
                logger.info(f"⚠️  Created fallback agent without memory: {agent_id}")
            
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
            config_dict = {"recursion_limit": 30}  # Increased for creative processes
            if config.memory_enabled:
                config_dict["configurable"] = {"thread_id": thread_id}
                logger.info(f"💾 Memory enabled for thread: {thread_id}")
            
            # Invoke the agent with the message
            logger.info("🧠 Agent is creating...")
            
            result = agent.invoke(
                {"messages": [HumanMessage(content=message)]},
                config=config_dict
            )
            
            logger.info("🎯 Creative process completed. Processing results...")
            
            # Extract and log all messages
            messages = result.get("messages", [])
            logger.info(f"📋 Total messages in creative session: {len(messages)}")
            
            # Log the complete thought process
            logger.info("🧠 CREATIVE PROCESS:")
            for i, msg in enumerate(messages, 1):
                self._log_message_details(msg, f"  {i}.")
            
            # Extract the final response
            if messages and len(messages) > 0:
                # Get the last AI message
                ai_messages = [msg for msg in messages if isinstance(msg, AIMessage)]
                if ai_messages:
                    response = ai_messages[-1].content
                    logger.info(f"💬 Final creative output: {response[:200]}...")
                else:
                    response = "No creative output generated"
                    logger.warning("⚠️  No AI response found")
            else:
                response = "No creative output generated"
                logger.warning("⚠️  No messages in result")
            
            # Determine which tools were used
            tools_used = []
            tool_calls_count = 0
            artworks_created = 0
            
            for msg in messages:
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    tool_calls_count += len(msg.tool_calls)
                    for tool_call in msg.tool_calls:
                        tool_name = tool_call.get('name')
                        if tool_name and tool_name not in tools_used:
                            tools_used.append(tool_name)
                        if tool_name == 'create_artwork':
                            artworks_created += 1
            
            logger.info(f"🔧 Tools used: {tools_used} ({tool_calls_count} total calls)")
            if artworks_created > 0:
                logger.info(f"🎨 Artworks created in this session: {artworks_created}")
            logger.info("✅ Creative session completed successfully")
            
            return {
                "success": True,
                "response": response,
                "agent_id": agent_id,
                "thread_id": thread_id,
                "tools_used": tools_used,
                "artworks_created": artworks_created,
                "error": None
            }
            
        except Exception as e:
            logger.error(f"❌ Error in creative session: {str(e)}")
            return {
                "success": False,
                "response": None,
                "agent_id": agent_id,
                "thread_id": thread_id,
                "tools_used": None,
                "artworks_created": 0,
                "error": str(e)
            }
    
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