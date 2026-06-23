from pydantic import BaseModel

# Response model for the GitHub OAuth start endpoint
class GithubOAuthStartResponse(BaseModel):
    url: str
   

