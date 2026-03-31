import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from bson import ObjectId
from app.database import get_db, get_mongo
from app.models.user import User
from app.models.presentation import Presentation
from app.schemas.presentation import PresentationResponse, PresentationDetail
from app.services.auth import get_current_user
from app.services.markdown_parser import parse_markdown_to_slides

router = APIRouter()


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

    slides = parse_markdown_to_slides(markdown_text)

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
