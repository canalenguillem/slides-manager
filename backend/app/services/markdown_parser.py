import re
from typing import Any

def _generate_image_query(title: str, content: list[dict[str, str]]) -> str:
    """Build a search query from the title + a few keywords from the content."""
    parts = [title.strip()] if title.strip() else []
    for item in content[:3]:
        if item.get("type") == "table":
            continue  # skip table data for image queries
        words = item.get("text", "").split()[:3]
        if words:
            parts.append(" ".join(words))
    query = " ".join(parts)
    return query if query.strip() else "business abstract"


def _is_table_separator(line: str) -> bool:
    return bool(re.match(r'^\|[\s\-|:]+\|$', line.strip()))


def _parse_table_rows(rows: list[str]) -> dict[str, str] | None:
    """Convert buffered table rows into a single table content item."""
    data_rows = [r for r in rows if not _is_table_separator(r.strip())]
    if not data_rows:
        return None
    parsed = []
    for row in data_rows:
        cells = [c.strip() for c in row.strip().strip('|').split('|')]
        parsed.append('\t'.join(cells))
    return {"type": "table", "text": '\n'.join(parsed)}


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
    table_buf: list[str] = []

    def flush_table() -> None:
        if table_buf:
            item = _parse_table_rows(table_buf)
            if item:
                content.append(item)
            table_buf.clear()

    for line in lines:
        stripped = line.strip()

        # Empty line flushes any in-progress table
        if not stripped:
            flush_table()
            continue

        # Table row (starts with |)
        if stripped.startswith("|"):
            table_buf.append(stripped)
            continue

        # Any non-table line flushes the buffer first
        flush_table()

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

    flush_table()

    return {
        "index": index,
        "title": title,
        "content": content,
        "type": slide_type,
        "raw": raw,
        "image_query": _generate_image_query(title, content),
    }
