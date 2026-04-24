from app.dependencies.auth import create_access_token, verify_admin_token
from app.models import User
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# This sets up the bcrypt hashing algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(password: str) :
    return pwd_context.hash(password)
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# dependencies functions


def user_login(db: Session, email: str, password: str):

    user = db.query(User).filter(User.email == email).first()

    # 2. Verify existence and check password using the verify function
    if not user or not verify_password(password, user.password_hash):
        # We raise an actual Exception so FastAPI sends a REAL 401 status code
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Create token (putting email in "sub")
    # This is where the "sub" key is linked to the email for the decoder
    access_token = create_access_token(data={"sub": user.email})

    return {
        "token": access_token,
        "token_type": "bearer",
        "message": "Successful login"
    }
def user_signup(db: Session, email: str, password: str):

    # We query the User model, filter by the email, and grab the first result.
    existing_user = db.query(User).filter(User.email == email).first()

    # 2. If it exists, STOP and throw the error.
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already exists.")

    # 3. If no, create a new user object
    new_user = User(
        email=email,
        password_hash=get_password_hash(password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # This grabs the newly created database ID for the user
    return {"message": "User successfully created", "email": email}
