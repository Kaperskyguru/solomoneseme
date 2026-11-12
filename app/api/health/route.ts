import { stat, readFile } from "node:fs/promises";
import { snapshotFile } from "@/lib/snapshot/store";

export const dynamic = "force-dynamic";

async function ageMinutes(): Promise<number | null> {
  try {
    const file = snapshotFile();
    let at: number | null = null;
    try {
      const generatedAt = (JSON.parse(await readFile(file, "utf8")) as { generatedAt?: string }).generatedAt;
      const t = generatedAt ? Date.parse(generatedAt) : NaN;
      if (Number.isFinite(t)) at = t;
    } catch {
      at = (await stat(file)).mtimeMs;
    }
    return at === null ? null : Math.max(0, Math.round((Date.now() - at) / 60000));
  } catch {
    return null;
  }
}

export async function GET() {
  return Response.json({ ok: true, snapshotAgeMinutes: await ageMinutes() });
}
