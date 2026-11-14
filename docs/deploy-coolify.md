# Deploying to a VPS with Coolify

1. Push the repo (branch to deploy) to GitHub.
2. Coolify -> Project -> **New Resource** -> Public/Private Repository (GitHub) -> pick the repo and branch.
3. **Build Pack: Dockerfile** (root `Dockerfile`). Ports Exposes: `3000`. The build needs outbound network (Geist is fetched from Google Fonts at build time).
4. **Health check**: host `127.0.0.1`, path `/api/health`, port 3000 (returns `{"ok":true,"snapshotAgeMinutes":N|null}`). The Dockerfile also declares a HEALTHCHECK.
5. **Persistent Storage**: add a volume mounted at `/app/data`. The snapshot lives at `/app/data/snapshot.json` (override with `SNAPSHOT_FILE`). Use a Coolify named volume; for a bind mount run `chown 1001:1001` on the host directory (the app runs as uid 1001). Without the volume each redeploy starts from the seed data baked into the image until the startup rebuild finishes (about 5 minutes).
6. **Environment variables** (runtime only: untick **Build Variable** for every secret; production values; never set `SNAPSHOT_SAMPLE` / `SNAPSHOT_LOCAL`):
   - Secret: `LEMONSQUEEZY_API_KEY`, `ASYNCPAY_SECRET_KEY`, `GUMROAD_ACCESS_TOKEN`, `YOUTUBE_API_KEY`, `STRAPI_TOKEN`
   - Not secret: `BASE_ENDPOINT_URL` (`https://cms.masteringbackend.com/api`), `MB_API_URL` (`https://prod.masteringbackend.com/api/v3`; needs the academy `/public/stats` endpoint, PR #412, deployed first), `SNAPSHOT_FILE` (optional)
7. **Data refresh is automatic** (no cron, no Scheduled Task). On startup the server rebuilds the data from the providers in the background (about 5 minutes, mostly the all-time Gumroad sales crawl). Until the first build finishes the page shows the stored snapshot, or on a fresh volume the seed (`seed/snapshot.json`, committed and baked into the image). After that, any visit to data older than an hour starts a background rebuild; visitors never wait for it. Logs show `refresh: done, failed sections: ...`.
8. **Keeping the seed current** (optional): `npm run snapshot:local` rewrites both `data/snapshot.json` and `seed/snapshot.json`; commit the seed.
9. **Domain**: in Coolify add `https://solomoneseme.com` and `https://www.solomoneseme.com`; DNS A records for both (`@` and `www`) -> the VPS IP. Coolify issues TLS (Let's Encrypt) automatically. Configure a redirect www -> apex.
10. **Monitoring**: `snapshotAgeMinutes` is `null` until the first live build is written; alert if it stays above 180 (refreshes failing, see the `refresh:` log lines).
11. **Rollback**: Coolify -> Deployments -> redeploy a previous successful deployment. The snapshot volume is untouched by rollbacks.

## Caching note

The home page is `force-dynamic`: it reads the small snapshot file on every request, so a refresh shows up immediately with no ISR or `revalidatePath`.
