import re

from app.models.schemas import Citation
from app.rag.bible import BibleRepository


BOOK_NAMES = [
    "Genesis",
    "Exodus",
    "Leviticus",
    "Numbers",
    "Deuteronomy",
    "Joshua",
    "Judges",
    "Ruth",
    "1 Samuel",
    "2 Samuel",
    "1 Kings",
    "2 Kings",
    "1 Chronicles",
    "2 Chronicles",
    "Ezra",
    "Nehemiah",
    "Esther",
    "Job",
    "Psalm",
    "Psalms",
    "Proverbs",
    "Ecclesiastes",
    "Song of Solomon",
    "Isaiah",
    "Jeremiah",
    "Lamentations",
    "Ezekiel",
    "Daniel",
    "Hosea",
    "Joel",
    "Amos",
    "Obadiah",
    "Jonah",
    "Micah",
    "Nahum",
    "Habakkuk",
    "Zephaniah",
    "Haggai",
    "Zechariah",
    "Malachi",
    "Matthew",
    "Mark",
    "Luke",
    "John",
    "Acts",
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
    "Revelation",
]

BOOK_PATTERN = "|".join(re.escape(book) for book in sorted(BOOK_NAMES, key=len, reverse=True))
REFERENCE_RE = re.compile(rf"\b(?:{BOOK_PATTERN})\s+\d{{1,3}}:\d{{1,3}}\b")
BROAD_REFERENCE_RE = re.compile(r"\b(?:[1-3]\s*)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d{1,3}:\d{1,3}\b")


class CitationValidator:
    def __init__(self):
        self.bible = BibleRepository()

    def references_in_text(self, answer: str) -> list[str]:
        return sorted(set(match.group(0) for match in REFERENCE_RE.finditer(answer)))

    def candidate_references_in_text(self, text: str) -> list[str]:
        candidates: set[str] = set(self.references_in_text(text))
        for match in BROAD_REFERENCE_RE.finditer(text):
            value = match.group(0)
            if self.bible.get(value):
                candidates.add(value)
                continue
            parts = value.split()
            if len(parts) > 2:
                trimmed = " ".join(parts[-2:])
                candidates.add(trimmed)
            else:
                candidates.add(value)
        return sorted(candidates)

    def validate_answer(self, answer: str, retrieved_citations: list[Citation]) -> tuple[bool, list[str]]:
        allowed = {self.bible.normalize_ref(c.reference): c for c in retrieved_citations if c.verified}
        unsupported: list[str] = []
        for reference in self.references_in_text(answer):
            normalized = self.bible.normalize_ref(reference)
            if normalized not in allowed:
                unsupported.append(reference)
        return len(unsupported) == 0, unsupported

    def citations_from_context(self, docs: list) -> list[Citation]:
        citations: list[Citation] = []
        seen: set[str] = set()
        for doc in docs:
            references = []
            if doc.metadata.get("type") == "scripture":
                references.append(doc.metadata["reference"])
            references.extend(self.references_in_text(doc.page_content))
            for reference in references:
                if reference in seen:
                    continue
                verse = self.bible.get(reference)
                if verse:
                    citations.append(Citation(reference=verse.reference, text=verse.text, confidence=0.9, verified=True))
                    seen.add(reference)
        return citations
