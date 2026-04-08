from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SlideContent(BaseModel):
    type: str  # bullet | text | heading2 | heading3 | numbered
    text: str


class Slide(BaseModel):
    index: int
    title: str
    content: list[SlideContent]
    type: str  # title | content
    raw: str
    image_query: Optional[str] = None
    image_url: Optional[str] = None


class SlideStyle(BaseModel):
    text_color: Optional[str] = None       # hex e.g. "#ffffff"
    bold: Optional[bool] = None
    italic: Optional[bool] = None
    overlay_color: Optional[str] = None    # hex e.g. "#000000"
    overlay_opacity: Optional[int] = None  # 0-100


class SlideUpdate(BaseModel):
    title: str
    content: list[SlideContent]
    style: Optional[SlideStyle] = None


class GenerateImagesRequest(BaseModel):
    provider: str = "leonardo"   # "leonardo" | "unsplash"
    model: str = "gpt-image-1.5"


class GenerateSlideImageRequest(BaseModel):
    provider: str = "leonardo"   # "leonardo" | "unsplash"
    model: str = "gpt-image-1.5"
    prompt: Optional[str] = None  # if set, skips OpenAI and uses this prompt directly


class PresentationResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    slide_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PresentationDetail(PresentationResponse):
    slides: list[Slide] = []
