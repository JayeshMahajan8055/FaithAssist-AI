from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    llm_provider: str = "openai"
    groq_api_key: str = ""
    groq_chat_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4.1"
    embedding_provider: str = "openai"
    openai_embedding_model: str = Field(
        default="text-embedding-3-small",
        validation_alias=AliasChoices("OPENAI_EMBEDDING_MODEL", "EMBEDDING_MODEL"),
    )
    image_provider: str = "pollinations"
    pollinations_base_url: str = "https://image.pollinations.ai/prompt"
    openai_image_model: str = "gpt-image-1"
    app_env: str = "development"
    database_url: str = "sqlite+aiosqlite:///./faithassist.db"
    chroma_path: str = "./.chroma"
    frontend_origin: str = "http://localhost:3000"
    data_dir: Path = Path("../data")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
