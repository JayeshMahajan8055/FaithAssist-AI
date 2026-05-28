import { BookOpenCheck, CheckCircle2, ChevronDown, ShieldCheck } from "lucide-react";
import type { Citation, KeyPassage, SourceExcerpt } from "../services/api";

export function CitationCard({ citation }: { citation: Citation | KeyPassage }) {
  const label = citation.verified ? "Verified Scripture" : "Grounded Source";
  const preview = citation.text.length > 360 ? `${citation.text.slice(0, 360).trim()}...` : citation.text;
  const needsExpand = citation.text.length > 360;

  return (
    <article className="overflow-hidden rounded-xl border border-line/45 bg-white p-5 shadow-[0_2px_10px_rgba(23,33,27,0.01)] transition duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b3d2f] text-white shadow-sm shrink-0">
          <BookOpenCheck className="h-4.5 w-4.5" aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink leading-tight">{citation.reference}</h3>
          {"translation" in citation && <p className="mt-0.5 text-xs font-semibold uppercase text-ink/50 leading-tight">{citation.translation}</p>}
        </div>
        <span className="ml-auto inline-flex items-center gap-1 bg-[#edf3ec] text-[#315b43] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#315b43]/10 shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {label} - {Math.round(citation.confidence * 100)}%
        </span>
      </div>
      <div className="mt-4">
        <p className="scripture-serif text-base leading-relaxed text-ink/90 font-medium">
          "{preview.replace(/^["“]|["”]$/g, "")}"
        </p>
      </div>
      {needsExpand && (
        <details className="border-t border-line/35 mt-4 pt-3 group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-moss transition hover:text-moss/80">
            Expand Full Passage
            <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="scripture-serif bg-cloud/30 rounded-lg p-4 mt-2 text-base leading-relaxed text-ink/85">{citation.text}</div>
        </details>
      )}
    </article>
  );
}

export function SourceAccordion({ sources }: { sources: SourceExcerpt[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="divide-y divide-line/45 rounded-xl border border-line/45 bg-white overflow-hidden shadow-[0_2px_10px_rgba(23,33,27,0.01)]">
      {sources.map((source, index) => (
        <details key={`${source.title}-${index}`} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm text-ink transition hover:bg-cloud/45">
            <span className="font-bold text-ink/90">{source.title}</span>
            {source.page && <span className="text-xs text-ink/50 font-medium">page {source.page}</span>}
            <span className="ml-auto rounded-full border border-moss/10 bg-cloud px-2.5 py-0.5 text-xs font-semibold text-moss">{Math.round(source.confidence * 100)}%</span>
            <ChevronDown className="h-4 w-4 text-ink/45 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="bg-cloud/10 px-5 pb-5 pt-2 text-sm leading-relaxed text-ink/85 border-t border-line/30">
            {source.text}
            <div className="mt-3 text-xs text-ink/45 font-medium">{source.source}</div>
          </div>
        </details>
      ))}
    </div>
  );
}

export function GroundingPanel({
  grounding,
  safetyCategory
}: {
  grounding: {
    scripture_verified: boolean;
    citation_matched: boolean;
    retrieval_confidence: number;
    safety_checked: boolean;
    tradition_note?: string | null;
  };
  safetyCategory?: string;
}) {
  const rows = [
    { label: grounding.scripture_verified ? "Scripture verified" : "Grounded in source context", ok: true },
    { label: grounding.citation_matched ? "Citation matched" : "Citation card unavailable for PDF source", ok: grounding.citation_matched },
    { label: `Retrieval confidence: ${Math.round(grounding.retrieval_confidence * 100)}%`, ok: grounding.retrieval_confidence >= 0.35 },
    { label: safetyCategory && safetyCategory !== "safe" ? `Safety checked: ${safetyCategory}` : "Safety checked", ok: grounding.safety_checked },
    { label: grounding.tradition_note ?? "Interpretation may vary across traditions", ok: true }
  ];

  return (
    <div className="rounded-lg border border-line/80 bg-vellum p-5 shadow-card">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-moss" aria-hidden />
        <h4 className="text-base font-semibold text-ink">AI Grounding Status</h4>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
              row.ok ? "border-moss/15 bg-cloud text-moss" : "border-gold/30 bg-gold/10 text-ink"
            }`}
          >
            <span className="text-xs font-bold">{row.ok ? "OK" : "!"}</span>
            <span>{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScriptureCouldNotVerify({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-gold/40 bg-vellum p-5 shadow-card">
      <div className="text-base font-semibold text-ink">Scripture could not be verified.</div>
      <p className="mt-2 text-sm leading-7 text-ink/75">{message}</p>
    </div>
  );
}

export function SafetyRefusal({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-wine/25 bg-vellum p-5 shadow-card">
      <div className="text-base font-semibold text-ink">I can’t help create harmful religious content.</div>
      <p className="mt-2 text-sm leading-7 text-ink/75">{message}</p>
    </div>
  );
}
