import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

// ─── AssemblyAI client (singleton) ────────────────────────────────────────────
const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB limit

export async function POST(req: NextRequest) {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");

  // --- Validate file presence ---
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  // --- Validate MIME type ---
  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
    return NextResponse.json(
      { error: `Unsupported file type: "${file.type}". Please upload an audio file.` },
      { status: 400 }
    );
  }

  // --- Validate file size ---
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 100 MB.` },
      { status: 413 }
    );
  }

  // --- Call AssemblyAI (with speaker diarization) ---
  try {
    // Convert Web File to Buffer for upload
    const buffer = Buffer.from(await file.arrayBuffer());

    // AssemblyAI SDK handles upload + polling automatically
    const transcript = await client.transcripts.transcribe({
      audio: buffer,
      speaker_labels: true,        // Speaker A, Speaker B, etc.
      language_code: "en_us",      // Default to English to avoid ALD routing errors
      speech_models: ["universal-3-pro", "universal-2"], // Explicitly supply allowed models
    });

    if (transcript.status === "error") {
      console.error("[/api/transcribe] AssemblyAI error:", transcript.error);
      return NextResponse.json(
        { error: "Transcription failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transcript: transcript.text ?? "",
      utterances: transcript.utterances ?? [],  // Speaker-labeled segments
      duration: transcript.audio_duration ?? null,
      language: transcript.language_code ?? null,
    });
  } catch (err) {
    console.error("[/api/transcribe] AssemblyAI error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please check your ASSEMBLYAI_API_KEY and try again." },
      { status: 500 }
    );
  }
}
