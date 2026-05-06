"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getAllMeetings, searchMeetings, deleteMeeting, updateMeetingTitle, Meeting } from "@/lib/db";

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    setLoading(true);
    try {
      const data = await getAllMeetings();
      setMeetings(data);
    } catch (err) {
      console.error("Failed to load meetings", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    setSearch(query);
    if (query.trim() === "") {
      loadMeetings();
    } else {
      const results = await searchMeetings(query);
      setMeetings(results);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this meeting?")) {
      await deleteMeeting(id);
      if (search.trim() === "") {
        loadMeetings();
      } else {
        const results = await searchMeetings(search);
        setMeetings(results);
      }
    }
  }

  async function handleRename(e: React.FormEvent, id: number) {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    await updateMeetingTitle(id, editTitle.trim());
    setMeetings(meetings.map(m => m.id === id ? { ...m, title: editTitle.trim() } : m));
    setEditingId(null);
  }

  function startEditing(e: React.MouseEvent, meeting: Meeting) {
    e.stopPropagation();
    setEditingId(meeting.id!);
    setEditTitle(meeting.title);
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
          <span className="text-zinc-100 font-bold text-lg tracking-tight">MeetMind</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="/upload" className="text-zinc-400 hover:text-white transition-colors">Record</a>
          <a href="/history" className="text-zinc-400 hover:text-white transition-colors">History</a>
          <div className="h-4 w-px bg-zinc-800"></div>
          <UserButton />
        </div>
      </nav>

      <main className="flex-1 px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Meeting History</h1>
            <p className="mt-2 text-sm text-zinc-400">View and search your past AI summaries.</p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/upload"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              New Meeting
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-3 h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title or transcript..."
              value={search}
              onChange={handleSearch}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 pl-12 pr-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Meeting Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20 px-6 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
            <div className="mx-auto w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-zinc-200">No meetings yet</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Your meeting history will appear here. Head over to the dashboard to upload or record your first audio.
            </p>
            <div className="mt-8">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Meeting
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {meetings.map((meeting) => (
              <div 
                key={meeting.id} 
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg hover:border-zinc-700 transition-colors cursor-pointer group"
                onClick={() => setExpandedId(expandedId === meeting.id ? null : meeting.id!)}
              >
                <div className="px-6 py-5 flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    {editingId === meeting.id ? (
                      <form onSubmit={(e) => handleRename(e, meeting.id!)} onClick={(e) => e.stopPropagation()} className="mb-1">
                        <input 
                          type="text" 
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={(e) => handleRename(e as any, meeting.id!)}
                          className="w-full text-lg font-semibold bg-zinc-950 border border-indigo-500/50 rounded-md px-2 py-0.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </form>
                    ) : (
                      <div className="group/title flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-zinc-100 truncate">{meeting.title}</h2>
                        <button 
                          onClick={(e) => startEditing(e, meeting)}
                          className="opacity-0 group-hover/title:opacity-100 p-1 text-zinc-500 hover:text-indigo-400 transition-colors"
                          title="Rename meeting"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span>{formatDate(meeting.date)}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                      <span className="truncate max-w-[200px]" title={meeting.fileName}>{meeting.fileName}</span>
                      {meeting.summary?.actionItems && meeting.summary.actionItems.length > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {meeting.summary.actionItems.length} actions
                          </span>
                        </>
                      )}
                    </div>
                    
                    {!expandedId || expandedId !== meeting.id ? (
                      <p className="mt-3 text-sm text-zinc-400 line-clamp-2">
                        {meeting.summary?.tldr || "No summary available."}
                      </p>
                    ) : null}
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDelete(e, meeting.id!)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete meeting"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    {!expandedId || expandedId !== meeting.id ? (
                       <svg className="w-5 h-5 text-zinc-600 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                       </svg>
                    ) : null}
                  </div>
                </div>

                {/* Expanded State */}
                {expandedId === meeting.id && (
                  <div className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/30 space-y-6">
                    {/* TLDR */}
                    <div>
                      <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">TL;DR</h3>
                      <p className="text-sm text-zinc-300 leading-relaxed">{meeting.summary?.tldr}</p>
                    </div>

                    {/* Key Points */}
                    {meeting.summary?.keyPoints && meeting.summary.keyPoints.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Key Points</h3>
                        <ul className="space-y-2">
                          {meeting.summary.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                                {i + 1}
                              </span>
                              <p className="text-sm text-zinc-300">{point}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Items */}
                    {meeting.summary?.actionItems && meeting.summary.actionItems.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Action Items</h3>
                        <ul className="space-y-2">
                          {meeting.summary.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 rounded-lg bg-zinc-800/60 px-4 py-3 border border-zinc-700/50">
                              <svg className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm text-zinc-300">{item}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
