# an aggregator
from app.api.routes.queues import queue_router
from app.api.routes.auth import auth_router
from fastapi import APIRouter
from app.api.routes.ws import ws_router

api_router = APIRouter()

api_router.include_router(queue_router, prefix="/queues")
api_router.include_router(auth_router, prefix="/auth")

api_router.include_router(ws_router, prefix="/ws")