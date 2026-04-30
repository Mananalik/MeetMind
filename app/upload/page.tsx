"use client";

import { useState, useRef } from "react";

const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/x-m4a", "audio/ogg"];
const MAX_SIZE_MB = 25;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setTranscript(null);

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
      setTranscript(data.transcript ?? "No transcript returned");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setTranscript(null);
    setError(null);
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
    </main>
  );
}
