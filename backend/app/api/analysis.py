import secrets
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analysis_job import AnalysisJob

from app.schemas.analysis import (
    AnalysisJobResponse,
    SubmitRepoRequest,
    SubmitRepoResponse,
)


from app.services.session_service import get_user_from_session_token
from sqlalchemy import select



router = APIRouter(
    prefix="/api/analysis",
    tags=["analysis"],
)


#parse_github_repository_url 
def parse_github_repository_url(repo_url: str) -> tuple[str, str, str]:
    normalized_url = repo_url.strip()

    parsed_url = urlparse(normalized_url)

    if parsed_url.scheme != "https":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Die Repository-URL muss HTTPS verwenden.",
        )

    if parsed_url.hostname not in {"github.com", "www.github.com"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Es werden nur GitHub-Repositorys unterstützt.",
        )

    path_parts = [
        part
        for part in parsed_url.path.strip("/").split("/")
        if part
    ]

    if len(path_parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Die Repository-URL muss das Format "
                "https://github.com/owner/repository haben."
            ),
        )

    owner, repository_name = path_parts

    if repository_name.endswith(".git"):
        repository_name = repository_name[:-4]

    if not owner or not repository_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Owner oder Repository-Name fehlt.",
        )

    canonical_url = (
        f"https://github.com/{owner}/{repository_name}"
    )

    return canonical_url, owner, repository_name


@router.post(
    "/submit",
    response_model=SubmitRepoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_repository(
    payload: SubmitRepoRequest,
    request: Request,
    database: Session = Depends(get_db),
): 


    session_token = request.cookies.get("session_id")
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Du musst angemeldet sein.",
        )

    current_user  = get_user_from_session_token(
        database=database,   raw_token=session_token,)

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Die Session ist ungültig oder abgelaufen.",
        )

    canonical_url, owner, repository_name = (
    parse_github_repository_url(payload.repo_url))

    job_id = f"job_{secrets.token_urlsafe(16)}"

    analysis_job = AnalysisJob(
        id=job_id,
        user_id=current_user.id,
        repo_url=canonical_url,
        repository_owner=owner,
        repository_name=repository_name,
        status="queued",
    )

    try:
        database.add(analysis_job)
        database.commit()
        database.refresh(analysis_job)
    except Exception:
        database.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Der Analyse-Job konnte nicht erstellt werden.",
        )

    return SubmitRepoResponse(
        jobId=analysis_job.id,
        status=analysis_job.status,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=AnalysisJobResponse,
)

async def get_analysis_job(
    job_id: str,
    request: Request,
    database: Session = Depends(get_db),
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


    statement = select(AnalysisJob).where(
        AnalysisJob.id == job_id,
        AnalysisJob.user_id == current_user.id,
    )

    analysis_job = database.scalar(statement)

    if analysis_job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analyse-Job wurde nicht gefunden.",
        )
    
    return AnalysisJobResponse(
        jobId=analysis_job.id,
        repoUrl=analysis_job.repo_url,
        repositoryOwner=analysis_job.repository_owner,
        repositoryName=analysis_job.repository_name,
        status=analysis_job.status,
        errorMessage=analysis_job.error_message,
        createdAt=analysis_job.created_at,
        startedAt=analysis_job.started_at,
        completedAt=analysis_job.completed_at,
    )