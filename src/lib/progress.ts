/**
 * Lesson progress.
 *
 * Local `localStorage` is the source of truth for anonymous/offline play; when a
 * playable (non-anonymous) KruMath Supabase user is signed in, progress is
 * merged with and synced to the shared KruMath database (spec section 15).
 *
 * Cloud operations live behind `khmer_typing_progress` + RLS, scoped to
 * `auth.uid()` and rejecting anonymous JWTs. See
 * `supabase/migrations/0001_khmer_typing_progress.sql`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";

export type LessonRecord = {
  completed: boolean;
  bestWpm: number;
  bestAccuracy: number;
};

export type ProgressMap = Record<string, LessonRecord>;

const STORAGE_KEY = "krumath-khmer-typing-progress-v1";
const TABLE = "khmer_typing_progress";
const SYNC_DEBOUNCE_MS = 800;

export function lessonKey(levelId: number, lessonId: string): string {
  return `${levelId}:${lessonId}`;
}

function read(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function write(map: ProgressMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — progress is best effort */
  }
}

/**
 * Merge local and remote progress. `completed` is a union; best scores keep the
 * higher value per lesson.
 */
export function mergeProgress(local: ProgressMap, remote: ProgressMap): ProgressMap {
  const merged: ProgressMap = { ...local };

  for (const [key, remoteRecord] of Object.entries(remote)) {
    const localRecord = merged[key];
    merged[key] = localRecord
      ? {
          completed: localRecord.completed || remoteRecord.completed,
          bestWpm: Math.max(localRecord.bestWpm, remoteRecord.bestWpm),
          bestAccuracy: Math.max(localRecord.bestAccuracy, remoteRecord.bestAccuracy),
        }
      : remoteRecord;
  }

  return merged;
}

/**
 * `.client` modules are import-protected in the server environment, so the
 * browser-client calls are wrapped in `createClientOnlyFn` (the pattern the
 * TanStack Start plugin recognises). Public helpers below are additionally
 * guarded by `typeof window` so they are safe no-ops during SSR.
 */
const fetchRemoteProgress = createClientOnlyFn(
  async (userId: string): Promise<ProgressMap | null> => {
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase.client");
      const { data, error } = await getSupabaseBrowserClient()
        .from(TABLE)
        .select("progress")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;
      const row = data as { progress: ProgressMap | null };
      return row.progress ?? null;
    } catch {
      return null;
    }
  },
);

const pushRemoteProgress = createClientOnlyFn(
  async (userId: string, progress: ProgressMap): Promise<void> => {
    try {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase.client");
      await getSupabaseBrowserClient()
        .from(TABLE)
        .upsert(
          { user_id: userId, progress, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    } catch {
      /* cloud sync is best-effort — never block practice */
    }
  },
);

/** Load the signed-in user's progress, or null when unavailable. */
export async function loadProgressFromSupabase(userId: string): Promise<ProgressMap | null> {
  if (typeof window === "undefined" || !userId) return null;
  return fetchRemoteProgress(userId);
}

/** Upsert the signed-in user's progress. Best-effort; local storage stays authoritative. */
export async function syncProgressToSupabase(
  userId: string,
  progress: ProgressMap,
): Promise<void> {
  if (typeof window === "undefined" || !userId) return;
  await pushRemoteProgress(userId, progress);
}

export function useProgress(userId: string | null) {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loaded, setLoaded] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load local progress, then merge any cloud progress for the signed-in user.
  useEffect(() => {
    let cancelled = false;
    const local = read();
    setProgress(local);
    setLoaded(true);

    if (!userId) return;

    void (async () => {
      const remote = await loadProgressFromSupabase(userId);
      if (cancelled || !remote) return;
      const merged = mergeProgress(local, remote);
      write(merged);
      setProgress(merged);
      await syncProgressToSupabase(userId, merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Flush any pending debounced sync on unmount.
  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  const record = useCallback(
    (levelId: number, lessonId: string, result: { wpm: number; accuracy: number }) => {
      setProgress((prev) => {
        const key = lessonKey(levelId, lessonId);
        const existing = prev[key];
        const next: ProgressMap = {
          ...prev,
          [key]: {
            completed: true,
            bestWpm: Math.max(existing?.bestWpm ?? 0, Math.round(result.wpm)),
            bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, Math.round(result.accuracy)),
          },
        };
        write(next);

        if (userId) {
          if (syncTimer.current) clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            void syncProgressToSupabase(userId, next);
          }, SYNC_DEBOUNCE_MS);
        }

        return next;
      });
    },
    [userId],
  );

  return { progress, loaded, record };
}

export function levelCompletion(
  progress: ProgressMap,
  levelId: number,
  lessonIds: string[],
): number {
  if (lessonIds.length === 0) return 0;
  const done = lessonIds.filter((id) => progress[lessonKey(levelId, id)]?.completed).length;
  return Math.round((done / lessonIds.length) * 100);
}
