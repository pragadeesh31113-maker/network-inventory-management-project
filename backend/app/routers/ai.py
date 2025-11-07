from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from openai import OpenAI 
from sqlalchemy.orm import Session
import json
from typing import Optional, List, Dict

from .. import deps, models, schemas
from ..config import settings 
from ..database import get_db
from .. import ai_tools 

router = APIRouter()

# --- 1. Initialize OpenAI Client ---
try:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    MODEL_NAME = "gpt-4o-mini"
    print(f"OpenAI client configured successfully. Using model: {MODEL_NAME}")
except Exception as e:
    print(f"FATAL ERROR: Could not configure OpenAI API. Check API key. Error: {e}")
    client = None

# --- 2. Define the Pydantic schemas for ALL tools ---
class SuggestAssetsArgs(BaseModel):
    asset_type: str
    count: int
class GetHierarchyArgs(BaseModel):
    customer_name_or_id: str
class TroubleshootArgs(BaseModel):
    issue_description: str
class ListDevicesArgs(BaseModel):
    status: Optional[str] = Field(None, description="Filter by status: AVAILABLE, ASSIGNED, FAULTY, IN_REPAIR, RETIRED, IN_USE")
    asset_type: Optional[str] = Field(None, description="Filter by type: ONT, ROUTER, SPLITTER, FDH")
class GetSplitterDetailsArgs(BaseModel):
    splitter_name: str = Field(..., description="The name of the splitter, e.g., 'SPL-CHN-ADY-01-01'")
class GetTechnicianTasksArgs(BaseModel):
    pass # No arguments needed
class GetDeviceDetailsBySerialArgs(BaseModel):
    serial_number: str = Field(..., description="The serial number of the asset, e.g., 'ONT-SN-123456'")
class UpdateAssetStatusArgs(BaseModel):
    serial_number: str = Field(..., description="The serial number of the asset to update.")
    new_status: str = Field(..., description="The new status. Must be one of: AVAILABLE, FAULTY, IN_REPAIR, RETIRED")
class UpdateTaskStatusArgs(BaseModel):
    task_id: int = Field(..., description="The ID of the deployment task to update.")
    new_status: str = Field(..., description="The new status. Must be one of: IN_PROGRESS, COMPLETED, FAILED")


# --- 3. Define tools in OpenAI's format ---
openai_tools = [
    {"type": "function", "function": {"name": "suggest_available_assets", "description": "Suggests available ONTs or Routers from the inventory for a planner to assign.", "parameters": SuggestAssetsArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "get_customer_hierarchy", "description": "Finds a *specific* customer by their name or username and returns their full network path (FDH, Splitter, Port).", "parameters": GetHierarchyArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "troubleshoot_install_issue", "description": "Provides troubleshooting steps for a field technician facing an issue (e.g., 'no light on ONT', 'slow speed').", "parameters": TroubleshootArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "list_devices", "description": "Lists all devices from the asset inventory, with optional filters for status or asset_type (e.g., 'list faulty devices', 'list all ONTs').", "parameters": ListDevicesArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "get_splitter_details", "description": "Gets the port-by-port connection details for a specific splitter.", "parameters": GetSplitterDetailsArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "get_technician_tasks", "description": "Gets a list of PENDING or IN_PROGRESS tasks for the *currently logged-in technician*.", "parameters": GetTechnicianTasksArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "get_device_details_by_serial", "description": "Finds a single asset by its serial number and returns its full details.", "parameters": GetDeviceDetailsBySerialArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "update_asset_status", "description": "WRITE ACTION: Updates the status of an asset (ONT, Router, FDH, or Splitter).", "parameters": UpdateAssetStatusArgs.model_json_schema()}},
    {"type": "function", "function": {"name": "update_task_status", "description": "WRITE ACTION: Updates the status of a deployment task (e.g., to COMPLETED or FAILED).", "parameters": UpdateTaskStatusArgs.model_json_schema()}},
]

# --- 4. Map tool names ---
AVAILABLE_TOOLS = {
    "suggest_available_assets": ai_tools.suggest_available_assets,
    "get_customer_hierarchy": ai_tools.get_customer_hierarchy,
    "troubleshoot_install_issue": ai_tools.troubleshoot_install_issue,
    "list_devices": ai_tools.list_devices,
    "get_splitter_details": ai_tools.get_splitter_details,
    "get_technician_tasks": ai_tools.get_technician_tasks,
    "get_device_details_by_serial": ai_tools.get_device_details_by_serial,
    "update_asset_status": ai_tools.update_asset_status,
    "update_task_status": ai_tools.update_task_status,
}

# --- 5. Pydantic model for the request (NOW WITH HISTORY) ---
class ChatHistoryItem(BaseModel):
    role: str # 'user' or 'assistant'
    content: str
    
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatHistoryItem]] = [] # <-- NEW

@router.post("/chat", response_model=dict)
def handle_chat_request(
    request: ChatRequest,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Handles a new chat message using the OpenAI tool-using agent.
    """
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured or available."
        )

    try:
        # --- 6. Set up the messages for OpenAI ---
        tool_names = ", ".join(AVAILABLE_TOOLS.keys())
        system_prompt = f"""
You are an expert AI assistant for a network inventory system. 
Your user has the role: {current_user.role}.
You MUST use your available tools to answer questions about the network, customers, or assets.
Your available tools are: [{tool_names}].
You have "Read" tools (like list_devices) and "Write" tools (like update_asset_status).
For ANY "Write" action, you MUST confirm with the user first by asking "Are you sure...?"
Do not perform a write action until the user has confirmed.
If the user asks a question you cannot answer with these tools, you MUST politely explain that you cannot perform that action and suggest an action you *can* do.

IMPORTANT: Do not use Markdown formatting like **bold** or bullet points. Respond in plain, professional, human-readable text.
"""
            
        messages = [
            {"role": "system", "content": system_prompt},
            # --- NEW: Add chat history ---
            *[{"role": item.role, "content": item.content} for item in request.history],
            # --- END NEW ---
            {"role": "user", "content": request.message}
        ]

        # --- 7. Call OpenAI API ---
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            tools=openai_tools,
            tool_choice="auto" 
        )
        
        response_message = response.choices[0].message
        
        # --- 8. Check if the AI wants to use a tool ---
        tool_calls = response_message.tool_calls
        if not tool_calls:
            return {"response": response_message.content}

        # --- 9. AI wants to use a tool. Let's process it. ---
        messages.append(response_message) 
        
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            if function_name not in AVAILABLE_TOOLS:
                raise HTTPException(status_code=400, detail=f"AI requested unknown tool: {function_name}")

            tool_function = AVAILABLE_TOOLS[function_name]
            
            # --- Pass user_id to "write" and "technician" tools ---
            if function_name in ["update_asset_status"]:
                function_args["user_id"] = current_user.id
            if function_name in ["get_technician_tasks"]:
                 function_args["user_id"] = current_user.id
                
            if function_args:
                tool_result = tool_function(db=db, **function_args)
            else:
                tool_result = tool_function(db=db)
            # --- END ---

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": function_name,
                "content": json.dumps(tool_result)
            })

        # --- 10. Send the tool's result back to the AI ---
        final_response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages
        )
        
        return {"response": final_response.choices[0].message.content}
        
    except Exception as e:
        print(f"Error during AI chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {e}"
        )