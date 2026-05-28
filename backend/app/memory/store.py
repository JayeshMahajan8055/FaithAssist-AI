import json
from pathlib import Path
from typing import Any, ClassVar

import aiosqlite

from app.models.schemas import Denomination, SessionSummary


class MemoryStore:
    _instance: ClassVar["MemoryStore | None"] = None

    def __init__(self, database_url: str):
        self.path = database_url.replace("sqlite+aiosqlite:///", "")
        if self.path.startswith("./"):
            root = Path(__file__).resolve().parents[3]
            self.path = str(root / "backend" / self.path[2:])

    @classmethod
    def current(cls) -> "MemoryStore":
        if cls._instance is None:
            from app.core.config import settings

            cls._instance = MemoryStore(settings.database_url)
        return cls._instance

    async def initialize(self) -> None:
        MemoryStore._instance = self
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                """CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    denomination TEXT DEFAULT 'general',
                    summary TEXT DEFAULT '',
                    topics TEXT DEFAULT '[]'
                )"""
            )
            await db.execute(
                """CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )"""
            )
            await db.commit()

    async def append(self, session_id: str, role: str, content: str, denomination: Denomination | str = "general") -> None:
        await self.upsert_session(session_id, denomination)
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "INSERT INTO messages(session_id, role, content) VALUES (?, ?, ?)",
                (session_id, role, content[:8000]),
            )
            await db.commit()

    async def upsert_session(self, session_id: str, denomination: Denomination | str) -> None:
        denomination_value = denomination.value if isinstance(denomination, Denomination) else denomination
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                """INSERT INTO sessions(session_id, denomination) VALUES (?, ?)
                ON CONFLICT(session_id) DO UPDATE SET denomination=excluded.denomination""",
                (session_id, denomination_value),
            )
            await db.commit()

    async def update_summary(self, session_id: str, summary: str, topics: list[str]) -> None:
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE sessions SET summary=?, topics=? WHERE session_id=?",
                (summary[:2000], json.dumps(topics[:12]), session_id),
            )
            await db.commit()

    async def get_recent_messages(self, session_id: str, limit: int = 8) -> list[dict[str, Any]]:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT role, content, created_at FROM messages WHERE session_id=? ORDER BY id DESC LIMIT ?",
                (session_id, limit),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in reversed(rows)]

    async def get_session(self, session_id: str) -> SessionSummary:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            row = await (await db.execute("SELECT * FROM sessions WHERE session_id=?", (session_id,))).fetchone()
        messages = await self.get_recent_messages(session_id, 20)
        if not row:
            return SessionSummary(session_id=session_id, messages=messages)
        return SessionSummary(
            session_id=session_id,
            denomination=Denomination(row["denomination"]),
            summary=row["summary"] or "",
            topics=json.loads(row["topics"] or "[]"),
            messages=messages,
        )

    async def list_sessions(self) -> list[SessionSummary]:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            rows = await (await db.execute("SELECT * FROM sessions ORDER BY rowid DESC LIMIT 25")).fetchall()
        return [
            SessionSummary(
                session_id=row["session_id"],
                denomination=Denomination(row["denomination"]),
                summary=row["summary"] or "",
                topics=json.loads(row["topics"] or "[]"),
            )
            for row in rows
        ]
