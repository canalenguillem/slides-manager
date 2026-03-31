import re
from typing import Any


def parse_markdown_to_slides(content: str) -> list[dict[str, Any]]:
    """Split markdown by `---` separators and parse each slide."""
    raw_slides = re.split(r"(?:^|\n)---(?:\n|$)", content)
    slides = []

    for raw in raw_slides:
        raw = raw.strip()
        if not raw:
            continue
        slide = _parse_single_slide(raw, len(slides))
        slides.append(slide)

    return slides


def _parse_single_slide(raw: str, index: int) -> dict[str, Any]:
    lines = raw.split("\n")
    title = ""
    content: list[dict[str, str]] = []
    slide_type = "content"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith("# "):
            title = stripped[2:].strip()
            slide_type = "title" if index == 0 else "content"

        elif stripped.startswith("## "):
            if not title:
                title = stripped[3:].strip()
            else:
                content.append({"type": "heading2", "text": stripped[3:].strip()})

        elif stripped.startswith("### "):
            text = stripped[4:].strip()
            if not title:
                title = text
            else:
                content.append({"type": "heading3", "text": text})

        elif re.match(r"^[-*+]\s+", stripped):
            text = re.sub(r"^[-*+]\s+", "", stripped)
            content.append({"type": "bullet", "text": text})

        elif re.match(r"^\d+\.\s+", stripped):
            text = re.sub(r"^\d+\.\s+", "", stripped)
            content.append({"type": "numbered", "text": text})

        else:
            content.append({"type": "text", "text": stripped})

    return {
        "index": index,
        "title": title,
        "content": content,
        "type": slide_type,
        "raw": raw,
    }
