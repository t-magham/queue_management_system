from fastapi import FastAPI, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.api import api_router
from fastapi.middleware.cors import CORSMiddleware
from app.db.deps import get_db

from app.core import settings
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Queue Management System API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        # don't leak connection details (host, user) in a public endpoint
        logger.exception("Health check DB query failed")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "database": "disconnected"},
        )

# FastAPI: add one prefix at the top level
app.include_router(api_router, prefix="/api")
# endpoints become /api/queues, /api/auth, /api/ws

