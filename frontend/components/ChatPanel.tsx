import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AlertTriangle, Send, Sparkles } from "lucide-react";
import { CitationCard, GroundingPanel, SafetyRefusal, ScriptureCouldNotVerify, SourceAccordion } from "./CitationCard";
import { Denomination, streamChat, type Citation, type GroundingStatus, type KeyPassage, type SourceExcerpt, type StructuredAnswer } from "../services/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  structured?: StructuredAnswer | null;
  citations?: Citation[];
  safetyCategory?: string;
  confidence?: number;
  denominationNote?: string;
  streaming?: boolean;
  summaryComplete?: boolean;
  passagesVisible?: boolean;
  sourcesVisible?: boolean;
  groundingVisible?: boolean;
};

const EMPTY_GROUNDING: GroundingStatus = {
  scripture_verified: false,
  citation_matched: false,
  retrieval_confidence: 0,
  safety_checked: true,
  tradition_note: "Checking grounding..."
};

export function ChatPanel({
  sessionId,
  denomination,
  input,
  setInput
}: {
  sessionId: string;
  denomination: Denomination;
  input: string;
  setInput: (val: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Peace to you. Ask a question about Scripture, Christian practice, history, or theology, and I will answer from verified context when I can."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const assistantIndex = messages.length + 1;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((items) => [
      ...items,
      { role: "user", content: text, timestamp: timeStr },
      {
        role: "assistant",
        content: "",
        streaming: true,
        timestamp: timeStr,
        structured: {
          summary: "",
          key_passages: [],
          sources: [],
          grounding: EMPTY_GROUNDING
        }
      }
    ]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      await streamChat(sessionId, text, denomination, {
        onSummaryDelta: (delta) => {
          setMessages((items) => updateAssistant(items, assistantIndex, (message) => {
            const current = message.structured ?? { summary: "", key_passages: [], sources: [], grounding: EMPTY_GROUNDING };
            const summary = current.summary + delta;
            return { ...message, content: summary, structured: { ...current, summary } };
          }));
        },
        onSummaryDone: (summary) => {
          setMessages((items) => updateAssistant(items, assistantIndex, (message) => ({
            ...message,
            content: summary,
            summaryComplete: true,
            structured: {
              ...(message.structured ?? { key_passages: [], sources: [], grounding: EMPTY_GROUNDING }),
              summary
            }
          })));
        },
        onPassages: (passages: KeyPassage[]) => {
          setMessages((items) => updateAssistant(items, assistantIndex, (message) => ({
            ...message,
            passagesVisible: true,
            structured: {
              ...(message.structured ?? { summary: message.content, sources: [], grounding: EMPTY_GROUNDING }),
              key_passages: passages
            }
          })));
        },
        onSources: (sources: SourceExcerpt[]) => {
          setMessages((items) => updateAssistant(items, assistantIndex, (message) => ({
            ...message,
            sourcesVisible: true,
            structured: {
              ...(message.structured ?? { summary: message.content, key_passages: [], grounding: EMPTY_GROUNDING }),
              sources
            }
          })));
        },
        onGrounding: (grounding: GroundingStatus) => {
          setMessages((items) => updateAssistant(items, assistantIndex, (message) => ({
            ...message,
            groundingVisible: true,
            structured: {
              ...(message.structured ?? { summary: message.content, key_passages: [], sources: [] }),
              grounding
            }
          })));
        },
        onDone: (response) => {
          setMessages((items) => updateAssistant(items, assistantIndex, (message) => ({
            ...message,
            content: response.answer,
            structured: response.structured ?? message.structured,
            citations: response.citations,
            safetyCategory: response.safety.category,
            confidence: response.retrieval_confidence,
            denominationNote: response.denomination_note,
            streaming: false,
            summaryComplete: true,
            passagesVisible: true,
            sourcesVisible: true,
            groundingVisible: true
          })));
        },
        onError: (message) => {
          setError(message);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to contact FaithAssist API");
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = messages.length === 1 && messages[0].role === "assistant";

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col justify-between p-6 md:p-8 h-full min-h-[450px]">
        {/* Centered Empty State View */}
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto">
          {/* Gold Dove Icon */}
          <div className="h-16 w-16 text-gold/80 flex items-center justify-center">
            <svg className="h-14 w-14" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 34 C30 24, 20 12, 10 16 C14 24, 22 30, 32 34 Z" fill="currentColor" fillOpacity="0.03" />
              <path d="M32 34 C36 22, 48 12, 54 18 C48 26, 40 31, 32 34 Z" fill="currentColor" fillOpacity="0.03" />
              <path d="M32 34 C28 38, 28 44, 30 48 C32 52, 38 54, 40 50 C42 46, 38 40, 32 34 Z" fill="currentColor" fillOpacity="0.03" />
              <path d="M30 48 C26 54, 20 58, 14 56 C18 52, 24 48, 30 48" />
              <path d="M29 35 C26 34, 24 35, 22 37" />
              <path d="M22 37 C21 35, 19 36, 21 38 C23 40, 24 38, 22 37 Z" fill="currentColor" />
            </svg>
          </div>

          <h2 className="mt-4 text-4xl font-semibold text-moss font-serif scripture-serif">Peace to you.</h2>

          {/* Leaf twig gold divider */}
          <div className="flex items-center justify-center gap-4 my-5 w-full">
            <div className="h-[1px] w-16 bg-gold/45" />
            <svg className="h-4 w-4 text-gold/75" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 12C6 12 10 10 12 8C14 10 18 12 22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 8C10 6 7 7 8 10C9 11 11 10 12 8Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
              <path d="M12 8C14 6 17 7 16 10C15 11 13 10 12 8Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className="h-[1px] w-16 bg-gold/45" />
          </div>

          <p className="text-sm md:text-base leading-relaxed text-ink/75 max-w-lg font-medium">
            Ask a question about Scripture, Christian practice, theology, or history. I'll answer from verified context.
          </p>
        </div>

        {/* Centered Floating Input Box */}
        <div className="w-full max-w-3xl mx-auto mt-auto pb-4">
          <form onSubmit={onSubmit} className="flex gap-3 rounded-2xl border border-line/60 bg-white p-3 shadow-soft hover:shadow-card transition duration-200">
            <textarea
              id="chat-textarea"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question..."
              className="min-h-12 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-ink outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1b3d2f] text-white shadow-md transition hover:bg-[#153025] hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
              disabled={loading}
              aria-label="Send"
              title="Send"
            >
              <Send className="h-5 w-5 rotate-45 -translate-x-0.5 translate-y-0.5" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-1 flex-col h-full bg-transparent overflow-hidden">
      {/* Scrollable Message History */}
      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-thin">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          {messages.map((message, index) => {
            // Skip the first welcome message if we have active chat history
            if (index === 0 && messages.length > 1) return null;
            return (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-2xl w-full flex justify-end" : "mr-auto w-full"}>
                {message.role === "user" ? (
                  <div className="relative rounded-2xl bg-[#1b3d2f] px-5 py-4 text-sm leading-relaxed text-white shadow-soft max-w-[85%]">
                    <div>{message.content}</div>
                    {message.timestamp && (
                      <div className="text-[10px] text-white/70 text-right mt-1.5 font-light">{message.timestamp}</div>
                    )}
                  </div>
                ) : (
                  <AssistantMessage message={message} />
                )}
              </div>
            );
          })}
          {loading && <LoadingCard />}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-wine/30 bg-white px-5 py-4 text-sm text-wine shadow-soft max-w-xl mx-auto">
              <AlertTriangle className="h-4.5 w-4.5" aria-hidden />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input form at the bottom */}
      <div className="border-t border-line/30 bg-white/90 backdrop-blur-md px-6 py-4 shrink-0">
        <form onSubmit={onSubmit} className="mx-auto flex max-w-4xl gap-3 rounded-2xl border border-line/55 bg-white p-2 shadow-soft">
          <textarea
            id="chat-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question..."
            className="min-h-12 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-ink outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1b3d2f] text-white shadow-md transition hover:bg-[#153025] hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            disabled={loading}
            aria-label="Send"
            title="Send"
          >
            <Send className="h-5 w-5 rotate-45 -translate-x-0.5 translate-y-0.5" aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}

