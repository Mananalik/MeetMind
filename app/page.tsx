import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30">
      
      {/* Navbar (Landing page specific) */}
      <header className="px-6 py-5 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
          <span className="text-zinc-100 font-bold text-xl tracking-tight">MeetMind</span>
        </div>
        <nav className="flex gap-6 items-center">
          {!userId ? (
            <>
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
                  Login
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 rounded-full bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
                  Get Started
                </button>
              </SignUpButton>
            </>
          ) : (
            <Link href="/upload" className="px-4 py-2 rounded-full bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-colors">
              Go to Dashboard
            </Link>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 shrink-0 flex flex-col items-center justify-start relative px-6 pt-32 pb-56 text-center overflow-hidden min-h-[78vh]">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-indigo-400 mb-8 z-10 shadow-xl">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
          MeetMind AI is now live
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white max-w-4xl z-10 leading-[1.1]">
          Never take <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">meeting notes</span> again.
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl z-10 leading-relaxed font-medium">
          Record your meetings, lectures, or voice memos and instantly get a full transcript, executive summary, and actionable to-do list.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 z-10 w-full sm:w-auto">
          <Link 
            href="/upload" 
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-all shadow-[0_0_40px_8px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_12px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Start Recording — Free
          </Link>
        </div>

        {/* Social Proof */}
        <div className="mt-16 flex flex-col items-center gap-4 z-10">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <img 
                key={i} 
                className="w-10 h-10 rounded-full border-2 border-zinc-950 object-cover" 
                src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                alt="User avatar" 
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>
            <span className="text-sm font-medium text-zinc-300">Trusted by 1,000,000+ professionals</span>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="bg-zinc-950 pt-28 pb-24 border-t border-zinc-900 relative z-10 mt-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to stay focused.</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">MeetMind handles the busywork so you can be fully present in your conversations.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Live Recording</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Record directly in your browser or upload existing audio files. We support MP3, WAV, M4A, and more.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Instant AI Insights</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Powered by Llama 3.1. Get an executive TLDR, extracted key points, and an actionable to-do list in seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Chat with your Audio</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Ask specific questions about your meeting. The AI uses the exact transcript to give you factual, direct answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-500 text-sm border-t border-zinc-900">
        <p>© {new Date().getFullYear()} MeetMind AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
