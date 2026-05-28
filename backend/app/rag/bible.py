import json
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Verse:
    book: str
    chapter: int
    verse: int
    text: str
    translation: str = "WEB"

    @property
    def reference(self) -> str:
        return f"{self.book} {self.chapter}:{self.verse}"


class BibleRepository:
    def __init__(self, path: Path | None = None):
        root = Path(__file__).resolve().parents[3]
        self.path = path or root / "data" / "bible" / "sample_web.json"
        self._verses = self._load()

    def _load(self) -> dict[str, Verse]:
        rows = json.loads(self.path.read_text(encoding="utf-8"))
        verses: dict[str, Verse] = {}
        for row in rows:
            verse = Verse(**row)
            verses[self.normalize_ref(verse.reference)] = verse
        return verses

    @staticmethod
    def normalize_ref(reference: str) -> str:
        return re.sub(r"\s+", " ", reference.strip().lower())

    def get(self, reference: str) -> Verse | None:
        return self._verses.get(self.normalize_ref(reference))

    def all(self) -> list[Verse]:
        return list(self._verses.values())
