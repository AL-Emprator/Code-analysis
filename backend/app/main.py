from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.core.config import settings

from app.core.database import Base, engine

# Diese Imports sorgen dafür, dass SQLAlchemy die Modelle kennt.
from app.models.session import UserSession
from app.models.user import User

from app.api.analysis import router as analysis_router
from app.api.auth import router as auth_router
from app.core.database import Base, engine

from app.models.analysis_job import AnalysisJob
from app.models.analysis_file import AnalysisFile
from app.models.analysis_result import AnalysisResult
from app.models.session import UserSession
from app.models.user import User

Base.metadata.create_all(bind=engine)


app = FastAPI(title="Code Analysis Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(analysis_router)


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    html = """<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Code Analysis Platform</title>
  </head>
  <body>
    <h1>Code Analysis Platform</h1>
    <p>Welcome to the backend for the Code Analysis Platform.</p>
    <ul>
      <li><a href="/docs">Interactive API docs</a></li>
      <li><a href="/openapi.json">OpenAPI spec</a></li>
    </ul>
  </body>
</html>
"""
    return HTMLResponse(content=html)
