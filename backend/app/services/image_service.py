import asyncio
import hashlib
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 8.0
_MAX_CONCURRENT = 4
_UNSPLASH_API = "https://api.unsplash.com/photos/random"


def _picsum_url(query: str) -> str:
    """
    Deterministic Picsum image based on query hash.
    Always works, no API key needed, consistent per slide topic.
    """
    seed = hashlib.md5(query.encode()).hexdigest()[:12]
    return f"https://picsum.photos/seed/{seed}/1920/1080"


async def _fetch_unsplash_api(query: str, client: httpx.AsyncClient) -> str | None:
    """Fetch a keyword-relevant image URL via the official Unsplash API."""
    if not settings.UNSPLASH_ACCESS_KEY:
        return None
    try:
        response = await client.get(
            _UNSPLASH_API,
            params={
                "query": query,
                "orientation": "landscape",
                "client_id": settings.UNSPLASH_ACCESS_KEY,
            },
            timeout=_TIMEOUT,
        )
        if response.status_code == 200:
            data = response.json()
            url = data.get("urls", {}).get("regular")
            if url:
                return url
    except Exception as exc:
        logger.warning("Unsplash API failed for '%s': %s", query, exc)
    return None


async def _resolve_picsum(query: str, client: httpx.AsyncClient) -> str:
    """Follow the Picsum redirect to get the final Fastly CDN URL."""
    source = _picsum_url(query)
    try:
        r = await client.get(source, follow_redirects=True, timeout=_TIMEOUT)
        if r.status_code == 200:
            return str(r.url)
    except Exception as exc:
        logger.warning("Picsum resolve failed for '%s': %s", query, exc)
    return source  # return seed URL as fallback — browser handles redirect


async def _resolve_image(query: str, client: httpx.AsyncClient) -> str:
    """
    Try Unsplash API first (if key configured), fall back to Picsum.
    Always returns a valid image URL.
    """
    unsplash_url = await _fetch_unsplash_api(query, client)
    if unsplash_url:
        return unsplash_url
    return await _resolve_picsum(query, client)


async def enrich_slides_with_images(slides: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Attach an image_url to every slide.
    Runs in parallel (max 4 concurrent) to keep upload latency low.
    """
    semaphore = asyncio.Semaphore(_MAX_CONCURRENT)

    async def fetch_one(slide: dict[str, Any]) -> dict[str, Any]:
        query = slide.get("image_query") or slide.get("title") or "abstract"
        async with semaphore:
            async with httpx.AsyncClient() as client:
                url = await _resolve_image(query, client)
        return {**slide, "image_url": url}

    enriched = await asyncio.gather(*[fetch_one(s) for s in slides])
    return list(enriched)
