"use client";

import { useMemo, useState } from "react";

type Tone =
  | "Calm"
  | "Understanding"
  | "Apologetic"
  | "Flirty"
  | "Honest"
  | "Boundary"
  | "Comforting";

export default function Home() {
  const [email, setEmail] = useState("");
  const [tone, setTone] = useState<Tone>("Calm");
  const [improved, setImproved] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && !isLoading, [email, isLoading]);

  async function onImprove() {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    setImproved("");

    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tone }),
      });

      const data = (await res.json().catch((err) => {
        console.error("[Home] Failed to parse JSON from /api/improve:", err);
        return null;
      })) as { result?: string } | null;

      if (!res.ok) {
        const message =
          (data && typeof data.result === "string" && data.result) ||
          `Request failed with status ${res.status}`;
        console.error("[Home] /api/improve responded with error:", res.status, message);
        throw new Error(message);
      }

      if (!data || typeof data.result !== "string") {
        console.error("[Home] Unexpected response shape from /api/improve:", data);
        throw new Error("Unexpected response from server.");
      }

      setImproved(data.result.trim());
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      console.error("[Home] Improve email request failed:", e);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onCopy() {
    const text = improved.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("[Home] Failed to copy to clipboard:", e);
      setError("Could not copy to clipboard. Please copy manually.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <header className="mb-8">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Reply For Me
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm text-zinc-600 dark:text-zinc-400">
            Not sure what to say? Paste a message and get a reply.
          </p>
        </header>

        <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <textarea
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Paste the message you received..."
                className="min-h-44 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-50/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid gap-2">
                <label htmlFor="tone" className="text-sm font-medium">
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-600 dark:focus:ring-zinc-50/10 sm:w-56"
                >
                  <option value="Calm">Calm (de-escalate conflict)</option>
                  <option value="Understanding">Understanding (empathetic reply)</option>
                  <option value="Apologetic">Apologetic (say sorry properly)</option>
                  <option value="Flirty">Flirty (playful / romantic)</option>
                  <option value="Honest">Honest (real and direct)</option>
                  <option value="Boundary">Boundary (set limits clearly)</option>
                  <option value="Comforting">Comforting (support someone emotionally)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={onImprove}
                disabled={!canSubmit}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
              >
                {isLoading ? "Generating…" : "Generate Reply"}
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            ) : null}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Generated reply</h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {improved ? `${improved.length} chars` : ""}
                </span>
              </div>
              <div className="min-h-24 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                {improved || (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Your reply will appear here.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCopy}
                  disabled={!improved.trim()}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  Copy
                </button>
                {copied ? (
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    Copied!
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
