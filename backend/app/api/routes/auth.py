from app.schemas import auth_schemas
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.dependencies.auth import oauth2_scheme
from app.db.deps import get_db
from app.schemas.auth_schemas import UserResponse
from app.services import auth_services
from app.models import User
from app.dependencies.auth import get_current_user

auth_router = APIRouter()

# API Endpoints
@auth_router.get("/me", response_model=UserResponse)
def read_users_me(cur_user: User = Depends(get_current_user)):
    return cur_user

@auth_router.post("/login")
def user_login_endpoint(payload: auth_schemas.LoginRequest, db: Session = Depends(get_db)):
    print(payload.email)
    return auth_services.user_login(db, payload.email, payload.password)
@auth_router.post("/signup")
def user_signup_endpoint(payload: auth_schemas.SignupRequest, db: Session = Depends(get_db)):
    return auth_services.user_signup(db, payload.email, payload.password)