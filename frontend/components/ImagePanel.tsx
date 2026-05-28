import { FormEvent, useState } from "react";
import { ImageIcon, Sparkles } from "lucide-react";
import { generateImage, type ImageResponse } from "../services/api";

export function ImagePanel({
  sessionId,
  prompt,
  setPrompt
}: {
  sessionId: string;
  prompt: string;
  setPrompt: (val: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await generateImage(sessionId, prompt.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate image");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-transparent px-4 py-8 md:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-[360px_1fr]">
        <form onSubmit={onSubmit} className="rounded-2xl border border-white/70 bg-vellum/90 p-5 shadow-premium">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-gold" aria-hidden />
            Christian Image Generation
          </div>
          <textarea
            id="image-textarea"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="mt-4 min-h-36 w-full resize-none rounded-xl border border-line bg-white/85 px-4 py-3 text-sm leading-6 outline-none transition focus:border-gold focus:shadow-[0_0_0_4px_rgba(199,154,58,0.14)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-br from-moss to-ink px-4 text-sm font-medium text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-premium disabled:translate-y-0 disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" aria-hidden />
            {loading ? "Reviewing..." : "Generate"}
          </button>
          <p className="mt-3 text-xs leading-5 text-ink/65">Free fast generation uses Pollinations after local moderation. Offensive, hateful, or extremist religious imagery is refused.</p>
        </form>

        <div className="min-h-96 rounded-2xl border border-white/70 bg-vellum/90 p-5 shadow-premium">
          {error && <p className="text-sm text-wine">{error}</p>}
          {!result && !error && <div className="flex h-full min-h-80 items-center justify-center text-sm text-ink/60">Generated image or dry-run prompt appears here.</div>}
          {result && (
            <div className="grid gap-4">
              {result.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.image_url} alt="Generated Christian themed artwork" className="aspect-square w-full max-w-xl rounded-xl object-cover shadow-card" />
              ) : (
                <div className="rounded-xl bg-cloud p-4 text-sm text-ink">No image URL was returned by the configured provider.</div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-ink">Prompt Used</h3>
                <p className="mt-1 text-sm leading-6 text-ink/75">{result.revised_prompt}</p>
              </div>
              {result.notes.length > 0 && <p className="rounded-md bg-cloud p-3 text-sm text-ink">{result.notes.join(" ")}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
