import argparse
import json
import re
import subprocess
from pathlib import Path


def extract_text(pdf_path: Path) -> str:
    result = subprocess.run(
        ["pdftotext", "-enc", "UTF-8", "-raw", str(pdf_path), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout.decode("utf-8", errors="replace")


HEADER_RE = re.compile(
    r"^(?P<start_book>(?:[1-3]\s+)?[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+"
    r"(?P<start_chapter>\d+):(?P<start_verse>\d+)\s+\d+\s+"
    r"(?P<end_book>(?:[1-3]\s+)?[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+"
    r"(?P<end_chapter>\d+):(?P<end_verse>\d+)$"
)


def parse_header(line: str) -> dict | None:
    match = HEADER_RE.match(re.sub(r"\s+", " ", line).strip())
    if not match:
        return None
    data = match.groupdict()
    return {
        "start_reference": f"{data['start_book']} {data['start_chapter']}:{data['start_verse']}",
        "end_reference": f"{data['end_book']} {data['end_chapter']}:{data['end_verse']}",
        "book": data["start_book"] if data["start_book"] == data["end_book"] else None,
    }


def clean_text(text: str) -> str:
    text = text.replace("\f", "\n")
    lines: list[str] = []
    page_re = re.compile(r"^\d{1,4}$")
    footnote_re = re.compile(r"^[*†‡§]\s?\d{0,3}:?\d{0,3}.*")
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            lines.append("")
            continue
        if page_re.match(line) or HEADER_RE.match(line) or footnote_re.match(line):
            continue
        lines.append(line)
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def chunk_text(text: str, source: str, chunk_chars: int = 2800, overlap: int = 300, base_metadata: dict | None = None) -> list[dict]:
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n\s*\n", text) if paragraph.strip()]
    chunks: list[dict] = []
    buffer = ""
    index = 0
    for paragraph in paragraphs:
        if len(buffer) + len(paragraph) + 2 <= chunk_chars:
            buffer = f"{buffer}\n\n{paragraph}".strip()
            continue
        if buffer:
            chunks.append(
                {
                    "text": buffer,
                    "metadata": {
                        "type": "bible_pdf_context",
                        "source": source,
                        "chunk": index,
                        "citation_mode": "context_only_not_exact_verse_validation",
                        **(base_metadata or {}),
                    },
                }
            )
            index += 1
            buffer = buffer[-overlap:] + "\n\n" + paragraph if overlap else paragraph
        else:
            chunks.append(
                {
                    "text": paragraph[:chunk_chars],
                    "metadata": {
                        "type": "bible_pdf_context",
                        "source": source,
                        "chunk": index,
                        "citation_mode": "context_only_not_exact_verse_validation",
                        **(base_metadata or {}),
                    },
                }
            )
            index += 1
            buffer = paragraph[chunk_chars - overlap :]
    if buffer:
        chunks.append(
            {
                "text": buffer,
                "metadata": {
                    "type": "bible_pdf_context",
                    "source": source,
                    "chunk": index,
                    "citation_mode": "context_only_not_exact_verse_validation",
                    **(base_metadata or {}),
                },
            }
        )
    return chunks


def chunk_pdf_pages(raw_text: str, source: str, chunk_chars: int) -> list[dict]:
    chunks: list[dict] = []
    for page_number, page in enumerate(raw_text.split("\f"), start=1):
        lines = [line for line in page.splitlines() if line.strip()]
        metadata = {"page": page_number}
        if lines:
            header = parse_header(lines[0])
            if header:
                metadata.update(header)
        cleaned = clean_text(page)
        if not cleaned:
            continue
        page_chunks = chunk_text(cleaned, source, chunk_chars=chunk_chars, overlap=120, base_metadata=metadata)
        for chunk in page_chunks:
            chunk["metadata"]["chunk"] = len(chunks)
            chunks.append(chunk)
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract a PDF into chunked FaithAssist context JSON.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", type=Path, default=Path("data/theology_docs/pdf_context.json"))
    parser.add_argument("--chunk-chars", type=int, default=2800)
    args = parser.parse_args()

    text = extract_text(args.pdf)
    chunks = chunk_pdf_pages(text, args.pdf.name, args.chunk_chars)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(chunks, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(chunks)} chunks to {args.out}")


if __name__ == "__main__":
    main()
