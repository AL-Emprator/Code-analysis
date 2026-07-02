import secrets
from urllib.parse import urlencode
from app.core.config import settings

from typing import Any
import httpx


GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


#Erstellt die URL für die GitHub-Authentifizierung
# Die Service-Funktion kümmert sich nur darum, die GitHub-URL zu erzeugen.

def create_github_authorization_url() -> tuple[str, str]:
    if not settings.github_client_id:
        raise RuntimeError("GITHUB_CLIENT_ID ist nicht konfiguriert.")

    state = secrets.token_urlsafe(32)


    query = urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_callback_url,
            "scope": "read:user user:email",
            "state": state,
        }
    )

    # Erzeugt die vollständige URL für die GitHub-Authentifizierung
    url = f"https://github.com/login/oauth/authorize?{query}"

    return url, state


# Tauscht den Code gegen ein Access Token aus, indem eine Anfrage an GitHub gesendet wird
async def exchange_code_for_access_token(code: str) -> str:
    if not settings.github_client_id:
        raise RuntimeError("GITHUB_CLIENT_ID ist nicht konfiguriert.")

    if not settings.github_client_secret:
        raise RuntimeError("GITHUB_CLIENT_SECRET ist nicht konfiguriert.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            GITHUB_ACCESS_TOKEN_URL,
            headers={
                "Accept": "application/json",
            },
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_callback_url,
            },
        )

    response.raise_for_status()

    payload = response.json()

    access_token = payload.get("access_token")

    if not access_token:
        error_description = payload.get(
            "error_description",
            "GitHub hat kein Access Token zurückgegeben.",
        )
        raise RuntimeError(error_description)

    return str(access_token)


# Ruft die GitHub-Benutzerdaten ab, indem eine Anfrage an die GitHub-API gesendet wird
async def get_github_user(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            GITHUB_USER_URL,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    response.raise_for_status()
    return response.json()

# Ruft die primäre E-Mail-Adresse des GitHub-Benutzers ab, indem eine Anfrage an die GitHub-API gesendet wird
async def get_github_primary_email(access_token: str) -> str | None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            GITHUB_EMAILS_URL,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    response.raise_for_status()

    emails = response.json()

    for email_entry in emails:
        if (
            email_entry.get("primary") is True
            and email_entry.get("verified") is True
        ):
            email = email_entry.get("email")

            if isinstance(email, str):
                return email

    return None