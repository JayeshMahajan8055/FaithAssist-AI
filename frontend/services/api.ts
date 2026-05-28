export type Denomination = "general" | "protestant" | "catholic" | "orthodox";

export type Citation = {
  reference: string;
  text: string;
  source: string;
  confidence: number;
  verified: boolean;
};

export type KeyPassage = {
  reference: string;
  text: string;
  translation: string;
  source: string;
  confidence: number;
  verified: boolean;
};

export type SourceExcerpt = {
  title: string;
  text: string;
  source: string;
  page?: number | null;
  confidence: number;
};

export type GroundingStatus = {
  scripture_verified: boolean;
  citation_matched: boolean;
  retrieval_confidence: number;
  safety_checked: boolean;
  tradition_note?: string | null;
};

export type StructuredAnswer = {
  summary: string;
  key_passages: KeyPassage[];
  sources: SourceExcerpt[];
  grounding: GroundingStatus;
};

export type ChatResponse = {
  session_id: string;
  answer: string;
  structured?: StructuredAnswer | null;
  citations: Citation[];
  safety: { allowed: boolean; category: string; reason: string; redirect?: string };
  retrieval_confidence: number;
  denomination_note?: string;
  memory_summary?: string;
};

export type ImageResponse = {
  image_url?: string | null;
  revised_prompt: string;
  safety: { allowed: boolean; category: string; reason: string; redirect?: string };
  notes: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function sendChat(sessionId: string, message: string, denomination: Denomination): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, denomination })
  });
  return parseResponse<ChatResponse>(response);
}

export type ChatStreamHandlers = {
  onSummaryDelta: (delta: string) => void;
  onSummaryDone?: (summary: string) => void;
  onPassages?: (passages: KeyPassage[]) => void;
  onSources?: (sources: SourceExcerpt[]) => void;
  onGrounding?: (grounding: GroundingStatus) => void;
  onDone?: (response: ChatResponse) => void;
  onError?: (message: string) => void;
};

export async function streamChat(
  sessionId: string,
  message: string,
  denomination: Denomination,
  handlers: ChatStreamHandlers
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ session_id: sessionId, message, denomination })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const parsed = parseSse(rawEvent);
      if (!parsed) continue;
      handleStreamEvent(parsed.event, parsed.data, handlers);
    }
  }
}

function parseSse(rawEvent: string): { event: string; data: any } | null {
  const eventLine = rawEvent.split("\n").find((line) => line.startsWith("event: "));
  const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
  if (!eventLine || !dataLine) return null;
  return {
    event: eventLine.slice("event: ".length),
    data: JSON.parse(dataLine.slice("data: ".length))
  };
}

function handleStreamEvent(event: string, data: any, handlers: ChatStreamHandlers) {
  if (event === "summary_delta") handlers.onSummaryDelta(data.delta ?? "");
  if (event === "summary_done") handlers.onSummaryDone?.(data.summary ?? "");
  if (event === "passages") handlers.onPassages?.(data.key_passages ?? []);
  if (event === "sources") handlers.onSources?.(data.sources ?? []);
  if (event === "grounding") handlers.onGrounding?.(data.grounding);
  if (event === "done") handlers.onDone?.(data as ChatResponse);
  if (event === "error") handlers.onError?.(data.message ?? "Streaming failed");
}

export async function generateImage(sessionId: string, prompt: string): Promise<ImageResponse> {
  const response = await fetch(`${API_BASE}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, prompt })
  });
  return parseResponse<ImageResponse>(response);
}
