import asyncio
import json
from pathlib import Path

from httpx import AsyncClient


async def main() -> None:
    cases = json.loads(Path("evaluation/test_cases.json").read_text(encoding="utf-8"))
    async with AsyncClient(base_url="http://localhost:8000", timeout=30) as client:
        for case in cases:
            response = await client.post(
                "/api/chat",
                json={"session_id": f"eval-{case['id']}", "message": case["prompt"], "denomination": "general"},
            )
            print(f"\n[{case['id']}] {response.status_code}")
            print(response.json().get("answer", "")[:600])


if __name__ == "__main__":
    asyncio.run(main())
