The workflow should be split into two phases: authenticate first, then submit the repo only after auth is confirmed. Right now [frontend/app/page.tsx](c:/Users/suleiman/Desktop/code-platform/frontend/app/page.tsx) mixes those steps, and [frontend/lib/api.ts](c:/Users/suleiman/Desktop/code-platform/frontend/lib/api.ts) already exposes the API hooks you need, while [backend/app/main.py](c:/Users/suleiman/Desktop/code-platform/backend/app/main.py) is still just a minimal FastAPI shell.

1. Keep `handleGithubOAuth` as a pure OAuth starter.
   It should call `startGithubOAuth()`, redirect the browser to the returned GitHub URL, and stop there. No repo submission happens in that click path.

2. Make auth completion the only gate for submission.
   After login/register succeeds, or after the GitHub OAuth callback finishes, store or receive the auth proof the backend uses, then call `submitRepo({ repoUrl })`.

3. Add the missing OAuth completion path.
   If GitHub redirects back to the frontend, add a callback page/handler that finalizes auth before allowing submission. If the backend completes the callback, the frontend should just refresh auth state and continue.

4. Update `submitRepo` to send authenticated requests.
   The submission request should include whatever the backend expects for auth, whether that is a bearer token or credentialed cookie-based fetch.

5. Implement the backend contract behind the frontend.
   Add auth/login/register, GitHub OAuth start and callback, and `POST /api/analysis/submit` so the analysis endpoint validates auth and returns a `jobId`.

I saved this as the working plan in [/memories/session/plan.md](/memories/session/plan.md). If you want, I can turn this into an implementation checklist next, or start coding it once you approve the flow.