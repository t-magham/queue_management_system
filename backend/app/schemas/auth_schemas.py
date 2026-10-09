from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    id: int
    email: str
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: str
    password: str
class SignupRequest(BaseModel):
    email: str
    password: str
    confirmPassword: str
