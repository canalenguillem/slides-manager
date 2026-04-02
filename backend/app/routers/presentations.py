import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from bson import ObjectId
from app.database import get_db, get_mongo
from app.models.user import User
from app.models.api_key import APIKey, ProviderEnum
from app.models.presentation import Presentation
from app.schemas.presentation import PresentationResponse, PresentationDetail
from app.services.auth import get_current_user
from app.services.encryption import decrypt_api_key
from app.services.markdown_parser import parse_markdown_to_slides
from app.services.image_service import enrich_slides_with_images

router = APIRouter()


async def _get_api_key(provider: ProviderEnum, user_id: str, db: AsyncSession) -> str:
    """Return the user's active API key for a provider (decrypted), or empty string."""
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == user_id,
            APIKey.provider == provider,
            APIKey.is_active == True,  # noqa: E712
        )
    )
    key_row = result.scalar_one_or_none()
    if key_row:
        try:
            return decrypt_api_key(key_row.encrypted_key)
        except Exception:
            pass
    return ""


@router.post(
    "/upload",
    response_model=PresentationDetail,
    status_code=status.HTTP_201_CREATED,
)
async def upload_presentation(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    mongo=Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="Only .md files are accepted")

    raw_bytes = await file.read()
    try:
        markdown_text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")

    raw_slides = parse_markdown_to_slides(markdown_text)
    openai_key = await _get_api_key(ProviderEnum.openai, current_user.id, db)
    leonardo_key = await _get_api_key(ProviderEnum.leonardo, current_user.id, db)
    unsplash_key = await _get_api_key(ProviderEnum.unsplash, current_user.id, db)
    slides = await enrich_slides_with_images(
        raw_slides,
        openai_api_key=openai_key,
        leonardo_api_key=leonardo_key,
        unsplash_api_key=unsplash_key,
    )

    mongo_doc = {
        "user_id": current_user.id,
        "title": title,
        "raw_markdown": markdown_text,
        "slides": slides,
        "metadata": {
            "total_slides": len(slides),
            "created_at": datetime.datetime.utcnow(),
            "version": 1,
        },
    }
    result = await mongo["presentations"].insert_one(mongo_doc)
    mongo_id = str(result.inserted_id)

    presentation = Presentation(
        user_id=current_user.id,
        title=title,
        description=description,
        slide_count=len(slides),
        mongo_doc_id=mongo_id,
    )
    db.add(presentation)
    await db.commit()
    await db.refresh(presentation)

    return PresentationDetail(
        id=presentation.id,
        title=presentation.title,
        description=presentation.description,
        slide_count=presentation.slide_count,
        created_at=presentation.created_at,
        updated_at=presentation.updated_at,
        slides=slides,
    )


@router.get("/", response_model=list[PresentationResponse])
async def list_presentations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Presentation)
        .where(Presentation.user_id == current_user.id)
        .order_by(Presentation.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{presentation_id}", response_model=PresentationDetail)
async def get_presentation(
    presentation_id: str,
    db: AsyncSession = Depends(get_db),
    mongo=Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Presentation).where(
            Presentation.id == presentation_id,
            Presentation.user_id == current_user.id,
        )
    )
    presentation = result.scalar_one_or_none()
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    slides = []
    if presentation.mongo_doc_id:
        mongo_doc = await mongo["presentations"].find_one(
            {"_id": ObjectId(presentation.mongo_doc_id)}
        )
        if mongo_doc:
            slides = mongo_doc.get("slides", [])

    return PresentationDetail(
        id=presentation.id,
        title=presentation.title,
        description=presentation.description,
        slide_count=presentation.slide_count,
        created_at=presentation.created_at,
        updated_at=presentation.updated_at,
        slides=slides,
    )


@router.post("/{presentation_id}/generate-images", response_model=PresentationDetail)
async def generate_images(
    presentation_id: str,
    db: AsyncSession = Depends(get_db),
    mongo=Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Presentation).where(
            Presentation.id == presentation_id,
            Presentation.user_id == current_user.id,
        )
    )
    presentation = result.scalar_one_or_none()
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    if not presentation.mongo_doc_id:
        raise HTTPException(status_code=400, detail="No slide data found")

    mongo_doc = await mongo["presentations"].find_one(
        {"_id": ObjectId(presentation.mongo_doc_id)}
    )
    if not mongo_doc:
        raise HTTPException(status_code=404, detail="Slide data not found")

    current_slides = mongo_doc.get("slides", [])
    openai_key = await _get_api_key(ProviderEnum.openai, current_user.id, db)
    leonardo_key = await _get_api_key(ProviderEnum.leonardo, current_user.id, db)
    unsplash_key = await _get_api_key(ProviderEnum.unsplash, current_user.id, db)
    enriched_slides = await enrich_slides_with_images(
        current_slides,
        openai_api_key=openai_key,
        leonardo_api_key=leonardo_key,
        unsplash_api_key=unsplash_key,
    )

    await mongo["presentations"].update_one(
        {"_id": ObjectId(presentation.mongo_doc_id)},
        {"$set": {"slides": enriched_slides}},
    )

    return PresentationDetail(
        id=presentation.id,
        title=presentation.title,
        description=presentation.description,
        slide_count=presentation.slide_count,
        created_at=presentation.created_at,
        updated_at=presentation.updated_at,
        slides=enriched_slides,
    )


@router.delete("/{presentation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presentation(
    presentation_id: str,
    db: AsyncSession = Depends(get_db),
    mongo=Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Presentation).where(
            Presentation.id == presentation_id,
            Presentation.user_id == current_user.id,
        )
    )
    presentation = result.scalar_one_or_none()
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    if presentation.mongo_doc_id:
        await mongo["presentations"].delete_one(
            {"_id": ObjectId(presentation.mongo_doc_id)}
        )

    await db.delete(presentation)
    await db.commit()
