import secrets

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Request,
    Response,
)

from app.services.github_oauth import create_github_authorization_url
from app.schemas.auth import GithubOAuthStartResponse

#Erstellt einen API-Router für Authentifizierungs-Endpunkte
router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)

#Startet den GitHub OAuth-Prozess, indem die GitHub-Authentifizierungs-URL generiert wird 

@router.get("/oauth/github/start", response_model=GithubOAuthStartResponse)
async def start_github_oauth(response: Response):
    
    try:
        authorization_url, state = create_github_authorization_url()
    except RuntimeError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error


    response.set_cookie(
        key="github_oauth_state",
        value=state,
        httponly=True,
        secure=False,  # Nur für lokale Entwicklung über HTTP
        samesite="lax",
        max_age=600,
        path="/"
    )

    return GithubOAuthStartResponse(
        url=authorization_url, 
        
    )


    #Für den ersten Test kannst du state noch mit zurückgeben. Später solltest du ihn nicht einfach an das Frontend ausliefern, sondern serverseitig oder in einem sicheren Cookie speichern.


@router.get("/oauth/github/callback")
async def github_oauth_callback(
    request: Request,
    response: Response,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
):
    if error:
        raise HTTPException(
            status_code=400,
            detail=error_description or f"GitHub OAuth Fehler: {error}",
        )

    if not code:
        raise HTTPException(
            status_code=400,
            detail="GitHub hat keinen Authorization Code zurückgegeben.",
        )

    if not state:
        raise HTTPException(
            status_code=400,
            detail="OAuth state fehlt.",
        )

    stored_state = request.cookies.get("github_oauth_state")

    if not stored_state:
        raise HTTPException(
            status_code=400,
            detail="Gespeicherter OAuth state fehlt oder ist abgelaufen.",
        )

    if not secrets.compare_digest(state, stored_state):
        raise HTTPException(
            status_code=400,
            detail="Ungültiger OAuth state.",
        )

    response.delete_cookie(
        key="github_oauth_state",
    )

    return {
        "message": "GitHub OAuth Callback wurde erfolgreich validiert.",
        "codeReceived": True,
    }