import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MeetMind — AI Meeting Transcription",
  description: "Upload a meeting recording and get an instant AI-powered transcript.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
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
        {children}
      </body>
    </html>
  );
}
