from fastapi import APIRouter, HTTPException, Depends, Response, Request, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import Dict, Optional
from db.auth_repository import AuthRepository, REFRESH_SECRET_KEY, ALGORITHM, SECRET_KEY
from db.user_repository import UserRepository
from models.auth import Token, User, UserResponse  # Import the Token model
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from fastapi import Form
import base64

router = APIRouter()
auth_repo = AuthRepository()
user_repo = UserRepository()

@router.post("/register", response_model=Dict[str, str], status_code=201)
async def register_user(
    response: Response,
    first_name: str = Form(...),
    last_name: str = Form(...),
    username: EmailStr = Form(...),
    password: str = Form(...)
) -> Dict[str, str]:
    """Endpoint to register a new user."""
    try:
        # Hash the password
        hashed_password = auth_repo.hash_password(password)
        
        # Create the user dictionary
        user_data = {
            "first_name": first_name,
            "last_name": last_name,
            "email": username,
            "password": hashed_password
        }
        
        # Call the repository method to create a user
        user_id = user_repo.create_user(user_data)

        # Fetch the created user from the database
        created_user = user_repo.get_user_by_id(user_id)
        if not created_user:
            raise HTTPException(status_code=500, detail="Failed to retrieve the created user")

        # Convert ObjectId to string
        user_id_str = str(created_user["_id"])

        # Generate access and refresh tokens
        access_token = auth_repo.create_access_token(data={"sub": created_user["email"], "_id": user_id_str})
        refresh_token = auth_repo.create_refresh_token(data={"sub": created_user["email"], "_id": user_id_str})

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
        user = user_repo.get_user_by_email(form_data.username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify password
        if not auth_repo.verify_password(form_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate access and refresh tokens
        access_token = auth_repo.create_access_token(data={"sub": user["email"], "_id": str(user["_id"])})
        refresh_token = auth_repo.create_refresh_token(data={"sub": user["email"], "_id": str(user["_id"])})
        
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
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        user = user_repo.get_user_by_email(email)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate new access token
        access_token = auth_repo.create_access_token(data={"sub": email, "_id": str(user["_id"])})
        
        # Optionally, generate a new refresh token
        new_refresh_token = auth_repo.create_refresh_token(data={"sub": email, "_id": str(user["_id"])})
        
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

@router.get("/current_user", response_model=Dict[str, str])
async def get_current_user(request: Request) -> Dict[str, str]:
    try:
        token = request.cookies.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Token not found")
        decode_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {key: str(value) for key, value in decode_token.items()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: str) -> UserResponse:
    """
    Endpoint to get user data by ID.
    Returns user data if found, or raises an HTTPException if the user is not found.
    """
    try:
        # Call the repository method to retrieve the user by ID
        user = user_repo.get_user_by_id(user_id)
        
        # Handle case where the user is not found
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Remove password from the response
        user.pop('password', None)  # This will remove the 'password' key if it exists
        
        # Handle the profile field (binary data)
        if user.get('profile'):
            # Convert binary data to a Base64 string
            user['profile'] = base64.b64encode(user['profile']).decode('utf-8')
        
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while retrieving the user")


@router.patch("/user/{user_id}", response_model=Dict[str, str])
async def update_user(
    user_id: str, 
    first_name: Optional[str] = Form(None),  # Make first_name optional
    last_name: Optional[str] = Form(None),   # Make last_name optional
    password: Optional[str] = Form(None),    # Make password optional
    profile: Optional[UploadFile] = File(None)  # Use UploadFile for profile image
) -> Dict[str, str]:
    """
    Endpoint to partially update user data by ID.
    Returns a success message if the update is successful, or raises an HTTPException if the user is not found.
    The email cannot be changed through this endpoint.
    """
    try:
        # Convert the update fields, ensuring email is not included
        update_fields = {}

        # Only add the fields that were provided
        if first_name is not None:
            update_fields["first_name"] = first_name
        if last_name is not None:
            update_fields["last_name"] = last_name
        if password is not None:
            update_fields["password"] = password
        
        if profile is not None:
            # Read the profile image as bytes
            profile_content = await profile.read()  # Get file content as bytes

            # Store the profile image content (bytes) in the database
            update_fields["profile"] = profile_content  # Store in the 'profile' field as bytes

        # Call the repository method to update the user
        updated_count = user_repo.update_user(user_id, update_fields)
        
        # Handle case where the user is not found
        if updated_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while updating the user")



@router.delete("/user/{user_id}", response_model=Dict[str, str])
async def delete_user(user_id: str) -> Dict[str, str]:
    """
    Endpoint to delete a user by ID.
    Returns a success message or raises an HTTPException if the user is not found.
    """
    try:
        deleted_count = user_repo.delete_user(user_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
