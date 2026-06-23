import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    github_client_id: str = os.getenv("GITHUB_CLIENT_ID", "")
    github_client_secret: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    github_callback_url: str = os.getenv(
        "GITHUB_CALLBACK_URL",
        "http://localhost:8000/api/auth/oauth/github/callback",
    )
    frontend_url: str = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000",
    )


settings = Settings()