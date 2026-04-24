# authentication
from datetime import timedelta, datetime, timezone
from fastapi import HTTPException, status, Depends
from jwt import ExpiredSignatureError
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
import jwt
from app.core import settings
from app.models import User
from app.db.deps import get_db

# This automatically extracts the token from "Authorization: Bearer <token>"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# user get info called after login claim
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Validates token and fetches the user from DB.
    """
    print("get_current_user")
    payload = verify_admin_token(token)
    email = payload.get("sub")

    # Check if user exists in DB
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    print("get_current_user finished")
    return user

def create_access_token(data: dict):
    to_encode = data.copy()
    # token to expire after 24 hours
    expire = datetime.now(timezone.utc) + timedelta(hours=3)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_admin_token(token: str):
    """
       Validates and decodes the JWT. Returns the payload (dict) or raises an error.
       """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# guest verification part

def create_guest_token(entry_id: int, queue_id: int, join_number: int) -> str:
    return create_access_token({
        "sub": "guest",
        "entry_id": entry_id,
        "queue_id": queue_id,
        "join_number": join_number,
    })
def get_expired_guest_entry(token: str):
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
    entry_id = payload.get("entry_id")
    return entry_id

def verify_guest_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("sub") != "guest":
            raise HTTPException(status_code=403, detail="Not a guest token")
        return payload
    except ExpiredSignatureError:
        raise  # let it bubble up — caller handles cleanup
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Guest token invalid")
def get_current_guest(token: str = Depends(oauth2_scheme)) -> dict:
    return verify_guest_token(token)