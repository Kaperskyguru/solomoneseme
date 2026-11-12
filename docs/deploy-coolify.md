# Deploying to a VPS with Coolify

1. Push the repo (branch to deploy) to GitHub.
2. Coolify -> Project -> **New Resource** -> Public/Private Repository (GitHub) -> pick the repo and branch.
3. **Build Pack: Dockerfile** (root `Dockerfile`). Ports Exposes: `3000`. The build needs outbound network (Geist is fetched from Google Fonts at build time).
4. **Health check**: host `127.0.0.1`, path `/api/health`, port 3000 (returns `{"ok":true,"snapshotAgeMinutes":N|null}`). The Dockerfile also declares a HEALTHCHECK.
5. **Persistent Storage**: add a volume mounted at `/app/data`. The snapshot lives at `/app/data/snapshot.json` (override with `SNAPSHOT_FILE`). Use a Coolify named volume; for a bind mount run `chown 1001:1001` on the host directory (the app runs as uid 1001). Without the volume the data is lost on every redeploy until the next refresh.
6. **Environment variables** (runtime only: untick **Build Variable** for every secret; production values; never set `SNAPSHOT_SAMPLE` / `SNAPSHOT_LOCAL`):
   - Secret: `CRON_SECRET`, `LEMONSQUEEZY_API_KEY`, `ASYNCPAY_SECRET_KEY`, `GUMROAD_ACCESS_TOKEN`, `YOUTUBE_API_KEY`, `STRAPI_TOKEN`
   - Not secret: `BASE_ENDPOINT_URL` (`https://cms.masteringbackend.com/api`), `MB_API_URL` (needs the academy `/public/stats` endpoint deployed first), `SNAPSHOT_FILE` (optional)
7. **Scheduled Task** (resource -> Scheduled Tasks): frequency `0 * * * *` (hourly), command `node scripts/refresh.mjs`. It runs inside the container, reads `CRON_SECRET` from the env, calls `http://127.0.0.1:3000/api/refresh` and exits non-zero on failure (no curl needed). The route returns 202 immediately and the refresh runs in the background, so task timeouts are not an issue.
8. **First run**: deploy, then run the Scheduled Task once manually (Execute now) so `/app/data/snapshot.json` exists. Until then the page renders with no data.
9. **Domain**: in Coolify add `https://solomoneseme.com` and `https://www.solomoneseme.com`; DNS A records for both (`@` and `www`) -> the VPS IP. Coolify issues TLS (Let's Encrypt) automatically. Configure a redirect www -> apex.
10. **Monitoring**: alert if `/api/health` reports `snapshotAgeMinutes` > 180 (or `null`).
11. **Rollback**: Coolify -> Deployments -> redeploy a previous successful deployment. The snapshot volume is untouched by rollbacks.

## Caching note

The home page is `force-dynamic`: it reads the small snapshot file on every request, so a refresh shows up immediately with no ISR or `revalidatePath`. The refresh route is dynamic too and never touches the page cache.
