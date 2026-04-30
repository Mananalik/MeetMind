# 🧠 MeetMind — AI Meeting Note Taker

MeetMind is an AI-powered meeting transcription and summarization tool. Upload any audio recording of a meeting and get an accurate transcript powered by OpenAI Whisper.

## ✨ Features

- 🎙️ **Audio Upload** — Supports MP3, MP4, WAV, M4A, and WebM formats
- 📝 **AI Transcription** — Powered by OpenAI Whisper (`whisper-1` model)
- ⚡ **Fast & Accurate** — Handles long recordings with high accuracy
- 🌐 **Language Detection** — Automatically detects the spoken language

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Mananalik/MeetMind.git
cd MeetMind

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Add your OpenAI API key to .env.local
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

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
| [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text) | Audio transcription |

## 📁 Project Structure

```
MeetMind/
├── app/
│   ├── api/
│   │   └── transcribe/     # Whisper transcription API route
│   ├── upload/             # Upload page
│   ├── layout.tsx
│   └── page.tsx            # Redirects to /upload
├── public/
└── ai-logs/                # Development notes
```

## 📄 License

MIT
