// Server-side race status check used to gate picks visibility/submission.
// A race is "started" once the lap-times feed shows laps completed (green flag).
// Falls back to the scheduled start time only when the lap-times feed is
// unavailable (e.g. race types that never get lap data).
//
// Results are cached briefly in-memory so the 10s client polling doesn't
// hammer NASCAR's CDN.

const CACHE_TTL_MS = 30_000;
const cache = new Map<number, { started: boolean; expires: number }>();

export async function hasRaceStarted(raceId: number): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(raceId);
  if (hit && hit.expires > now) return hit.started;

  const started = await checkRaceStarted(raceId);
  cache.set(raceId, { started, expires: now + CACHE_TTL_MS });
  return started;
}

async function checkRaceStarted(raceId: number): Promise<boolean> {
  try {
    const res = await fetch(
      `https://cf.nascar.com/cacher/2026/1/${raceId}/lap-times.json`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      const flags = data?.flags || [];
      const lastFlag = flags[flags.length - 1];
      // The feed exists: trust it. Laps completed means the green flag flew.
      return !!lastFlag && (lastFlag.LapsCompleted || 0) > 0;
    }
  } catch {
    // fall through to the time-based fallback
  }

  // Fallback: scheduled start time (race types without lap data)
  try {
    const res = await fetch(
      "https://cf.nascar.com/cacher/2026/1/schedule-feed.json",
      { next: { revalidate: 3600 } }
    );
    const schedule = await res.json();
    // The feed has multiple entries per race (practice, qualifying, race) -
    // use the actual race event, not the weekend's first session.
    const race = (Array.isArray(schedule) ? schedule : []).find(
      (e: any) =>
        e.race_id === raceId &&
        (e.event_name === "Race" || e.event_name?.includes("Qualifying Race"))
    );
    if (race?.start_time_utc) {
      // start_time_utc is UTC but lacks a Z suffix, so parse it explicitly
      const utc = race.start_time_utc.endsWith("Z")
        ? race.start_time_utc
        : race.start_time_utc + "Z";
      return Date.now() >= new Date(utc).getTime();
    }
  } catch {
    // ignore
  }
  return false;
}
