from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    """
    Pydantic model for representing authentication tokens.
    """
    access_token: str  # The JWT access token
    refresh_token: str  # The JWT refresh token
    token_type: str  # Typically 'Bearer', defines the type of token


class User(BaseModel):
    """
    Pydantic model for representing user data.
    """
    first_name: str  # The user's first name
    last_name: str  # The user's last name
    password: str  # The user's hashed password
    email: EmailStr  # Mandatory, ensures a valid email format
    profile: Optional[bytes] = None  # Optional, defaults to None, can store user profile information

    class Config:
        from_attributes = True  # Enables compatibility with ORM objects
        
class UserResponse(BaseModel):
    _id: str
    first_name: str
    last_name: str
    email: EmailStr
    profile: Optional[bytes] = None

    class Config:
        from_attributes = True
        # If you want to exclude password in response globally:
        # exclude = {"password"}