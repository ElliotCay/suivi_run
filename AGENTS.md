# Repository Guidelines

## Project Structure & Module Organization
- Backend lives in `backend/` (FastAPI + SQLAlchemy). Key modules: `main.py` (app entry), `routers/` (API routes), `services/` (business logic), `models.py` + `schemas.py` (DB + Pydantic). SQLite files (`*.db`) sit here for local dev.
- Frontend lives in `frontend/` (Next.js 16 + React 19 + TypeScript + Tailwind). Pages in `app/`, shared UI in `components/`, utilities in `lib/`, types in `types/`.
- Integration and unit tests currently live under `backend/tests/` and `backend/test_*.py`. Frontend relies on linting and manual verification for now.
- Assets (logos, backgrounds, moodboards) and design docs are at repo root; keep new assets in `frontend/public/` when they must be shipped to the app.

## Build, Test, and Development Commands
- Start both stacks locally: `./start.sh` (assumes `backend/venv` exists and frontend deps installed).
- Backend dev server: `cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000`.
- Backend tests: `cd backend && source venv/bin/activate && pytest` (targets `backend/tests/` and `test_*.py`).
- Frontend dev server: `cd frontend && npm run dev` (http://localhost:3000).
- Frontend build/lint: `cd frontend && npm run build` and `npm run lint`.

## Coding Style & Naming Conventions
- Python: 4-space indents, type hints where useful, keep FastAPI routers thin and push logic into `services/`. Name async handlers `*` or `*_handler`; predictable routes under `routers/` (e.g., `workouts.py`, `profile.py`).
- Pydantic/SQLAlchemy models: align field names with DB columns; prefer snake_case for fields.
- TypeScript/React: functional components with explicit props types; keep server actions and data fetching in `app/` route files, reusable UI in `components/`. Prefer PascalCase for components/files, camelCase for hooks/utilities.
- Tailwind: favor semantic grouping (`layout` -> `spacing` -> `colors` -> `state`) and extract repeated patterns into small components.
- Visual direction: align UI tone and motion with `ALLURE_DESIGN_PHILOSOPHY.md` to keep consistency across new screens and components.

## Testing Guidelines
- Backend: primary expectation is `pytest` green. Add focused unit tests in `backend/tests/` and high-value integration tests using TestClient when touching routers or services. Use descriptive test names (`test_feature_condition_expected_result`).
- Frontend: run `npm run lint` before opening a PR; add storybook-like fixtures in `components` or small preview routes when verifying UI states.
- Data safety: avoid writing to committed SQLite files; use ephemeral copies (`cp backend/database.db backend/tmp.db`) when experimenting.

## Commit & Pull Request Guidelines
- Use concise commits; prefer Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`). Keep one logical change per commit.
- PRs should include: scope summary, testing notes (`pytest`, `npm run lint`, manual steps), screenshots/gifs for UI-impacting changes, and linked issues/tasks if relevant.
- Keep migrations or data updates called out explicitly in the PR description so reviewers can run them safely.

## Security & Configuration Tips
- Do not commit secrets. Backend expects `.env` in `backend/` (e.g., `ANTHROPIC_API_KEY`); copy from `.env.example` and keep it local.
- SQLite files and `backend/server.log` should stay untracked for clean diffs. Add new generated artifacts to `.gitignore` when needed.
