import asyncio
import hashlib
import logging
from typing import Any

import httpx

from app.services.markdown_parser import _generate_image_query

logger = logging.getLogger(__name__)

_TIMEOUT = 15.0
_OPENAI_CHAT = "https://api.openai.com/v1/chat/completions"
_LEONARDO_V1 = "https://cloud.leonardo.ai/api/rest/v1/generations"
_LEONARDO_V2 = "https://cloud.leonardo.ai/api/rest/v2/generations"
_UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos"

LEONARDO_MODELS: dict[str, dict] = {
    "gpt-image-1.5": {
        "api_version": "v2",
        "width": 1536,
        "height": 1024,
    },
    "phoenix": {
        "api_version": "v1",
        "model_id": "6b645e3a-d64f-4341-a6d8-7a3690fbf042",
        "width": 1472,
        "height": 832,
    },
}
DEFAULT_LEONARDO_MODEL = "gpt-image-1.5"

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

async def _leonardo_start(
    prompt: str, model_key: str, api_key: str, client: httpx.AsyncClient
) -> str | None:
    cfg = LEONARDO_MODELS.get(model_key, LEONARDO_MODELS[DEFAULT_LEONARDO_MODEL])
    try:
        if cfg["api_version"] == "v2":
            body: dict[str, Any] = {
                "public": False,
                "model": model_key,
                "parameters": {
                    "mode": "QUALITY",
                    "prompt": prompt,
                    "quantity": 1,
                    "width": cfg["width"],
                    "height": cfg["height"],
                    "prompt_enhance": "OFF",
                },
            }
            endpoint = _LEONARDO_V2
        else:
            body = {
                "prompt": prompt,
                "modelId": cfg["model_id"],
                "width": cfg["width"],
                "height": cfg["height"],
                "num_images": 1,
                "public": False,
            }
            endpoint = _LEONARDO_V1

        r = await client.post(
            endpoint,
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=30.0,
        )
        if r.status_code == 200:
            return r.json()["sdGenerationJob"]["generationId"]
        logger.warning("Leonardo start returned %s: %s", r.status_code, r.text[:300])
    except Exception as exc:
        logger.warning("Leonardo start failed: %s", exc)
    return None


async def _leonardo_poll(gen_id: str, api_key: str, client: httpx.AsyncClient) -> str | None:
    for _ in range(40):  # up to 80 s
        await asyncio.sleep(2)
        try:
            r = await client.get(
                f"{_LEONARDO_V1}/{gen_id}",
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
    prompt: str, model_key: str, api_key: str, client: httpx.AsyncClient
) -> str | None:
    gen_id = await _leonardo_start(prompt, model_key, api_key, client)
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


# ── Single-slide image generation (used by the edit endpoint) ─────────────────

async def generate_slide_image(
    slide: dict[str, Any],
    openai_api_key: str = "",
    leonardo_api_key: str = "",
    leonardo_model: str = DEFAULT_LEONARDO_MODEL,
    unsplash_api_key: str = "",
    custom_prompt: str | None = None,
) -> dict[str, Any]:
    """Generate (or regenerate) an image for a single slide. Returns updated slide dict."""
    title = slide.get("title", "")
    content = slide.get("content", [])

    async with httpx.AsyncClient() as client:
        if openai_api_key and leonardo_api_key:
            if custom_prompt:
                prompt = custom_prompt
            else:
                prompt = await _openai_image_prompt(title, content, openai_api_key, client)
                if not prompt:
                    prompt = _generate_image_query(title, content)
            url = await _fetch_with_leonardo(prompt, leonardo_model, leonardo_api_key, client)
            if not url:
                url = await _fetch_unsplash(prompt, unsplash_api_key, client)
            if not url:
                url = await _resolve_picsum(prompt, client)
        else:
            prompt = custom_prompt or _generate_image_query(title, content)
            url = await _fetch_unsplash(prompt, unsplash_api_key, client)
            if not url:
                url = await _resolve_picsum(prompt, client)

    return {**slide, "image_query": prompt, "image_url": url}


# ── Bulk enrichment (used on upload / generate-all) ──────────────────────────

async def enrich_slides_with_images(
    slides: list[dict[str, Any]],
    openai_api_key: str = "",
    leonardo_api_key: str = "",
    leonardo_model: str = DEFAULT_LEONARDO_MODEL,
    unsplash_api_key: str = "",
) -> list[dict[str, Any]]:
    use_ai = bool(openai_api_key and leonardo_api_key)
    semaphore = asyncio.Semaphore(3 if use_ai else 4)

    async def fetch_one(slide: dict[str, Any]) -> dict[str, Any]:
        async with semaphore:
            return await generate_slide_image(
                slide,
                openai_api_key=openai_api_key,
                leonardo_api_key=leonardo_api_key,
                leonardo_model=leonardo_model,
                unsplash_api_key=unsplash_api_key,
            )

    return list(await asyncio.gather(*[fetch_one(s) for s in slides]))
