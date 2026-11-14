export type MbStats = { learners: number };

const valid = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

export async function fetchMbStats(): Promise<MbStats> {
  const base = process.env.MB_API_URL;
  if (!base) throw new Error("MB_API_URL is not set");
  const res = await fetch(`${base.replace(/\/+$/, "")}/public/stats`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`MasteringBackend stats failed with status ${res.status}`);
  const body = (await res.json().catch(() => null)) as { data?: { learners?: unknown } } | null;
  const d = body?.data;
  if (!d || !valid(d.learners)) throw new Error("MasteringBackend stats returned an unexpected response");
  return { learners: d.learners };
}
