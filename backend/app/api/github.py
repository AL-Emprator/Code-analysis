from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.core.database import get_db

from app.services.session_service import (
    create_user_session,
    get_user_from_session_token,
)


router = APIRouter(prefix="/api/github", tags=["github"])


class GitHubRepositoryResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    name: str
    full_name: str = Field(alias="fullName")
    html_url: str = Field(alias="htmlUrl")
    description: str | None = None
    private: bool
    fork: bool
    language: str | None = None
    updated_at: datetime | None = Field(default=None, alias="updatedAt")


class GitHubRepositoriesResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    repositories: list[GitHubRepositoryResponse]


def get_current_user_from_request(
    request: Request,
    database: Session,
):
    session_token = request.cookies.get("session_id")

    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Du musst angemeldet sein.",
        )

    current_user = get_user_from_session_token(
        database=database,
        raw_token=session_token,
    )

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Die Session ist ungültig oder abgelaufen.",
        )

    return current_user


@router.get("/repositories", response_model=GitHubRepositoriesResponse)
async def get_github_repositories(
    request: Request,
    database: Session = Depends(get_db),
):
    current_user = get_current_user_from_request(
        request=request,
        database=database,
    )

    if not current_user.github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Für diesen Benutzer wurde kein GitHub Access Token gespeichert.",
        )

    headers = {
        "Authorization": f"Bearer {current_user.github_access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    params: dict[str, Any] = {
        "visibility": "all",
        "affiliation": "owner,collaborator,organization_member",
        "sort": "updated",
        "direction": "desc",
        "per_page": 100,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                "https://api.github.com/user/repos",
                headers=headers,
                params=params,
            )

        if response.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub Token ist ungültig oder abgelaufen. Bitte neu anmelden.",
            )

        if response.status_code == 403:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="GitHub Zugriff wurde verweigert. Prüfe OAuth Scopes.",
            )

        response.raise_for_status()

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API Fehler: {error.response.status_code}",
        ) from error

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Kommunikation mit GitHub ist fehlgeschlagen.",
        ) from error

    github_repositories = response.json()

    repositories = [
        GitHubRepositoryResponse(
            id=repository["id"],
            name=repository["name"],
            fullName=repository["full_name"],
            htmlUrl=repository["html_url"],
            description=repository.get("description"),
            private=repository["private"],
            fork=repository["fork"],
            language=repository.get("language"),
            updatedAt=repository.get("updated_at"),
        )
        for repository in github_repositories
    ]

    return GitHubRepositoriesResponse(
        repositories=repositories,
    )