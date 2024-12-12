from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Any, Dict
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordBearer
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

SECRET_KEY = "mysecretkey"
REFRESH_SECRET_KEY = "myrefreshsecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

class AuthRepository:
    def __init__(self):
        self.pwd_context = PasswordHasher()
        self.oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

    def create_access_token(self, data: Dict[str, Any], expires_delta: timedelta = None) -> str:
        """
        Create a JWT access token with the given data.
        """
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = data.copy()
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict[str, Any], expires_delta: timedelta = None) -> str:
        """Create a JWT refresh token with the given data."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode = data.copy()
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_password(self, plain_password, hashed_password):
        """
        Verify password against hash.
        """
        try:
            self.pwd_context.verify(hashed_password, plain_password)
            return True
        except VerifyMismatchError:
            return False

    def hash_password(self, password: str) -> str:
        """
        Hash the password using Argon2.
        """
        return self.pwd_context.hash(password)