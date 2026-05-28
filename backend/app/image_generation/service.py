from openai import AsyncOpenAI
from urllib.parse import quote

from app.core.config import settings
from app.models.schemas import ImageRequest, ImageResponse, SafetyDecision
from app.moderation.safety import SafetyModerator


class ImageGenerationService:
    def __init__(self):
        self.moderator = SafetyModerator()

    async def generate(self, payload: ImageRequest) -> ImageResponse:
        safety = self.moderator.check(payload.prompt)
        if not safety.allowed:
            return ImageResponse(revised_prompt=payload.prompt, safety=safety, notes=[safety.redirect or safety.reason])

        base_prompt = payload.prompt.strip().rstrip(".")
        revised = (
            f"{base_prompt}. Style: {payload.style}. "
            "Respectful Christian-themed image, non-hateful, non-political, no mockery of sacred figures."
        )
        if settings.image_provider.lower() == "pollinations":
            encoded = quote(revised)
            image_url = f"{settings.pollinations_base_url}/{encoded}?width=1024&height=1024&nologo=true"
            return ImageResponse(
                image_url=image_url,
                revised_prompt=revised,
                safety=safety,
                notes=["Generated with free Pollinations image endpoint after local prompt moderation."],
            )

        if not settings.openai_api_key:
            return ImageResponse(
                image_url=None,
                revised_prompt=revised,
                safety=safety,
                notes=["Image provider is OpenAI, but OPENAI_API_KEY is not configured."],
            )

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        result = await client.images.generate(model=settings.openai_image_model, prompt=revised, size="1024x1024")
        image_url = result.data[0].url if result.data else None
        return ImageResponse(image_url=image_url, revised_prompt=revised, safety=safety)
