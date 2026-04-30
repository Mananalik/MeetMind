# 🧠 MeetMind — AI Meeting Note Taker

MeetMind is an AI-powered meeting transcription and summarization tool. Upload any audio recording of a meeting and get an accurate transcript powered by Groq Whisper.

## ✨ Features

- 🎙️ **Audio Upload** — Supports MP3, MP4, WAV, M4A, and WebM formats
- 📝 **AI Transcription** — Powered by Groq Whisper (`whisper-large-v3` model)
- ⚡ **Fast & Accurate** — Handles long recordings with high accuracy
- 🌐 **Language Detection** — Automatically detects the spoken language

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Mananalik/MeetMind.git
cd MeetMind

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Add your Groq and OpenAI API keys to .env.local
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Groq — free Whisper transcription & Llama 3 summarization
GROQ_API_KEY=your_groq_api_key_here
```

| Key | Used for | Get it at |
|-----|----------|-----------|
| `GROQ_API_KEY` | Audio transcription (Whisper) & Summarization (Llama 3) | [console.groq.com](https://console.groq.com) — **free** |

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org) | React framework (App Router) |
| [TypeScript](https://typescriptlang.org) | Type safety |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Groq Whisper](https://console.groq.com) | Audio transcription (free) |
| [Groq Llama 3](https://console.groq.com) | Meeting summarization (free) |

## 📁 Project Structure

```
MeetMind/
├── app/
│   ├── api/
│   │   ├── summarize/      # Llama 3 summarization API route
│   │   └── transcribe/     # Groq Whisper transcription API route
│   ├── upload/             # Upload page
│   ├── layout.tsx
│   └── page.tsx            # Redirects to /upload
├── public/
└── ai-logs/                # Development notes
```

## 📄 License

MIT
