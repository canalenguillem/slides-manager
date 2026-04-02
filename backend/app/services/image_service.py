import asyncio
import hashlib
import logging
from typing import Any

import httpx

from app.services.markdown_parser import _generate_image_query

logger = logging.getLogger(__name__)

_TIMEOUT = 15.0
_OPENAI_CHAT = "https://api.openai.com/v1/chat/completions"
_LEONARDO_GENERATIONS = "https://cloud.leonardo.ai/api/rest/v1/generations"
_UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos"
# Leonardo Phoenix model — fast, high quality, great for backgrounds
_LEONARDO_MODEL_ID = "6b645e3a-d64f-4341-a6d8-7a3690fbf042"

_SYSTEM_PROMPT = (
    "You are a professional presentation designer. "
    "Given a slide title and its bullet points, write a short image generation prompt "
    "(max 40 words) for a full-screen slide background. "
    "The image must be abstract or conceptual, photorealistic, cinematic lighting, "
    "no text, no human faces. Only output the prompt, nothing else."
)


# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _openai_image_prompt(
    title: str, content: list[dict], api_key: str, client: httpx.AsyncClient
) -> str | None:
    bullets = " / ".join(item["text"] for item in content[:5] if item.get("text"))
    user_msg = f"Slide title: {title}" + (f"\nBullets: {bullets}" if bullets else "")
    try:
        r = await client.post(
            _OPENAI_CHAT,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "max_tokens": 80,
                "temperature": 0.7,
            },
            timeout=_TIMEOUT,
        )
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"].strip()
        logger.warning("OpenAI returned %s: %s", r.status_code, r.text[:200])
    except Exception as exc:
        logger.warning("OpenAI failed for '%s': %s", title, exc)
    return None


# ── Leonardo ──────────────────────────────────────────────────────────────────

async def _leonardo_start(prompt: str, api_key: str, client: httpx.AsyncClient) -> str | None:
    try:
        r = await client.post(
            _LEONARDO_GENERATIONS,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "prompt": prompt,
                "modelId": _LEONARDO_MODEL_ID,
                "width": 1472,
                "height": 832,
                "num_images": 1,
                "public": False,
            },
            timeout=30.0,
        )
        if r.status_code == 200:
            return r.json()["sdGenerationJob"]["generationId"]
        logger.warning("Leonardo start returned %s: %s", r.status_code, r.text[:200])
    except Exception as exc:
        logger.warning("Leonardo start failed: %s", exc)
    return None


async def _leonardo_poll(gen_id: str, api_key: str, client: httpx.AsyncClient) -> str | None:
    for _ in range(30):  # up to 60 s
        await asyncio.sleep(2)
        try:
            r = await client.get(
                f"{_LEONARDO_GENERATIONS}/{gen_id}",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=_TIMEOUT,
            )
            if r.status_code != 200:
                continue
            data = r.json().get("generations_by_pk", {})
            status = data.get("status")
            if status == "COMPLETE":
                images = data.get("generated_images", [])
                return images[0]["url"] if images else None
            if status == "FAILED":
                logger.warning("Leonardo generation FAILED for id=%s", gen_id)
                return None
        except Exception as exc:
            logger.warning("Leonardo poll error: %s", exc)
    logger.warning("Leonardo timed out for id=%s", gen_id)
    return None


async def _fetch_with_leonardo(
    prompt: str, api_key: str, client: httpx.AsyncClient
) -> str | None:
    gen_id = await _leonardo_start(prompt, api_key, client)
    if not gen_id:
        return None
    return await _leonardo_poll(gen_id, api_key, client)


# ── Unsplash / Picsum fallback ────────────────────────────────────────────────

def _picsum_url(query: str) -> str:
    seed = hashlib.md5(query.encode()).hexdigest()[:12]
    return f"https://picsum.photos/seed/{seed}/1920/1080"


async def _fetch_unsplash(query: str, api_key: str, client: httpx.AsyncClient) -> str | None:
    if not api_key:
        return None
    try:
        r = await client.get(
            _UNSPLASH_SEARCH,
            params={"query": query, "orientation": "landscape", "per_page": 1},
            headers={"Authorization": f"Client-ID {api_key}"},
            timeout=_TIMEOUT,
        )
        if r.status_code == 200:
            results = r.json().get("results", [])
            if results:
                return results[0].get("urls", {}).get("regular")
        else:
            logger.warning("Unsplash returned %s for '%s'", r.status_code, query)
    except Exception as exc:
        logger.warning("Unsplash failed for '%s': %s", query, exc)
    return None


async def _resolve_picsum(query: str, client: httpx.AsyncClient) -> str:
    source = _picsum_url(query)
    try:
        r = await client.get(source, follow_redirects=True, timeout=_TIMEOUT)
        if r.status_code == 200:
            return str(r.url)
    except Exception as exc:
        logger.warning("Picsum resolve failed: %s", exc)
    return source


# ── Main entrypoint ───────────────────────────────────────────────────────────

async def enrich_slides_with_images(
    slides: list[dict[str, Any]],
    openai_api_key: str = "",
    leonardo_api_key: str = "",
    unsplash_api_key: str = "",
) -> list[dict[str, Any]]:
    use_ai = bool(openai_api_key and leonardo_api_key)
    # Limit concurrency more when waiting on Leonardo (generation takes ~20s each)
    semaphore = asyncio.Semaphore(3 if use_ai else 4)

    async def fetch_one(slide: dict[str, Any]) -> dict[str, Any]:
        title = slide.get("title", "")
        content = slide.get("content", [])
        async with semaphore:
            async with httpx.AsyncClient() as client:
                if use_ai:
                    # Step 1: ask OpenAI for a vivid image prompt
                    prompt = await _openai_image_prompt(title, content, openai_api_key, client)
                    if not prompt:
                        prompt = _generate_image_query(title, content)
                    # Step 2: generate the image with Leonardo
                    url = await _fetch_with_leonardo(prompt, leonardo_api_key, client)
                    if not url:
                        # Fallback chain: Unsplash → Picsum
                        url = await _fetch_unsplash(prompt, unsplash_api_key, client)
                    if not url:
                        url = await _resolve_picsum(prompt, client)
                    return {**slide, "image_query": prompt, "image_url": url}
                else:
                    query = _generate_image_query(title, content)
                    url = await _fetch_unsplash(query, unsplash_api_key, client)
                    if not url:
                        url = await _resolve_picsum(query, client)
                    return {**slide, "image_query": query, "image_url": url}

    return list(await asyncio.gather(*[fetch_one(s) for s in slides]))
