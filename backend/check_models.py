import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load .env manually if needed, or rely on system env
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: GEMINI_API_KEY not found in environment.")
else:
    genai.configure(api_key=api_key)
    print(f"Checking models for API Key: {api_key[:5]}...")
    try:
        print("\nAvailable Models:")
        found = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
                found = True
        if not found:
            print("No models found that support 'generateContent'.")
    except Exception as e:
        print(f"Error listing models: {e}")
