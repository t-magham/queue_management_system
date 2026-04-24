from fastapi import FastAPI
from app.api import api_router
from fastapi.middleware.cors import CORSMiddleware

from app.core import settings

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins= settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)

