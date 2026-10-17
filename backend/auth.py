"""
auth.py - Authentication Module for KaagazAI
============================================
Handles user registration, login, password hashing, and demo account management.
Stores registered users in a lightweight JSON store for persistence.
"""

import os
import json
import hashlib
import secrets
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

# Persistent users JSON file in backend directory
USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")

# Predefined Demo Account
DEMO_USER = {
    "id": "demo-user-001",
    "name": "Demo Explorer",
    "email": "demo@kaagaz.ai",
    "role": "Demo Account",
    "is_demo": True,
    "avatar_color": "from-indigo-500 to-violet-600"
}


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="Full name of the user")
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=100, description="Password (at least 6 characters)")


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_demo: bool = False
    avatar_color: Optional[str] = "from-indigo-500 to-violet-600"


class AuthResponse(BaseModel):
    success: bool
    message: str
    token: str
    user: UserProfile


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def _hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hashes password with SHA-256 and unique salt."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
    return hashed, salt


def _load_users() -> Dict[str, Any]:
    """Loads existing users from JSON file."""
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_users(users: Dict[str, Any]) -> None:
    """Saves users to JSON file."""
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
    except Exception as err:
        print(f"[AUTH] Error saving users: {err}")


def register_user(name: str, email: str, password: str) -> Dict[str, Any]:
    """
    Registers a new user account.
    Returns user dict and token if successful, or raises ValueError.
    """
    email_clean = email.strip().lower()
    users = _load_users()

    # Disallow registration under the demo email
    if email_clean == DEMO_USER["email"]:
        raise ValueError("This email is reserved for the Demo Account. Please use another email or sign in with Demo.")

    if email_clean in users:
        raise ValueError("An account with this email address already exists.")

    hashed, salt = _hash_password(password)
    user_id = f"user-{secrets.token_hex(6)}"

    new_user_data = {
        "id": user_id,
        "name": name.strip(),
        "email": email_clean,
        "password_hash": hashed,
        "salt": salt,
        "role": "Member",
        "is_demo": False,
        "created_at": secrets.token_hex(4)
    }

    users[email_clean] = new_user_data
    _save_users(users)

    token = f"kaagaz_{secrets.token_urlsafe(24)}"
    return {
        "token": token,
        "user": {
            "id": new_user_data["id"],
            "name": new_user_data["name"],
            "email": new_user_data["email"],
            "role": new_user_data["role"],
            "is_demo": False,
            "avatar_color": "from-emerald-500 to-teal-600"
        }
    }


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticates a user by email and password.
    Supports both registered users and demo account.
    """
    email_clean = email.strip().lower()

    # Demo Account Bypass
    if email_clean == DEMO_USER["email"].lower():
        # Any demo password or demo123456 / kaagaz123
        return {
            "token": f"kaagaz_demo_{secrets.token_urlsafe(16)}",
            "user": DEMO_USER
        }

    users = _load_users()
    if email_clean not in users:
        raise ValueError("Invalid email or password. Please try again or use the Demo Account.")

    user_record = users[email_clean]
    salt = user_record.get("salt", "")
    computed_hash, _ = _hash_password(password, salt)

    if computed_hash != user_record.get("password_hash"):
        raise ValueError("Invalid email or password. Please check your credentials.")

    token = f"kaagaz_{secrets.token_urlsafe(24)}"
    return {
        "token": token,
        "user": {
            "id": user_record["id"],
            "name": user_record["name"],
            "email": user_record["email"],
            "role": user_record.get("role", "Member"),
            "is_demo": False,
            "avatar_color": "from-indigo-500 to-violet-600"
        }
    }


def get_demo_account() -> Dict[str, Any]:
    """Returns the demo account token and user info directly."""
    return {
        "token": f"kaagaz_demo_{secrets.token_urlsafe(16)}",
        "user": DEMO_USER
    }
