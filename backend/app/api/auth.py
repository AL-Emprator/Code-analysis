import secrets
import httpx
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Depends,
    Request,
    Response,
)


from app.services.session_service import (
    create_user_session,
    get_user_from_session_token,
)

from app.services.github_oauth import (
    create_github_authorization_url,
    exchange_code_for_access_token,
    get_github_primary_email,
    get_github_user,
)


from app.schemas.auth import GithubOAuthStartResponse



from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db

from app.services.session_service import create_user_session
from app.services.user_service import find_or_create_github_user


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
    request: Request, # Die Request-Instanz wird verwendet, um auf die eingehende HTTP-Anfrage zuzugreifen, einschließlich der Abfrageparameter und Cookies.
    #response: Response, # Die Response-Instanz wird verwendet, um HTTP-Antworten zu erstellen und Cookies zu setzen oder zu löschen.
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    database: Session = Depends(get_db),
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

    try:
        access_token = await exchange_code_for_access_token(code)
        github_user = await get_github_user(access_token)
        github_email = await get_github_primary_email(access_token)



        user = find_or_create_github_user(
            database=database,
            github_user=github_user,
            email=github_email or github_user.get("email"),
        )

        session_token, user_session = create_user_session(
            database=database,
            user_id=user.id,
        )
        
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
    ) from exc

    except RuntimeError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail="Kommunikation mit GitHub ist fehlgeschlagen.",
        ) from error


    redirect_response = RedirectResponse(
        url="http://localhost:3000?oauth=success",
        status_code=302,
    )

    redirect_response.delete_cookie(
        key="github_oauth_state",
        path="/",
    )

    redirect_response.set_cookie(
        key="session_id",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    return redirect_response


 #Gibt eine Antwort zurück, die die GitHub-Benutzerdaten enthält, nachdem der Benutzer erfolgreich authentifiziert wurde 
 
'''
    return {
        "message": "GitHub-Benutzer wurde erfolgreich authentifiziert.",
        "githubUser": {
            "id": github_user.get("id"),
            "login": github_user.get("login"),
            "name": github_user.get("name"),
            "email": github_email or github_user.get("email"),
            "avatarUrl": github_user.get("avatar_url"),
        },
    }
'''





# Löscht die OAuth- und Session-Cookies, um den Benutzer abzumelden oder die Sitzung zurückzusetzen
@router.post("/dev/reset-cookies")
async def reset_cookies(response: Response):

    response.delete_cookie(
        key="github_oauth_state",
        path="/",
    )

    response.delete_cookie(
        key="session_id",
        path="/",
    )

    return {
        "message": "OAuth- und Session-Cookies wurden gelöscht."
    }


@router.get("/me")
async def get_current_user(
    request: Request,
    database: Session = Depends(get_db),
):
    session_token = request.cookies.get("session_id")

    if not session_token:
        raise HTTPException(
            status_code=401,
            detail="Nicht authentifiziert.",
        )

    user = get_user_from_session_token(
        database=database,
        raw_token=session_token,
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Session ist ungültig oder abgelaufen.",
        )

    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "githubLogin": user.github_login,
            "name": user.name,
            "avatarUrl": user.avatar_url,
        },
    }