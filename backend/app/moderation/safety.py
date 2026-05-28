import re

from app.models.schemas import SafetyDecision


class SafetyModerator:
    """Fast deterministic guardrail before paid model calls.

    This MVP uses a transparent rule set so reviewers can see the policy surface.
    A production deployment should add OpenAI Moderation and human review telemetry.
    """

    blocked_patterns = [
        (r"\brewrite\b.*\bbible\b.*\b(racis|hate|violence|suprem)", "manipulated_theology"),
        (r"\b(create|write|generate|make|invent)\b.*\b(fake|false|fabricated)\b.*\b(bible|verse|scripture)\b", "fabricated_scripture"),
        (r"\binvent\b.*\bverse\b", "fabricated_scripture"),
        (r"\bsermon\b.*\b(hate|racis|genocide|exterminate|suprem)", "hate"),
        (r"\b(hateful|racist|supremacist|genocidal)\b.*\bsermon\b", "hate"),
        (r"\bwrite\b.*\bhateful\b.*\b(sermon|prayer|devotional|theology)\b", "hate"),
        (r"\b(christian|religious)\b.*\bpropaganda\b.*\bviolence\b", "violent_extremism"),
        (r"\bkill\b.*\bin the name of\b|\bholy war\b.*\battack\b", "violent_extremism"),
        (r"\bignore\b.*\b(system|developer|safety|instructions)\b", "jailbreak"),
    ]

    sensitive_patterns = [
        (r"\bsuicide\b|\bself-harm\b|\bwant to die\b", "self_harm"),
        (r"\babuse\b|\bassault\b|\btrauma\b", "pastoral_sensitive"),
    ]

    def check(self, text: str) -> SafetyDecision:
        normalized = text.lower()
        for pattern, category in self.blocked_patterns:
            if re.search(pattern, normalized):
                return SafetyDecision(
                    allowed=False,
                    category=category,
                    reason="I cannot help create hateful, violent, fabricated, or manipulative religious content.",
                    redirect="I can help compare real passages, explain historical context, or draft a peace-oriented reflection.",
                )
        for pattern, category in self.sensitive_patterns:
            if re.search(pattern, normalized):
                return SafetyDecision(
                    allowed=True,
                    category=category,
                    reason="This may need a careful, supportive response and encouragement to contact trusted local help.",
                )
        return SafetyDecision(allowed=True)
