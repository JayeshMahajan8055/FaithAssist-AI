import re


class ConversationSummarizer:
    def summarize(self, existing: str, user_message: str, assistant_answer: str) -> tuple[str, list[str]]:
        combined = f"{existing} User asked: {user_message[:240]} Assistant answered: {assistant_answer[:320]}"
        words = re.findall(r"\b[A-Za-z]{5,}\b", combined.lower())
        stop = {"about", "there", "their", "would", "could", "should", "christian", "assistant"}
        topics = sorted({word for word in words if word not in stop})[:10]
        summary = combined[-1200:].strip()
        return summary, topics
