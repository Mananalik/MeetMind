import { NextRequest, NextResponse } from "next/server";
import Groq, { toFile } from "groq-sdk";

// ─── Groq client (singleton) ──────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Constants ────────────────────────────────────────────────────────────────
// Groq's Whisper endpoint supports the same formats as OpenAI Whisper
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — Whisper limit

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
  if (!file.type.startsWith("audio/")) {
    return NextResponse.json(
      { error: `Unsupported file type: "${file.type}". Please upload an audio file.` },
      { status: 400 }
    );
  }

  // --- Validate file size ---
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 25 MB.` },
      { status: 413 }
    );
  }

  // --- Call Groq Whisper (whisper-large-v3) ---
  try {
    // Convert Web File to Node Buffer to satisfy Groq SDK in Next.js environments
    const buffer = Buffer.from(await file.arrayBuffer());
    const groqFile = await toFile(buffer, file.name, { type: file.type });

    const response = await groq.audio.transcriptions.create({
      file: groqFile,
      model: "whisper-large-v3",
      response_format: "verbose_json",
    });

    // The 'verbose_json' format returns extra fields like duration and language,
    // but the SDK's default return type only guarantees the 'text' property.
    // We cast it to any to safely extract these additional fields.
    const verboseRes = response as any;

    return NextResponse.json({
      transcript: response.text,
      duration: verboseRes.duration ?? null,
      language: verboseRes.language ?? null,
    });
  } catch (err) {
    console.error("[/api/transcribe] Groq error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please check your GROQ_API_KEY and try again." },
      { status: 500 }
    );
  }
}
