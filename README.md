# Queue System

A virtual queue for counters, clinics and help desks. Staff create a queue and share a 6-digit code. Guests join from their phone and watch their place in line update in real time, with no app or account needed.

[![CI](https://github.com/t-magham/queue_management_system/actions/workflows/ci.yml/badge.svg)](https://github.com/t-magham/queue_management_system/actions/workflows/ci.yml)

**Live:** [queue-management-system.pages.dev](https://queue-management-system.pages.dev)

## Features

- **For staff (admins)**
  - Create queues with an average serve time, an optional description and an optional open/close schedule.
  - Open and close a queue.
  - Call next, recall, skip, or remove people from the line.
  - See waiting count, served count and estimated wait at a glance.
- **For guests**
  - Join with a code and a display name.
  - Get a ticket number, how many people are ahead, the estimated wait, and an "it's your turn" alert.
  - Leave the line at any time.
- **Live updates**: every change is broadcast over WebSockets to the admin and to everyone in the queue.

## Tech stack

| Layer    | Tech                                                                  |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 19, React Router 7, Vite 7, Tailwind CSS 4                      |
| Backend  | FastAPI, SQLAlchemy 2, Alembic, Pydantic Settings, JWT auth           |
| Database | PostgreSQL 17 (SQLite in-memory for quick local tests)                |
| Infra    | Docker Compose, Nginx, GitHub Actions                                 |
| Hosting  | Frontend on Cloudflare Pages, backend on Render, database on Supabase |

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/routes/     # auth, queues, ws routers (mounted under /api)
│   │   ├── core/           # settings (env vars)
│   │   ├── models/         # SQLAlchemy models + status enums
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── services/       # business logic
│   │   └── main.py         # FastAPI app, CORS, health check
│   ├── alembic/            # migrations
│   ├── tests/              # pytest suite
│   ├── entrypoint.sh       # runs migrations, then uvicorn (Docker)
│   └── Procfile            # same, for Render
├── frontend/
│   ├── src/
│   │   ├── components/     # pages + shared UI (ui.jsx, AuthLayout.jsx)
│   │   ├── lib/            # small helpers
│   │   └── index.css       # Tailwind theme / design tokens
│   └── nginx.conf          # serves the SPA, proxies /api and /api/ws to the backend
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Running locally

### Option 1: Docker Compose (recommended)

This runs Postgres, the backend and the Nginx-served frontend together.

```bash
cp .env.example .env
```

Edit `.env` and set at least `POSTGRES_PASSWORD` and `SECRET_KEY`. You can generate a key with:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Then start everything:

```bash
docker compose up -d --build
```

Open [http://localhost](http://localhost). Nginx proxies `/api` (including WebSockets) to the backend, so no CORS setup is needed. Database migrations run automatically when the backend starts.

### Option 2: Run each part on its own

**Backend** (Python 3.12, needs a Postgres database):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/queue_db
SECRET_KEY=<random hex string>
ALGORITHM=HS256
CORS_ORIGINS=http://localhost:5173
```

Then:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000`. You can check it with `GET /health`. Interactive docs are at `/docs`.

**Frontend** (Node 22):

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://127.0.0.1:8000/api" > .env
npm run dev
```

The app runs on `http://localhost:5173`.

## Configuration

**Backend**

| Variable       | Required | Description                                                                                          |
| -------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | yes      | SQLAlchemy Postgres URL                                                                              |
| `SECRET_KEY`   | yes      | Signs admin and guest JWTs. Keep it secret.                                                          |
| `ALGORITHM`    | yes      | JWT algorithm, usually `HS256`                                                                       |
| `CORS_ORIGINS` | no       | Comma-separated allowed origins, e.g. `https://queue-management-system.pages.dev`. No trailing slash. |

**Frontend**

| Variable            | Description                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Backend base URL including `/api`, e.g. `https://<app>.onrender.com/api`. If unset, it falls back to `/api` on the same host. |
| `VITE_APP_NAME`     | Optional display name (default "Queue System")                                                                      |

> `VITE_*` variables are baked in at **build time**. After you change them on Cloudflare Pages, redeploy.

## API overview

All routes are under `/api`. Health is served at both `/health` and `/api/health`.

| Method | Path                                 | Auth        | Purpose                                  |
| ------ | ------------------------------------ | ----------- | ---------------------------------------- |
| POST   | `/auth/signup`                       | –           | Create an admin account                  |
| POST   | `/auth/login`                        | –           | Get an admin JWT                         |
| GET    | `/auth/me`                           | admin       | Current user                             |
| POST   | `/queues/create`                     | admin       | Create a queue                           |
| GET    | `/queues/dashboard`                  | admin       | List your queues                         |
| DELETE | `/queues/delete`                     | admin       | Delete a queue                           |
| GET    | `/queues/state/{queue_id}`           | –           | Queue, entries and stats snapshot        |
| POST   | `/queues/{open,close}/{queue_id}`    | admin       | Open or close a queue                    |
| POST   | `/queues/{call-next,recall,skip}/{queue_id}` | admin | Serve the line                         |
| DELETE | `/queues/delete-entry/{entry_id}`    | admin       | Remove someone from the line             |
| POST   | `/queues/join/{code}`                | –           | Join as a guest and get a guest JWT      |
| DELETE | `/queues/leave`                      | guest       | Leave the line                           |
| WS     | `/ws/queue/{queue_id}?token=...`     | admin/guest | Live state updates                       |

When the backend runs, the interactive docs are at `/docs`.

## Testing

```bash
cd backend
python -m pytest -q
```

By default the tests use in-memory SQLite. To run them against Postgres, as CI does, set `TEST_DATABASE_URL`:

```bash
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/queue_test python -m pytest -q
```

To lint and build the frontend:

```bash
cd frontend
npm run lint && npm run build
```

## CI/CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and on every push to `main`. It has three jobs:

1. **Backend**: runs migrations on Postgres 17, checks that models match migrations with `alembic check`, then runs `pytest`.
2. **Frontend**: runs `npm ci`, `npm run lint` and `npm run build`.
3. **Docker**: builds and starts the Compose stack, then checks `/api/health` through Nginx.

Deployment happens automatically from `main`:
- Cloudflare Pages builds the frontend, with `VITE_API_BASE_URL` set in the Pages settings.
- Render deploys the backend. Its `Procfile` runs `alembic upgrade head` before starting the app.

## License

[Apache 2.0](LICENSE)
