from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

from sqlalchemy.orm import Session
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage

from .. import deps, models, ai_tools
from ..config import settings 
from ..database import get_db

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# --- 1. Initialize Gemini Model ---
if not settings.GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY is missing in settings.")
    llm = None
else:
    try:
        # Initialize Gemini with LangChain
        # We use a temperature of 0 ensures the tool calling is deterministic
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0, 
            convert_system_message_to_human=True 
        )
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
        llm = None

# --- 2. Define Tools ---
# These match the decorated functions in ai_tools.py
tools = [
    ai_tools.suggest_available_assets,
    ai_tools.get_customer_hierarchy,
    ai_tools.troubleshoot_install_issue,
    ai_tools.list_devices,
    ai_tools.get_splitter_details,
    ai_tools.get_technician_tasks,
    ai_tools.get_device_details_by_serial,
    ai_tools.update_asset_status,
    ai_tools.update_task_status
]

# Bind tools to the LLM
if llm:
    llm_with_tools = llm.bind_tools(tools)

# --- 3. Build the LangGraph ---
def build_graph():
    """Builds the agent workflow graph."""
    
    # Node 1: The Agent (calls the implementation)
    def agent_node(state: MessagesState):
        return {"messages": [llm_with_tools.invoke(state["messages"])]}

    # Build Graph
    builder = StateGraph(MessagesState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", ToolNode(tools)) # ToolNode directs execution to the functions

    builder.add_edge(START, "agent")
    
    # Conditional Edge: Check if the agent wanted to call a tool
    def should_continue(state: MessagesState):
        last_message = state["messages"][-1]
        if last_message.tool_calls:
            return "tools"
        return END

    builder.add_conditional_edges("agent", should_continue)
    builder.add_edge("tools", "agent") # Loop back to agent to interpret result

    # Compile with memory to maintain chat history
    memory = MemorySaver()
    return builder.compile(checkpointer=memory)

# Initialize the graph
agent_executor = build_graph() if llm else None

# --- 4. API Endpoint ---

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default_user" # Unique ID for the conversation session

@router.post("/chat")
def handle_chat_request(
    request: ChatRequest,
    current_user: models.User = Depends(deps.get_current_active_user)
):
    if not agent_executor:
        raise HTTPException(status_code=503, detail="AI service unavailable (configuration error).")

    # Construct the System Prompt dynamically to include User Context
    # This acts as the "identity" of the bot for this specific user.
    system_prompt = f"""You are an expert Network Inventory Assistant used by a Telecom Company.
    
    Your User's Context:
    - Role: {current_user.role}
    - User ID: {current_user.id} (Use this ID when tools require 'user_id')
    - Name: {current_user.full_name}
    
    Guidelines:
    1. Be concise and professional.
    2. ALWAYS use the provided tools to fetch data. Do not hallucinate inventory data.
    3. If a tool requires confirmation (like 'update_asset_status'), ensure you have the details needed.
    4. Provide the 'user_id' provided above when a tool asks for it.
    """
    
    # The config is used by LangGraph's checkpointer to track the thread
    config = {"configurable": {"thread_id": request.thread_id}}
    
    try:
        # Run the graph
        # We prepend the system prompt. LangGraph history management isn't just append-only; 
        # normally we manage state carefully. Here, we send the system message on every turn 
        # or rely on the memory. 
        # Simple pattern: Send SystemMessage + HumanMessage. 
        # Note: If memory persists, repeated SystemMessages might pile up. 
        # Correct pattern for LangGraph usually involves filtering history or just sending the new message 
        # assuming clear context. However, to ensure "User ID" is always fresh, sending it as system prompt is safe.
        
        inputs = {
            "messages": [
                SystemMessage(content=system_prompt),
                HumanMessage(content=request.message)
            ]
        }
        
        final_state = agent_executor.invoke(inputs, config=config)
        
        # Extract the last message content
        last_msg = final_state["messages"][-1].content
        return {"response": last_msg}

    except Exception as e:
        logger.error(f"Chat Error: {e}")
        # In case of graph execution error, return a 500
        raise HTTPException(status_code=500, detail=str(e))