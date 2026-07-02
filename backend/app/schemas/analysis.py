from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class SubmitRepoRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    repo_url: str = Field(
        alias="repoUrl",
        min_length=1,
        max_length=1000,
    )


class SubmitRepoResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="jobId")
    status: str


class AnalysisJobResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    job_id: str = Field(alias="jobId")
    repo_url: str = Field(alias="repoUrl")
    repository_owner: str = Field(alias="repositoryOwner")
    repository_name: str = Field(alias="repositoryName")
    status: str
    error_message: str | None = Field(
        default=None,
        alias="errorMessage",
    )
    created_at: datetime = Field(alias="createdAt")
    started_at: datetime | None = Field(
        default=None,
        alias="startedAt",
    )
    completed_at: datetime | None = Field(
        default=None,
        alias="completedAt",
    )