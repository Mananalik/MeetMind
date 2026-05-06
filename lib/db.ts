import Dexie, { Table } from "dexie";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Utterance {
  speaker: string;
  start: number; // milliseconds
  end: number;
  text: string;
}

export interface SummaryOutput {
  tldr: string;
  keyPoints: string[];
  actionItems: string[];
}

export interface Meeting {
  id?: number;           // auto-incremented primary key
  title: string;         // auto-generated from first utterance or filename
  fileName: string;
  date: string;          // ISO date string
  duration: number | null; // seconds
  language: string | null;
  transcript: string;
  utterances: Utterance[];
  summary: SummaryOutput | null;
  createdAt: Date;
}

// ─── Database ─────────────────────────────────────────────────────────────────

class MeetMindDB extends Dexie {
  meetings!: Table<Meeting>;

  constructor() {
    super("meetmind");
    this.version(1).stores({
      // Index: id (auto), createdAt for sorting, title for search
      meetings: "++id, createdAt, title, date",
    });
  }
}

export const db = new MeetMindDB();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Save a completed meeting session to IndexedDB */
export async function saveMeeting(data: Omit<Meeting, "id">): Promise<number> {
  return db.meetings.add(data);
}

/** Fetch all meetings sorted newest first */
export async function getAllMeetings(): Promise<Meeting[]> {
  return db.meetings.orderBy("createdAt").reverse().toArray();
}

/** Search meetings by title or transcript content */
export async function searchMeetings(query: string): Promise<Meeting[]> {
  const q = query.toLowerCase();
  return db.meetings
    .filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.transcript.toLowerCase().includes(q)
    )
    .toArray();
}

/** Delete a meeting by id */
export async function deleteMeeting(id: number): Promise<void> {
  return db.meetings.delete(id);
}

/** Update a meeting's title */
export async function updateMeetingTitle(id: number, newTitle: string): Promise<number> {
  return db.meetings.update(id, { title: newTitle });
}

/** Generate an auto title from the first utterance text */
export function generateTitle(transcript: string, fileName: string): string {
  const firstSentence = transcript.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 10 && firstSentence.length < 80) {
    return firstSentence;
  }
  // Fallback: use file name without extension
  return fileName.replace(/\.[^/.]+$/, "") || "Meeting";
}