function updateAssistant(items: Message[], index: number, update: (message: Message) => Message) {
  return items.map((item, itemIndex) => (itemIndex === index ? update(item) : item));
}

function AssistantMessage({ message }: { message: Message }) {
  const structured = message.structured;
  const isWarning = message.safetyCategory && message.safetyCategory !== "safe";

  if (!structured) {
    return (
      <div className="rounded-2xl border border-line/30 bg-white p-6 shadow-sm">
        <div className="prose prose-sm max-w-none text-ink leading-relaxed font-sans">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  if (!message.streaming && isWarning) {
    return <SafetyRefusal message={structured.summary} />;
  }

  if (!message.streaming && structured.grounding.retrieval_confidence === 0) {
    return <ScriptureCouldNotVerify message={structured.summary} />;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Summary Section */}
      <div className="rounded-2xl border border-line/30 bg-white p-6 shadow-[0_4px_20px_rgba(23,33,27,0.02)]">
        <h3 className="text-sm font-bold text-moss uppercase tracking-wider">Summary</h3>
        <div className="mt-3 prose prose-sm max-w-none text-ink leading-relaxed font-sans font-medium">
          <ReactMarkdown>{structured.summary}</ReactMarkdown>
          {message.streaming && !message.summaryComplete && <TypingCursor />}
        </div>
      </div>

      {/* Key Scripture Section */}
      {message.passagesVisible && structured.key_passages.length > 0 && (
        <section className="rounded-2xl border border-line/30 bg-white p-6 shadow-[0_4px_20px_rgba(23,33,27,0.02)] animate-[fadeSlide_260ms_ease-out]">
          <h3 className="text-sm font-bold text-moss uppercase tracking-wider mb-4">Key Scripture</h3>
          <div className="grid gap-4">
            {structured.key_passages.map((passage) => (
              <CitationCard key={passage.reference} citation={passage} />
            ))}
          </div>
        </section>
      )}

      {/* Grounded Sources Section */}
      {message.sourcesVisible && structured.sources.length > 0 && (
        <section className="rounded-2xl border border-line/30 bg-white p-6 shadow-[0_4px_20px_rgba(23,33,27,0.02)]">
          <h3 className="text-sm font-bold text-moss uppercase tracking-wider mb-4">Grounded Sources</h3>
          <SourceAccordion sources={structured.sources} />
        </section>
      )}

      {/* AI Grounding Status Panel */}
      {message.groundingVisible && (
        <div className="rounded-2xl border border-line/30 bg-white p-6 shadow-[0_4px_20px_rgba(23,33,27,0.02)]">
          <GroundingPanel grounding={structured.grounding} safetyCategory={message.safetyCategory} />
        </div>
      )}
    </div>
  );
}

function TypingCursor() {
  return <span className="ml-1 inline-block h-5 w-2 translate-y-1 animate-pulse rounded-sm bg-moss" />;
}

function LoadingCard() {
  return (
    <div className="relative mr-auto w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-vellum p-5 shadow-card">
      <div className="shimmer absolute inset-0" />
      <div className="relative flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-cloud" />
        <div className="grid flex-1 gap-2">
          <div className="h-3 w-40 rounded-full bg-cloud" />
          <div className="h-3 w-64 rounded-full bg-cloud" />
        </div>
      </div>
    </div>
  );
}
