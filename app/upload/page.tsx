"use client";

import { useState, useRef } from "react";

interface SummaryOutput {
  tldr: string;
  keyPoints: string[];
  actionItems: string[];
}

interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

type OutputTab = "summary" | "transcript" | "chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/x-m4a", "audio/ogg"];
const MAX_SIZE_MB = 25;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"upload" | "record">("upload");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [utterances, setUtterances] = useState<Utterance[]>([]);

  // ─── Tab & Chat State ───────────────────────────────────────────────────────
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>("summary");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

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
  async function callSummarize(text: string, currentUtts: Utterance[], currentFile: File | null) {
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

      try {
        const { saveMeeting, generateTitle } = await import("@/lib/db");
        const title = generateTitle(text, currentFile?.name || "recording.webm");
        await saveMeeting({
          title,
          fileName: currentFile?.name || "recording.webm",
          date: new Date().toISOString(),
          duration: null,
          language: "en_us",
          transcript: text,
          utterances: currentUtts,
          summary: parsed,
          createdAt: new Date(),
        });
      } catch (err) {
        console.error("Failed to save meeting to database:", err);
      }
    } catch {
      setSummaryError("Network error while summarizing. Please check your connection.");
    } finally {
      setSummarizing(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        setFile(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setFile(null);
      setError(null);
      setTranscript(null);
      setUtterances([]);
      setSummary(null);
      setSummaryError(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function formatTimestamp(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleExportMarkdown() {
    if (!summary) return null;
    
    let md = `# Meeting Summary\n\n`;
    md += `## TL;DR\n${summary.tldr}\n\n`;
    
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      md += `## Key Points\n`;
      summary.keyPoints.forEach((kp, i) => md += `${i + 1}. ${kp}\n`);
      md += `\n`;
    }
    
    if (summary.actionItems && summary.actionItems.length > 0) {
      md += `## Action Items\n`;
      summary.actionItems.forEach(ai => md += `- [ ] ${ai}\n`);
      md += `\n`;
    }

    if (transcript) {
      md += `## Transcript\n${transcript}\n`;
    }

    return md;
  }

  function copyToClipboard() {
    const md = handleExportMarkdown();
    if (md) {
      navigator.clipboard.writeText(md);
      alert("Markdown copied to clipboard!");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setTranscript(null);
    setUtterances([]);
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
    setUtterances([]);
    setSummary(null);
    setSummaryError(null);

    let transcriptText: string | null = null;
    let extractedUtterances: Utterance[] = [];

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
      extractedUtterances = data.utterances ?? [];
      setTranscript(transcriptText);
      setUtterances(extractedUtterances);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }

    // Chain summarization only if transcription succeeded
    if (transcriptText) {
      setActiveOutputTab("summary");
      await callSummarize(transcriptText, extractedUtterances, file);
    }
  }

  function handleReset() {
    setFile(null);
    setTranscript(null);
    setUtterances([]);
    setError(null);
    setSummary(null);
    setSummaryError(null);
    setChatMessages([]);
    setChatInput("");
    setIsChatting(false);
    setActiveOutputTab("summary");
    if (inputRef.current) inputRef.current.value = "";
    if (isRecording) stopRecording();
  }

  async function handleSendMessage() {
    if (!chatInput.trim() || !transcript) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          messages: newMessages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  }

  function downloadMarkdown() {
    const md = handleExportMarkdown();
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting_summary_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
          <span className="text-zinc-100 font-bold text-lg tracking-tight">MeetMind</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="/upload" className="text-zinc-400 hover:text-white transition-colors">Record</a>
          <a href="/history" className="text-zinc-400 hover:text-white transition-colors">History</a>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-16">
        {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white">MeetMind</h1>
        <p className="mt-2 text-sm text-zinc-400">Upload a meeting recording and get an instant transcript.</p>
      </div>

      {/* Upload/Record Card */}
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">

        {/* Tabs */}
        <div className="flex bg-zinc-950/50 rounded-lg p-1 mb-6 border border-zinc-800">
          <button
            onClick={() => { setActiveTab("upload"); handleReset(); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "upload" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Upload File
          </button>
          <button
            onClick={() => { setActiveTab("record"); handleReset(); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "record" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Record Audio
          </button>
        </div>

        {activeTab === "upload" ? (
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
        ) : (
          <div className="mb-5 flex flex-col items-center justify-center p-8 border border-dashed border-zinc-700 rounded-xl bg-zinc-800/30">
            {isRecording ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center w-16 h-16">
                  <div className="absolute w-full h-full rounded-full bg-red-500/20 animate-ping"></div>
                  <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-mono text-zinc-100">{formatTime(recordingTime)}</div>
                <button onClick={stopRecording} className="mt-2 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-full text-white text-sm font-semibold transition-colors shadow-lg">
                  Stop Recording
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <button onClick={startRecording} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors shadow-lg shadow-red-900/50">
                   <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
                <div className="text-sm text-zinc-400">Click to start recording</div>
              </div>
            )}
            {file && !isRecording && (
              <div className="mt-4 text-sm text-emerald-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Recording saved. Ready to transcribe.
              </div>
            )}
          </div>
        )}

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

      {/* Outputs (Tabbed View) */}
      {(transcript || summarizing) && (
        <div className="w-full max-w-xl mt-6">
          {/* Tab Bar */}
          <div className="flex bg-zinc-950/50 rounded-lg p-1 mb-4 border border-zinc-800">
            <button
              onClick={() => setActiveOutputTab("summary")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeOutputTab === "summary" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveOutputTab("transcript")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeOutputTab === "transcript" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Transcript
            </button>
            <button
              onClick={() => setActiveOutputTab("chat")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeOutputTab === "chat" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Ask AI
            </button>
          </div>

          {/* Content Areas */}
          {activeOutputTab === "summary" && (
            <>
              {/* Summary — Loading skeleton */}
              {summarizing && (
                <div className="w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
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
                <div className="w-full flex items-start gap-3 rounded-2xl bg-red-950/40 border border-red-800/60 px-5 py-4 text-sm text-red-300">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{summaryError}</span>
                </div>
              )}

              {/* Summary — Output */}
              {summary && !summarizing && (
                <div id="summary-card" className="w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  {/* Card header */}
                  <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                      <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">AI Summary</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={copyToClipboard} className="text-[11px] text-zinc-400 hover:text-indigo-400 font-medium transition-colors">Copy MD</button>
                      <button onClick={downloadMarkdown} className="text-[11px] text-zinc-400 hover:text-indigo-400 font-medium transition-colors">Download</button>
                      <span className="text-[11px] text-zinc-600 font-medium ml-2 border-l border-zinc-700 pl-3">Llama 3.1 8B</span>
                    </div>
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
            </>
          )}

          {activeOutputTab === "transcript" && transcript && (
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
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
              
              {utterances.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {utterances.map((utt, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Speaker {utt.speaker}</span>
                        <span className="text-[10px] text-zinc-500">{formatTimestamp(utt.start)}</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-6">{utt.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-300 leading-7 whitespace-pre-wrap max-h-[400px] overflow-y-auto pr-2">{transcript}</p>
              )}
            </div>
          )}

          {activeOutputTab === "chat" && transcript && (
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '500px' }}>
              {/* Chat Header */}
              <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse" />
                  <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">Ask AI</h2>
                </div>
                <span className="text-[11px] text-zinc-600 font-medium">Llama 3.1 8B</span>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                    <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm text-zinc-400">Ask any question about your meeting.</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-bl-none"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-3 relative"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about key decisions..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={isChatting || !chatInput.trim()}
                    className="absolute right-2 p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      </main>
    </div>
  );
}
