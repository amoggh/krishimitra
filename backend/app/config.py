from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "KrushiMitra API"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]
    data_gov_in_api_key: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
