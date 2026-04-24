from pydantic import BaseModel

class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str
class SignupRequest(BaseModel):
    email: str
    password: str
    confirmPassword: str
