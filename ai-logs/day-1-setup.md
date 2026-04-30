# Day 1 — Project Setup

## Goal
Initialize project and design architecture

## Prompt
I am building an AI meeting note taker app.

Tech stack:
- Next.js (App Router)
- TypeScript
- Tailwind CSS

Features:
- Audio upload
- Transcription (Whisper API)
- AI summary (TLDR, key points, action items)

Give me:
1. A clean folder structure
2. API route design (/api/transcribe, /api/summarize)
3. Data flow from upload → transcript → summary
4. Best practices for scalability

Keep it production-ready and simple.

## AI Response

## MeetMind AI — Implementation Plan

## Overview

A production-ready AI meeting note-taker built on **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS v4**. Audio is uploaded from the browser → transcribed via OpenAI Whisper → summarized via GPT-4o → rendered in a clean UI.

---

## 1. Folder Structure

```
meetmind-ai/
├── app/
│   ├── layout.tsx                   # Root layout (fonts, metadata)
│   ├── page.tsx                     # Home: Upload + dashboard
│   ├── globals.css                  # Tailwind v4 + design tokens
│   │
│   ├── meetings/
│   │   ├── page.tsx                 # Meeting history list
│   │   └── [id]/
│   │       └── page.tsx             # Single meeting detail view
│   │
│   └── api/
│       ├── transcribe/
│       │   └── route.ts             # POST: audio → transcript
│       └── summarize/
│           └── route.ts             # POST: transcript → summary
│
├── components/
│   ├── ui/                          # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   ├── AudioUploader.tsx            # Drag & drop audio upload zone
│   ├── TranscriptViewer.tsx         # Scrollable transcript display
│   ├── SummaryPanel.tsx             # TLDR + key points + action items
│   └── MeetingCard.tsx              # Card for meeting history
│
├── lib/
│   ├── openai.ts                    # Singleton OpenAI client
│   ├── whisper.ts                   # Whisper API call + helpers
│   ├── summarize.ts                 # GPT-4o prompt + structured output parser
│   └── validators.ts                # Zod schemas for API I/O
│
├── hooks/
│   ├── useTranscribe.ts             # Client hook: upload → transcription state
│   └── useSummarize.ts              # Client hook: transcript → summary state
│
├── types/
│   └── meeting.ts                   # Shared TypeScript interfaces
│
├── ai-logs/                         # Your dev journal (already created)
│   └── day-1-setup.md
│
├── .env.local                       # OPENAI_API_KEY (never committed)
├── next.config.ts
└── package.json
```

---

## 2. API Route Design

### `POST /api/transcribe`

**Purpose**: Accepts an audio file, sends it to OpenAI Whisper, returns raw transcript.

**Request**: `multipart/form-data`
```
file: <audio file>  (mp3, mp4, wav, m4a, webm — max 25MB)
```

**Response** (`200 OK`):
```json
{
  "transcript": "Good morning everyone, today we'll discuss...",
  "duration": 183.4,
  "language": "en"
}
```

**Error responses**:
| Status | Reason |
|--------|--------|
| `400` | No file / unsupported format |
| `413` | File exceeds 25MB Whisper limit |
| `500` | OpenAI API failure |

**Implementation notes**:
- Use Next.js `RouteHandler` with `request.formData()`
- Stream file bytes directly to Whisper — do NOT write to disk
- Set `next.config.ts` body size limit to `26mb`

---

### `POST /api/summarize`

**Purpose**: Takes a raw transcript, returns structured AI summary.

**Request**: `application/json`
```json
{
  "transcript": "...",
  "meetingTitle": "Q2 Planning Sync"  // optional
}
```

**Response** (`200 OK`):
```json
{
  "tldr": "Team aligned on Q2 goals with a focus on user retention.",
  "keyPoints": [
    "Retention target set at 85% for Q2",
    "Mobile redesign moving to staging next week"
  ],
  "actionItems": [
    { "task": "Set up A/B test for onboarding", "owner": "Sarah", "due": "May 10" },
    { "task": "Share updated roadmap with stakeholders", "owner": "Alex", "due": "May 5" }
  ],
  "sentiment": "positive"
}
```

