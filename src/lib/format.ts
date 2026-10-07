import type { Post } from '@/models';

const one = (x: number) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toString();

export const compact = (n: number) => (n >= 1e6 ? `${one(n / 1e6)}M` : n >= 1e3 ? `${one(n / 1e3)}K` : String(n));

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const dayDiff = (d: Date, from = new Date()) => Math.round((startOfDay(d).getTime() - startOfDay(from).getTime()) / 864e5);

export const sameDay = (a: Date, b: Date) => dayDiff(a, b) === 0;

export function dayLabel(d: Date) {
  const diff = dayDiff(d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export const when = (iso: string) => {
  const d = new Date(iso);
  return `${dayLabel(d)}, ${time(d)}`;
};

export const longDate = (d: Date) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** "in 2h 14m", "in 3d" — time until a future date. */
export function countdown(iso: string) {
  const m = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60e3));
  if (m < 60) return `in ${m}m`;
  if (m < 24 * 60) return `in ${Math.floor(m / 60)}h ${m % 60}m`;
  return `in ${Math.round(m / 1440)}d`;
}

export const duration = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** The date a post belongs to on timelines and the calendar. Drafts have none. */
export function postDate(p: Post): Date | undefined {
  const iso = p.status === 'draft' ? undefined : p.status === 'scheduled' ? p.scheduledAt : (p.publishedAt ?? p.scheduledAt);
  return iso ? new Date(iso) : undefined;
}

/** One-line "when" for lists: "Tomorrow, 9:00 AM", "2h ago", "Edited 3d ago". */
export function postWhen(p: Post) {
  if (p.status === 'draft') return `Edited ${ago(p.updatedAt)}`;
  if (p.status === 'publishing') return 'Publishing now';
  const d = postDate(p);
  if (!d) return '';
  return p.status === 'scheduled' ? when(d.toISOString()) : ago(d.toISOString());
}
