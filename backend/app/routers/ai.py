# backend/app/routers/ai.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import google.generativeai as genai
from google.protobuf.struct_pb2 import Struct
# --- THIS IS THE CORRECT IMPORT for v0.8.5 ---
from google.generativeai.types import GenerationConfig, Tool
from google.generativeai.protos import Part
# --- END FIX ---

from sqlalchemy.orm import Session
import json

from .. import deps, models, schemas
from ..config import settings # Import our config
from ..database import get_db
from .. import ai_tools # <-- This is the correct import

router = APIRouter()

# --- 1. Define the Pydantic schemas (this is still good) ---
class SuggestAssetsArgs(BaseModel):
    asset_type: str
    count: int

class GetHierarchyArgs(BaseModel):
    customer_name_or_id: str

class TroubleshootArgs(BaseModel):
    issue_description: str

# --- 2. Define the tools for the Gemini model (NEW SCHEMA) ---
# helper to convert a Pydantic model JSON schema -> genai protos.Schema
def _pydantic_model_to_proto_schema(model_cls: type[BaseModel]):
    """Try to build a genai Schema proto from a Pydantic model.
    Return a proto message on success, or None on failure (caller should omit parameters)."""
    try:
        schema_dict = model_cls.model_json_schema()
        s = Struct()
        s.update(schema_dict)

        SchemaProto = getattr(genai.protos, "Schema", None)
        if SchemaProto is None:
            return None

        tried = []
        for field in ("json_schema", "schema", "json"):
            tried.append(field)
            try:
                proto = SchemaProto()
                try:
                    setattr(proto, field, s)
                    return proto
                except Exception:
                    nested = getattr(proto, field)
                    nested.CopyFrom(s)
                    return proto
            except Exception:
                continue

        # Last-resort copy to underlying pb objects if present
        try:
            proto = SchemaProto()
            if hasattr(proto, "_pb") and hasattr(s, "_pb"):
                proto._pb.CopyFrom(s._pb)
                return proto
        except Exception:
            pass

        # Conversion failed -> return None (do not raise)
        print(f"Warning: could not build genai Schema proto for {model_cls.__name__}; tried fields: {tried}")
        return None

    except Exception as e:
        print(f"Warning: exception while converting pydantic schema {model_cls}: {e}")
        return None

def _make_function_declaration(name: str, description: str, model_cls: type[BaseModel]):
    params = _pydantic_model_to_proto_schema(model_cls)
    kwargs = {"name": name, "description": description}
    if params is not None:
        kwargs["parameters"] = params
    return genai.protos.FunctionDeclaration(**kwargs)

gemini_tools = [
    Tool(
        function_declarations=[
            _make_function_declaration(
                'suggest_available_assets',
                "Suggests available ONTs or Routers from the inventory for a planner to assign.",
                SuggestAssetsArgs
            ),
            _make_function_declaration(
                'get_customer_hierarchy',
                "Finds a customer by their name or username and returns their full network path (FDH, Splitter, Port).",
                GetHierarchyArgs
            ),
            _make_function_declaration(
                'troubleshoot_install_issue',
                "Provides troubleshooting steps for a field technician facing an issue (e.g., 'no light on ONT', 'slow speed').",
                TroubleshootArgs
            ),
        ]
    )
]

# --- 3. Map tool names to our actual Python functions ---
AVAILABLE_TOOLS = {
    "suggest_available_assets": ai_tools.suggest_available_assets,
    "get_customer_hierarchy": ai_tools.get_customer_hierarchy,
    "troubleshoot_install_issue": ai_tools.troubleshoot_install_issue,
}

