import secrets
from urllib.parse import urlencode

from app.core.config import settings

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