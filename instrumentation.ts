// Runs once when the server starts: build fresh data right after every deploy, no cron needed.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { refreshSnapshot } = await import("@/lib/snapshot/refresh");
    void refreshSnapshot();
  }
}
