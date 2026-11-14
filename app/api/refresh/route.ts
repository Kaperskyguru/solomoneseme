import { timingSafeEqual } from "node:crypto";
import { buildSnapshot } from "@/lib/snapshot/build";
import { writeSnapshot } from "@/lib/snapshot/store";

export const dynamic = "force-dynamic";

/** At most one refresh at a time; the request returns 202 immediately and the run continues in the background. */
let inflight: Promise<void> | null = null;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(): Promise<void> {
  let snapshot;
  try {
    snapshot = await buildSnapshot(new Date());
  } catch {
    // Previous snapshot unreadable: never overwrite good data with a partial one.
    console.error("refresh: snapshot-read");
    return;
  }
  try {
    await writeSnapshot(snapshot);
  } catch {
    console.error("refresh: snapshot-write"); // writeSnapshot already removed its temp file
    return;
  }
  const failed = Object.entries(snapshot.sections).filter(([, s]) => s.error).map(([name]) => name);
  console.log(`refresh: done, failed sections: ${failed.length ? failed.join(",") : "none"}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false }, { status: 401 });
  if (inflight) return Response.json({ ok: true, alreadyRunning: true }, { status: 202 });
  inflight = run().finally(() => { inflight = null; });
  return Response.json({ ok: true, started: true }, { status: 202 });
}