# --- 4. Configure the AI Model ---
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)

    # Helper: try to discover a usable model from the API, fall back to configured name
    def _pick_gemini_model():
        # prefer explicit configuration if provided
        if getattr(settings, 'GEMINI_MODEL', None):
            return settings.GEMINI_MODEL
        try:
            # List models from the API and pick one that likely supports generation/chat
            available = genai.list_models()
            for m in available:
                name = getattr(m, 'name', None) or getattr(m, 'id', None) or str(m)
                if not name:
                    continue
                low = name.lower()
                # prefer models that include 'gemini' and are not fine-tunes
                if ('gemini' in low and not any(x in low for x in ('eval','ft'))):
                    return name
                # accept models that contain 'chat' or 'generate'
                if 'chat' in low or 'generate' in low:
                    return name
            # last resort: return the first model's name
            if len(available) > 0:
                first = available[0]
                return getattr(first, 'name', None) or getattr(first, 'id', None) or str(first)
        except Exception:
            # Listing failed (possible permission or API mismatch) — rely on settings or None
            return getattr(settings, 'GEMINI_MODEL', None)
        return None

    chosen_model_name = _pick_gemini_model()
    if not chosen_model_name:
        raise RuntimeError('No usable Gemini model found (check API access and settings.GEMINI_MODEL).')

    model = genai.GenerativeModel(
        chosen_model_name,
        generation_config=GenerationConfig(temperature=0.0),
        tools=gemini_tools
    )

    print(f"Gemini AI model configured successfully with tools. Using model: {chosen_model_name}")
except Exception as e:
    print(f"FATAL ERROR: Could not configure Gemini API or select model. Check API key and model availability. Error: {e}")
    model = None

# --- 5. Pydantic model for the request ---
class ChatRequest(BaseModel):
    message: str

@router.post("/chat", response_model=dict)
async def handle_chat_request(
    request: ChatRequest,
    db: Session = Depends(get_db), # <-- We now need the DB session
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Handles a new chat message from any authenticated user.
    This is now a tool-using agent.
    """
    if not model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured or available."
        )

    try:
        # We give the AI a system prompt based on the user's role
        system_prompt = f"You are a helpful assistant for the {current_user.role} role."
        if current_user.role == models.UserRole.PLANNER:
            system_prompt += " Be concise and provide data to help them plan the network."
        if current_user.role == models.UserRole.TECHNICIAN:
            system_prompt += " Be clear and provide step-by-step instructions to help them in the field."
            
        try:
            # Prefer the module-level configured model instance
            if model is not None:
                # start a chat session with the role-based system instruction
                try:
                    chat = model.start_chat(enable_automatic_function_calling=False, system_instruction=system_prompt)
                except TypeError:
                    # Some SDK versions may not accept system_instruction on start_chat; try without it
                    chat = model.start_chat(enable_automatic_function_calling=False)
            else:
                # As a last resort, construct a runtime model using the chosen model name or settings
                runtime_model_name = globals().get('chosen_model_name') or getattr(settings, 'GEMINI_MODEL', None)
                chat_model = genai.GenerativeModel(
                    runtime_model_name,
                    generation_config=GenerationConfig(temperature=0.0),
                    tools=gemini_tools,
                )
                try:
                    chat = chat_model.start_chat(enable_automatic_function_calling=False, system_instruction=system_prompt)
                except TypeError:
                    chat = chat_model.start_chat(enable_automatic_function_calling=False)

        except Exception as e:
            print(f"Error initializing chat session: {e}")
            raise

        response = await chat.send_message_async(request.message)
        
        # --- 6. Check if the AI wants to use a tool ---
        function_call = response.candidates[0].content.parts[0].function_call
        
        if not function_call:
            # No tool needed, just return the text response
            return {"response": response.text}

        # --- 7. AI wants to use a tool. Let's process it. ---
        function_name = function_call.name
        function_args = {key: value for key, value in function_call.args.items()}
        
        if function_name not in AVAILABLE_TOOLS:
            raise HTTPException(status_code=400, detail=f"AI requested unknown tool: {function_name}")

        # Call the actual Python function
        tool_function = AVAILABLE_TOOLS[function_name]
        
        # Pass the 'db' session and the arguments to the tool
        tool_result = tool_function(db=db, **function_args)
        
        # --- 8. Send the tool's result back to the AI ---
        final_response = await chat.send_message_async(
            Part.from_function_response(
                name=function_name,
                response={
                    "result": tool_result
                }
            )
        )
        
        # The AI will now generate a natural language response based on the tool's output
        return {"response": final_response.text}
        
    except Exception as e:
        print(f"Error during AI chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {e}"
        )