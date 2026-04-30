# Day 2 — Audio Upload + Transcription Setup

## Goal
Build audio upload UI and connect it to a transcription API endpoint.

---

## Prompt
I am building an AI meeting note taker in Next.js (App Router, TypeScript, Tailwind).

Create a simple audio upload page.

Requirements:
- File input (accept audio only)
- Show selected file name
- Upload button
- Call POST /api/transcribe
- Show loading state
- Display transcript response

Keep it clean and minimal. No extra abstractions.

---

## AI Response (Summary)
- Created a self-contained upload component
- Added file validation (type + size ≤ 25MB)
- Implemented loading state with spinner
- Connected frontend to `/api/transcribe`
- Displayed transcript with clean UI + copy button
- Built API route to handle audio file upload and validation

---

## What I Implemented
- Upload page with audio file selection
- FormData-based API call to backend
- Loading state during transcription
- Transcript display after response
- Basic validation before upload

---

## Observations
- AI generated a production-level solution (more advanced than needed initially)
- Includes validation and structured API handling
- Good separation of concerns between frontend and API

---

## Decisions
- Accepted most of the generated implementation
- Will simplify if needed during debugging
- Started with a working pipeline instead of building everything from scratch

---

## Issues Faced
- No issues so far / Minor UI adjustments needed

---

## Next Step
- Integrate real transcription using Whisper API (or verify if already integrated)
- Then move to summarization pipeline