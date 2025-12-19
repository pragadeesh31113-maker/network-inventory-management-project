import os
import sys

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.routers.ai import agent_executor
from langchain_core.messages import HumanMessage, SystemMessage

# Mock User Context
mock_user = {
    "role": "PLANNER",
    "id": 1,
    "full_name": "Test Administrator"
}

system_prompt = f"""You are an expert Network Inventory Assistant used by a Telecom Company.
Your User's Context:
- Role: {mock_user['role']}
- User ID: {mock_user['id']}
- Name: {mock_user['full_name']}
"""

def test_agent():
    print("--- Starting AI Agent Verification ---")
    if not agent_executor:
        print("ERROR: Agent executor is None. Check API Key configuration.")
        return

    # Test 1: Simple Greeting
    print("\nTest 1: Simple Greeting ('Hello')")
    try:
        inputs = {
            "messages": [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Hello, who are you?")
            ]
        }
        config = {"configurable": {"thread_id": "verify_test"}}
        result = agent_executor.invoke(inputs, config=config)
        print("Response:", result["messages"][-1].content)
    except Exception as e:
        print(f"Test 1 Failed: {e}")

    # Test 2: Tool Call (Read Only)
    print("\nTest 2: Tool Call ('List available ONTs')")
    try:
        inputs = {
            "messages": [
                SystemMessage(content=system_prompt),
                HumanMessage(content="List 2 available ONTs please.")
            ]
        }
        result = agent_executor.invoke(inputs, config=config)
        print("Response:", result["messages"][-1].content)
    except Exception as e:
        print(f"Test 2 Failed: {e}")

if __name__ == "__main__":
    test_agent()
