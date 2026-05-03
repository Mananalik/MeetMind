import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
  }

  const { transcript, messages } = body;

  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
  }

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
  }

  // Build the system prompt
  const systemPrompt = {
    role: "system",
    content: `You are a helpful AI Meeting Assistant. You will answer the user's questions based ONLY on the following meeting transcript. If the answer is not contained in the transcript, say "I couldn't find an answer to that in the meeting transcript." Keep your answers concise, direct, and well-formatted.

TRANSCRIPT:
${transcript}`,
  };

  try {
    // We send the system prompt (which contains the transcript) + the conversation history
    const chatCompletion = await groq.chat.completions.create({
      messages: [systemPrompt, ...messages],
      model: "llama-3.1-8b-instant",
      temperature: 0.3, // Lower temperature for more factual responses
      max_tokens: 1024,
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({ reply: responseContent });
  } catch (err) {
    console.error("[/api/chat] Groq error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI response. Please try again." },
      { status: 500 }
    );
  }
}
