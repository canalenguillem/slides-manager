import asyncio
import hashlib
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 8.0
_MAX_CONCURRENT = 4
_UNSPLASH_API = "https://api.unsplash.com/photos/random"


def _picsum_url(query: str) -> str:
    seed = hashlib.md5(query.encode()).hexdigest()[:12]
    return f"https://picsum.photos/seed/{seed}/1920/1080"


async def _fetch_unsplash_api(query: str, api_key: str, client: httpx.AsyncClient) -> str | None:
    if not api_key:
        return None
    try:
        response = await client.get(
            _UNSPLASH_API,
            params={"query": query, "orientation": "landscape", "client_id": api_key},
            timeout=_TIMEOUT,
        )
        if response.status_code == 200:
            return response.json().get("urls", {}).get("regular")
    except Exception as exc:
        logger.warning("Unsplash API failed for '%s': %s", query, exc)
    return None


async def _resolve_picsum(query: str, client: httpx.AsyncClient) -> str:
    source = _picsum_url(query)
    try:
        r = await client.get(source, follow_redirects=True, timeout=_TIMEOUT)
        if r.status_code == 200:
            return str(r.url)
    except Exception as exc:
        logger.warning("Picsum resolve failed for '%s': %s", query, exc)
    return source


async def _resolve_image(query: str, api_key: str, client: httpx.AsyncClient) -> str:
    url = await _fetch_unsplash_api(query, api_key, client)
    return url or await _resolve_picsum(query, client)


async def enrich_slides_with_images(
    slides: list[dict[str, Any]],
    unsplash_api_key: str = "",
) -> list[dict[str, Any]]:
    semaphore = asyncio.Semaphore(_MAX_CONCURRENT)

    async def fetch_one(slide: dict[str, Any]) -> dict[str, Any]:
        query = slide.get("image_query") or slide.get("title") or "abstract"
        async with semaphore:
            async with httpx.AsyncClient() as client:
                url = await _resolve_image(query, unsplash_api_key, client)
        return {**slide, "image_url": url}

    return list(await asyncio.gather(*[fetch_one(s) for s in slides]))
