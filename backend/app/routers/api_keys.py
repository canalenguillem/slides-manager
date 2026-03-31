from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.api_key import APIKey, ProviderEnum
from app.schemas.api_key import APIKeyCreate, APIKeyResponse, APIKeyUpdate
from app.services.auth import get_current_user
from app.services.encryption import encrypt_api_key, decrypt_api_key

router = APIRouter()


@router.post("/", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def save_api_key(
    data: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == current_user.id,
            APIKey.provider == data.provider,
        )
    )
    existing = result.scalar_one_or_none()
    encrypted = encrypt_api_key(data.key)

    if existing:
        existing.encrypted_key = encrypted
        existing.is_active = True
        await db.commit()
        await db.refresh(existing)
        return existing

    api_key = APIKey(
        user_id=current_user.id,
        provider=data.provider,
        encrypted_key=encrypted,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return api_key


@router.get("/", response_model=list[APIKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == current_user.id)
    )
    return result.scalars().all()


@router.put("/{provider}", response_model=APIKeyResponse)
async def update_api_key(
    provider: ProviderEnum,
    data: APIKeyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == current_user.id,
            APIKey.provider == provider,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    if data.key is not None:
        api_key.encrypted_key = encrypt_api_key(data.key)
    if data.is_active is not None:
        api_key.is_active = data.is_active

    await db.commit()
    await db.refresh(api_key)
    return api_key


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    provider: ProviderEnum,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == current_user.id,
            APIKey.provider == provider,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    await db.delete(api_key)
    await db.commit()


@router.post("/{provider}/validate")
async def validate_api_key(
    provider: ProviderEnum,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == current_user.id,
            APIKey.provider == provider,
            APIKey.is_active == True,  # noqa: E712
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found or inactive")

    decrypted = decrypt_api_key(api_key.encrypted_key)
    is_valid = bool(decrypted and len(decrypted) > 10)

    return {
        "provider": provider,
        "valid": is_valid,
        "message": "Key format valid" if is_valid else "Invalid key format",
    }
