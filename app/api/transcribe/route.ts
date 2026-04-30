import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/ogg",
  // Some browsers report m4a as this:
  "audio/mp4; codecs=mp4a.40.2",
]);

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

  // --- Validate MIME type (allow any audio/* via prefix) ---
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

  // --- Call OpenAI Whisper ---
  try {
    const response = await openai.audio.transcriptions.create({
      file: file,          // OpenAI SDK accepts Web API File directly
      model: "whisper-1",
      response_format: "verbose_json",
    });

    return NextResponse.json({
      transcript: response.text,
      duration: response.duration ?? null,
      language: response.language ?? null,
    });
  } catch (err) {
    console.error("[/api/transcribe] OpenAI error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please check your API key and try again." },
      { status: 500 }
    );
  }
}
