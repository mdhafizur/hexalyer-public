from pydantic import BaseModel
from typing import Optional

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        orm_mode = True