**Implementation notes**:
- Use GPT-4o with structured output (JSON mode via `response_format: { type: "json_object" }`)
- Validate response with Zod before returning
- Max transcript ~100k tokens; chunk if longer (stretch goal)

---

## 3. Data Flow

```
Browser
  │
  │  1. User selects/drops audio file
  ▼
AudioUploader (client component)
  │
  │  2. POST /api/transcribe  [multipart/form-data]
  ▼
/api/transcribe/route.ts
  │  ├── Validate file type + size
  │  ├── Call OpenAI Whisper API (stream bytes)
  │  └── Return { transcript, duration, language }
  │
  │  3. Transcript returned → stored in React state
  ▼
TranscriptViewer (renders transcript immediately)
  │
  │  4. POST /api/summarize  [JSON: { transcript }]
  ▼
/api/summarize/route.ts
  │  ├── Build structured GPT-4o prompt
  │  ├── Parse + validate JSON response with Zod
  │  └── Return { tldr, keyPoints, actionItems, sentiment }
  │
  │  5. Summary returned → stored in React state
  ▼
SummaryPanel (renders TLDR, key points, action items)
```

**State management**: All state lives in the parent page component via `useState`. No external state library needed at this scale — hooks (`useTranscribe`, `useSummarize`) encapsulate fetch logic cleanly.

---

## 4. Key Implementation Details

### `lib/openai.ts` — Singleton client
```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export default openai;
```

### `lib/validators.ts` — Zod schemas
```typescript
import { z } from "zod";

export const TranscribeResponseSchema = z.object({
  transcript: z.string(),
  duration: z.number(),
  language: z.string(),
});

export const SummaryResponseSchema = z.object({
  tldr: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.object({
    task: z.string(),
    owner: z.string().optional(),
    due: z.string().optional(),
  })),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});
```

### `next.config.ts` — Body size limit
```typescript
const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: "26mb",
    },
  },
};
```

---

## 5. Best Practices for Scalability

| Area | Practice |
|------|----------|
| **File handling** | Never write audio to disk in API routes — stream bytes directly to Whisper |
| **Secrets** | `OPENAI_API_KEY` only in `.env.local`, never exposed to client bundle |
| **Error handling** | Wrap all OpenAI calls in try/catch, return typed errors to client |
| **Validation** | Zod schemas on both API input AND output |
| **Rate limits** | Add per-IP rate limiting via `next-rate-limit` or Vercel middleware |
| **Long audio** | Whisper limit is 25MB — add client-side file size check before upload |
| **Chunking** | For >25MB audio, split with `ffmpeg-wasm` on client or a background job |
| **Streaming** | Use Vercel AI SDK `streamText` for summarize step to show progressive output |
| **Storage** | Phase 2: persist to Supabase/PlanetScale — schema ready via `types/meeting.ts` |
| **Auth** | Phase 2: add NextAuth.js — API routes stay the same, add session guard |
| **Observability** | Log Whisper/GPT latency + token usage per request (to console or Axiom) |

---

## 6. Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_MAX_FILE_SIZE_MB=25   # Exposed to client for validation UX
```

---

## 7. Dependencies to Install

```bash
npm install openai zod
npm install -D @types/node
```

> **Optional (Phase 2)**: `@vercel/ai` (streaming), `next-auth` (auth), `@supabase/supabase-js` (storage)

---

## 8. Proposed Build Order

1. `[ ]` Install `openai` + `zod`
2. `[ ]` Create `.env.local` with `OPENAI_API_KEY`
3. `[ ]` Build `lib/openai.ts` + `lib/validators.ts`
4. `[ ]` Build `POST /api/transcribe/route.ts`
5. `[ ]` Build `POST /api/summarize/route.ts`
6. `[ ]` Build `AudioUploader` component
7. `[ ]` Build `TranscriptViewer` component
8. `[ ]` Build `SummaryPanel` component
9. `[ ]` Wire up `app/page.tsx` with hooks + state
10. `[ ]` Style everything with Tailwind v4
11. `[ ]` Add error states + loading skeletons


## Insight
- Generated a full production architecture
- Decided to start with minimal pipeline first
- Will incrementally build features instead of full sy