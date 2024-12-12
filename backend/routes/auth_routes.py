from fastapi import APIRouter, HTTPException, Depends, Response, Request
from pydantic import BaseModel
from typing import Dict, Any
from db.auth_repository import AuthRepository, REFRESH_SECRET_KEY, ALGORITHM 
from db.user_repository import UserRepository
from models.auth import AuthResponse, User, Token, TokenData  # Import the Token model
from fastapi.security import OAuth2PasswordRequestForm
from dependencies.auth import get_current_user  # Import the get_current_user function
from jose import JWTError, jwt

router = APIRouter()
auth_repo = AuthRepository()
user_repo = UserRepository()

@router.post("/register", response_model=Dict[str, str], status_code=201)
async def register_user(response: Response, user: User) -> Dict[str, str]:
    """Endpoint to register a new user."""
    try:
        
        hashed_password = auth_repo.hash_password(user.password)
        user_data = user.dict()
        user_data["password"] = hashed_password
        user_id = user_repo.create_user(user_data)
        
        # Fetch the created user from the database
        created_user = user_repo.get_user_by_id(user_id)
        if not created_user:
            raise HTTPException(status_code=500, detail="Failed to retrieve the created user")
        
        # Generate access and refresh tokens
        access_token = auth_repo.create_access_token(data={"sub": created_user["username"]})
        refresh_token = auth_repo.create_refresh_token(data={"sub": created_user["username"]})
        
        # Set the access and refresh tokens as HTTP-only cookies
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="Strict")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="Strict")
        
        return {"message": "User registered successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=Dict[str, str])
async def login_user(response: Response, form_data: OAuth2PasswordRequestForm = Depends()) -> Dict[str, str]:
    """Endpoint to login and return an access token."""
    try:
        user = user_repo.get_user_by_username(form_data.username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify password
        if not auth_repo.verify_password(form_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate access and refresh tokens
        access_token = auth_repo.create_access_token(data={"sub": user["username"]})
        refresh_token = auth_repo.create_refresh_token(data={"sub": user["username"]})
        
        # Set the access and refresh tokens as HTTP-only cookies
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="Strict")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="Strict")
        
        return {"message": "User logged in successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/refresh", response_model=Token)
async def refresh_token(request: Request, response: Response) -> Token:
    """Endpoint to refresh access token using refresh token."""
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token missing")
        
        payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        user = user_repo.get_user_by_username(username)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate new access token
        access_token = auth_repo.create_access_token(data={"sub": username})
        
        # Optionally, generate a new refresh token
        new_refresh_token = auth_repo.create_refresh_token(data={"sub": username})
        
        # Set the new access and refresh tokens as HTTP-only cookies
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="Strict")
        response.set_cookie(key="refresh_token", value=new_refresh_token, httponly=True, secure=True, samesite="Strict")
        
        return Token(access_token=access_token, refresh_token=new_refresh_token, token_type="bearer")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/logout", response_model=Dict[str, str])
async def logout_user(response: Response) -> Dict[str, str]:
    """Endpoint to logout user."""
    # Invalidate the token (implementation depends on your token storage strategy)
    response.delete_cookie(key="access_token")  # Delete access token cookie
    response.delete_cookie(key="refresh_token")  # Delete refresh token cookie
    return {"message": "User logged out"}


@router.get("/user/{user_id}", response_model=User)
async def get_user(user_id: str) -> User:
    """Endpoint to get a user by ID."""
    try:
        user = user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/user/{user_id}", response_model=Dict[str, str])
async def update_user(user_id: str, update_data: User) -> Dict[str, str]:
    """Endpoint to update user data."""
    try:
        updated_count = user_repo.update_user(user_id, update_data.dict(exclude_unset=True))
        if updated_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/user/{user_id}", response_model=Dict[str, str])
async def delete_user(user_id: str) -> Dict[str, str]:
    """Endpoint to delete a user."""
    try:
        deleted_count = user_repo.delete_user(user_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
# @router.get("/protected-endpoint")
# async def protected_endpoint(current_user: dict = Depends(get_current_user)):
#     return {"message": "This is a protected endpoint", "user": current_user["username"]}