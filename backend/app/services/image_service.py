import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_UNSPLASH_SOURCE = "https://source.unsplash.com/1920x1080/?"
_REQUEST_TIMEOUT = 6.0
_MAX_CONCURRENT = 4  # avoid hammering the API


async def _fetch_unsplash_url(query: str, client: httpx.AsyncClient) -> str | None:
    """
    Follow the Unsplash source redirect and return the resolved CDN URL.
    Does NOT download the image body — just captures the Location header.
    """
    try:
        url = f"{_UNSPLASH_SOURCE}{httpx.QueryParams({'': query}).value.lstrip('=')}"
        # Build URL manually to keep '+' encoding
        encoded = query.replace(' ', '+')
        source_url = f"{_UNSPLASH_SOURCE}{encoded}"

        response = await client.get(
            source_url,
            follow_redirects=False,
            timeout=_REQUEST_TIMEOUT,
        )
        if response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get("location")
            if location and "images.unsplash.com" in location:
                return location
    except Exception as exc:
        logger.warning("Unsplash fetch failed for query '%s': %s", query, exc)
    return None


async def enrich_slides_with_images(slides: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Fetch an Unsplash image URL for each slide in parallel and store it as image_url.
    Slides without a resolved image keep image_url=None (frontend uses gradient fallback).
    """
    semaphore = asyncio.Semaphore(_MAX_CONCURRENT)

    async def fetch_one(slide: dict[str, Any]) -> dict[str, Any]:
        query = slide.get("image_query") or slide.get("title") or "abstract"
        async with semaphore:
            async with httpx.AsyncClient() as client:
                url = await _fetch_unsplash_url(query, client)
        return {**slide, "image_url": url}

    enriched = await asyncio.gather(*[fetch_one(s) for s in slides])
    return list(enriched)
