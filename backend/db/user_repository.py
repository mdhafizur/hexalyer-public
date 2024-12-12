from typing import Optional
from models.auth import User
from bson import ObjectId
from pymongo import ASCENDING, MongoClient
import os

client = MongoClient(os.getenv("MONGO_URI", "hexalayer"))
db = client[os.getenv("MONGO_DB", "hexalayer")]
users_collection = db["users"]

class UserRepository:

    def create_user(self, user_data: dict) -> str:
        """
        Create a new user and return the user ID.
        """
        # Check if the email already exists in the database
        existing_user = users_collection.find_one({"email": user_data["email"]})
        if existing_user:
            raise ValueError(f"Email {user_data['email']} already exists.")
        
        # Check if the username already exists in the database
        existing_user_username = users_collection.find_one({"username": user_data["username"]})
        if existing_user_username:
            raise ValueError(f"Username {user_data['username']} already exists.")
        
        result = users_collection.insert_one(user_data)
        return str(result.inserted_id)

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        Fetch user by ID.
        """
        return users_collection.find_one({"_id": ObjectId(user_id)})

    def get_user_by_username(self, username: str) -> Optional[dict]:
        """
        Fetch user by username.
        """
        return users_collection.find_one({"username": username})

    def update_user(self, user_id: str, update_data: dict) -> int:
        """
        Update user data.
        """
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )
        return result.modified_count

    def delete_user(self, user_id: str) -> int:
        """
        Delete user by ID.
        """
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count
