from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.api_key import ProviderEnum


class APIKeyCreate(BaseModel):
    provider: ProviderEnum
    key: str


class APIKeyResponse(BaseModel):
    id: str
    provider: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class APIKeyUpdate(BaseModel):
    key: Optional[str] = None
    is_active: Optional[bool] = None
