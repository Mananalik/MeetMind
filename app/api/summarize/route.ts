import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SummarizeRequestBody {
  transcript: string;
}

interface SummaryOutput {
  tldr: string;
  keyPoints: string[];
  actionItems: string[];
}

// ─── Groq client (singleton) ──────────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior executive assistant specializing in meeting intelligence. \
You read raw meeting transcripts and extract only what matters — decisions, insights, and next steps — \
with zero filler.

OUTPUT FORMAT
Return a single valid JSON object. No markdown. No prose. No extra fields. Exact schema:

{
  "tldr": string,
  "keyPoints": string[],
  "actionItems": string[]
}

━━━ FIELD RULES ━━━

tldr
• 1–2 sentences maximum.
• State the meeting's primary outcome or decision — not what was discussed.
• Write in past tense. Start with the subject, not "The meeting...".
• BAD:  "The team met to talk about the product roadmap and various issues."
• GOOD: "The team greenlit the Q3 roadmap, prioritizing the mobile app rewrite over new feature work."

keyPoints
• 3 to 6 items only. Quality over quantity.
• Each point = one distinct decision, conclusion, or critical insight.
• Write complete sentences. Begin each with a strong verb or the subject that owns the point.
• No point should overlap with another or echo the tldr.
• BAD:  "Discussed performance issues." / "Budget was talked about."
• GOOD: "API response times exceeded 3s on 40% of requests, blocking the mobile launch."
• GOOD: "Marketing budget was cut by 20% for Q3; the team will reallocate to paid search only."

actionItems
• Only include tasks with a concrete next step.
• Format: "[Owner if named]: [specific task] [by deadline if mentioned]"
• If no owner was stated, write "Team:" or the relevant function (e.g., "Engineering:").
• If no action items exist in the transcript, return an empty array [].
• BAD:  "Someone should look into the bug." / "Follow up on sales."
• GOOD: "Sarah: Share revised pricing deck with stakeholders by Friday."
• GOOD: "Engineering: Profile and fix the /checkout endpoint before the August 1 release."

━━━ GLOBAL CONSTRAINTS ━━━
• Never repeat content across tldr, keyPoints, and actionItems.
• Never use vague openers: "discussed", "talked about", "mentioned", "touched on", "looked at".
• Never pad with filler: "It was noted that...", "The group agreed to...", "There was a conversation about...".
• If the transcript is too brief or unclear to extract a field reliably, use your best judgment — do not hallucinate details.
• Do not add any JSON fields beyond the schema.`;

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_TRANSCRIPT_LENGTH = 10;
const MAX_TRANSCRIPT_LENGTH = 100_000; // ~75k tokens safety buffer

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // --- Parse request body ---
  let body: SummarizeRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { transcript } = body;

  // --- Validate transcript ---
  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json(
      { error: "Missing required field: transcript (string)." },
      { status: 400 }
    );
  }

  const trimmed = transcript.trim();

  if (trimmed.length < MIN_TRANSCRIPT_LENGTH) {
    return NextResponse.json(
      { error: "Transcript is too short to summarize." },
      { status: 400 }
    );
  }

  if (trimmed.length > MAX_TRANSCRIPT_LENGTH) {
    return NextResponse.json(
      { error: "Transcript exceeds the maximum allowed length (100,000 characters)." },
      { status: 400 }
    );
  }

  // --- Call Groq (llama-3.1-8b-instant) ---
  let rawContent: string | null;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,       // Low temperature = consistent, factual output
      max_tokens: 1024,
      response_format: { type: "json_object" }, // Enforces strict JSON output
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the meeting transcript:\n\n${trimmed}`,
        },
      ],
    });

    const choice = completion.choices[0];

    // Guard: if the model ran out of tokens the JSON will be truncated
    if (choice?.finish_reason === "length") {
      console.error("[/api/summarize] Response truncated (finish_reason: length). Increase max_tokens.");
      return NextResponse.json(
        { error: "The summary was cut short due to length limits. Please try again." },
        { status: 500 }
      );
    }

    rawContent = choice?.message?.content ?? null;
  } catch (err) {
    console.error("[/api/summarize] Groq API error:", err);
    return NextResponse.json(
      { error: "Summarization failed. Please check your API key and try again." },
      { status: 500 }
    );
  }

  if (!rawContent) {
    console.error("[/api/summarize] Empty response from Groq.");
    return NextResponse.json(
      { error: "Received an empty response from the AI. Please try again." },
      { status: 500 }
    );
  }

  // --- Parse and validate the structured output ---
  let summary: SummaryOutput;

  try {
    summary = JSON.parse(rawContent) as SummaryOutput;
  } catch (err) {
    console.error("[/api/summarize] JSON parse error. Raw content:", rawContent, err);
    return NextResponse.json(
      { error: "Failed to parse AI response as JSON. Please try again." },
      { status: 500 }
    );
  }

  // --- Validate schema shape ---
  if (
    typeof summary.tldr !== "string" ||
    !Array.isArray(summary.keyPoints) ||
    !Array.isArray(summary.actionItems)
  ) {
    console.error("[/api/summarize] Unexpected schema from Groq:", summary);
    return NextResponse.json(
      { error: "AI returned an unexpected response format. Please try again." },
      { status: 500 }
    );
  }

  // --- Return structured summary (sanitize array items to strings) ---
  return NextResponse.json({
    tldr: summary.tldr.trim() || "No summary available.",
    keyPoints: summary.keyPoints.filter((x): x is string => typeof x === "string"),
    actionItems: summary.actionItems.filter((x): x is string => typeof x === "string"),
  });
}
