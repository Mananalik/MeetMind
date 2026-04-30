"use client";

import { useState, useRef } from "react";

interface SummaryOutput {
  tldr: string;
  keyPoints: string[];
  actionItems: string[];
}

const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/x-m4a", "audio/ogg"];
const MAX_SIZE_MB = 25;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

// ─── Runtime shape validator ─────────────────────────────────────────────────
// Coerces unknown API response into a safe SummaryOutput rather than a blind
// `as SummaryOutput` cast. Any missing/wrong-typed field gets a safe default.
function parseSummary(data: unknown): SummaryOutput | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  return {
    tldr: typeof d.tldr === "string" && d.tldr.trim()
      ? d.tldr.trim()
      : "Summary unavailable.",
    keyPoints: Array.isArray(d.keyPoints)
      ? d.keyPoints.filter((x): x is string => typeof x === "string")
      : [],
    actionItems: Array.isArray(d.actionItems)
      ? d.actionItems.filter((x): x is string => typeof x === "string")
      : [],
  };
}

// ─── Summary state ────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<SummaryOutput | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ── Summarize ────────────────────────────────────────────────
  async function callSummarize(text: string) {
    setSummarizing(true);
    setSummaryError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setSummaryError("Received a non-JSON response from the server. Please try again.");
        return;
      }

      if (!res.ok) {
        const msg = (data as Record<string, string>)?.error;
        setSummaryError(msg ?? "Summarization failed. Please try again.");
        return;
      }

      const parsed = parseSummary(data);
      if (!parsed) {
        setSummaryError("Received an unexpected response format. Please try again.");
        return;
      }
      setSummary(parsed);
    } catch {
      setSummaryError("Network error while summarizing. Please check your connection.");
    } finally {
      setSummarizing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setTranscript(null);
    setSummary(null);
    setSummaryError(null);

    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Unsupported format. Please upload an MP3, MP4, WAV, M4A, OGG, or WebM file.");
      return;
    }

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setError(null);
    setTranscript(null);
    setSummary(null);
    setSummaryError(null);

    let transcriptText: string | null = null;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Transcription failed. Please try again.");
        return;
      }
      transcriptText = data.transcript ?? "No transcript returned";
      setTranscript(transcriptText);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }

    // Chain summarization only if transcription succeeded
    if (transcriptText) {
      await callSummarize(transcriptText);
    }
  }

  function handleReset() {
    setFile(null);
    setTranscript(null);
    setError(null);
    setSummary(null);
    setSummaryError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start px-4 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white">MeetMind</h1>
        <p className="mt-2 text-sm text-zinc-400">Upload a meeting recording and get an instant transcript.</p>
      </div>

      {/* Upload Card */}
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">

        {/* File Input */}
        <div className="mb-5">
          <label
            htmlFor="audio-file"
            className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2"
          >
            Audio File
          </label>
          <div
            className="flex items-center gap-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {/* Icon */}
            <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>

            <span className={`text-sm truncate ${file ? "text-zinc-100" : "text-zinc-500"}`}>
              {file ? file.name : "Click to select an audio file…"}
            </span>

            {file && (
              <span className="ml-auto text-xs text-zinc-500 shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </div>

          {/* Hidden native input */}
          <input
            ref={inputRef}
            id="audio-file"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="mt-2 text-xs text-zinc-600">
            MP3, MP4, WAV, M4A, OGG, WebM — max {MAX_SIZE_MB} MB
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            id="upload-btn"
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                {/* Spinner */}
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Transcribing…
              </>
            ) : (
              "Transcribe"
            )}
          </button>

          {(file || transcript) && !loading && (
            <button
              id="reset-btn"
              onClick={handleReset}
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Transcript Output */}
      {transcript && (
        <div className="w-full max-w-xl mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Transcript</h2>
            <button
              id="copy-btn"
              onClick={() => navigator.clipboard.writeText(transcript)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-zinc-300 leading-7 whitespace-pre-wrap">{transcript}</p>
        </div>
      )}

      {/* Summary — Loading skeleton */}
      {summarizing && (
        <div className="w-full max-w-xl mt-6 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
          <div className="bg-zinc-900 px-6 py-4 flex items-center gap-2.5 border-b border-zinc-800">
            <svg className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Generating Summary…</span>
          </div>
          <div className="bg-zinc-900 px-6 py-6 border-b border-zinc-800 space-y-2.5">
            <div className="h-2.5 bg-zinc-800 rounded-full animate-pulse w-full" />
            <div className="h-2.5 bg-zinc-800 rounded-full animate-pulse w-4/5" />
          </div>
          <div className="bg-zinc-900 px-6 py-5 border-b border-zinc-800 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                <div className="h-2.5 bg-zinc-800 rounded-full animate-pulse flex-1" style={{ width: `${75 + i * 8}%` }} />
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 px-6 py-5 space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-zinc-800/60 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Summary — Error */}
      {summaryError && !summarizing && (
        <div className="w-full max-w-xl mt-6 flex items-start gap-3 rounded-2xl bg-red-950/40 border border-red-800/60 px-5 py-4 text-sm text-red-300">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{summaryError}</span>
        </div>
      )}

      {/* Summary — Output */}
      {summary && !summarizing && (
        <div id="summary-card" className="w-full max-w-xl mt-6 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">

          {/* Card header */}
          <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">AI Summary</h2>
            </div>
            <span className="text-[11px] text-zinc-600 font-medium">Llama 3.1 8B</span>
          </div>

          {/* TL;DR */}
          <div className="bg-gradient-to-br from-indigo-950/70 via-zinc-900 to-zinc-900 px-6 py-6 border-b border-zinc-800">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.18em] mb-3">TL;DR</p>
            <p className="text-[15px] font-medium text-white leading-7">{summary.tldr}</p>
          </div>

          {/* Key Points */}
          {(summary.keyPoints ?? []).length > 0 && (
            <div className="bg-zinc-900 px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.18em]">Key Points</p>
              </div>
              <ul className="space-y-3">
                {(summary.keyPoints ?? []).map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-400">
                      {i + 1}
                    </span>
                    <p className="text-sm text-zinc-300 leading-6">{point}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          <div className="bg-zinc-900 px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.18em]">Action Items</p>
            </div>
            {(summary.actionItems ?? []).length > 0 ? (
              <ul className="space-y-2">
                {(summary.actionItems ?? []).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-4 py-3">
                    <svg className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-zinc-300 leading-6">{item}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-600 italic">No action items identified in this meeting.</p>
            )}
          </div>

        </div>
      )}
    </main>
  );
}
