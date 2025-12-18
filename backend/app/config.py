# from pydantic_settings import BaseSettings
# import os

# # This tells pydantic where to find the .env file
# # (../ means "go up one directory" from 'app' to 'backend')
# env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

# class Settings(BaseSettings):
#     GEMINI_API_KEY: str

#     class Config:
#         env_file = env_path
#         env_file_encoding = 'utf-8'

# # This 'settings' object is what the rest of our app will import
# settings = Settings()
from pydantic_settings import BaseSettings
import os

# This tells pydantic where to find the .env file
# It goes up one level from 'app' to 'backend'
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

class Settings(BaseSettings):
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None

    # Use model_config so pydantic v2 reads the .env and ignores extra keys
    model_config = {
        "env_file": env_path,
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

# This 'settings' object is what the rest of our app will import
settings = Settings()