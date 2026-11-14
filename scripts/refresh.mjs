// Runs inside the container (Coolify Scheduled Task): node scripts/refresh.mjs
// Calls the local refresh route with CRON_SECRET; exits non-zero on any failure.
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}
const url = process.env.REFRESH_URL || `http://127.0.0.1:${process.env.PORT || 3000}/api/refresh`;
try {
  const res = await fetch(url, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(30_000) });
  // 202 = accepted (started or already running); the work continues in the server.
  let body = {};
  try { body = await res.json(); } catch {}
  const out = { status: res.status };
  for (const k of ["started", "alreadyRunning", "errors"]) if (k in body) out[k] = body[k];
  console.log(JSON.stringify(out));
  process.exit(res.status === 202 || res.status === 200 ? 0 : 1);
} catch (err) {
  console.error("refresh failed:", err instanceof Error ? err.name : "error");
  process.exit(1);
}
