# Lenovo QA Analytics — password-only deployment

No VPN, Microsoft login or Cloudflare account required. This is a **self-hosted application package**, not a deployed public site.

## What is included
- `private-server.mjs`: Node.js HTTP backend; shared-password login with scrypt hash, signed HttpOnly session cookie, report upload token, protected `/api/report`, basic rate limiting, no unauthenticated static assets.
- `make-password-hash.mjs`: generates the password hash and independent secrets.
- `publish-report.ps1`: publishes the existing private normalized Jira report via HTTPS.
- `install-publish-task.ps1`: creates three Windows scheduled upload tasks at 06:15, 12:15, 18:15, allowing the existing Jira report tasks to finish first.
- `start-local-private.ps1`: runs a local test with secrets from a user-managed environment file.
- `env.example`: environment variable names, **no real secrets**.

## Integration with existing project
1. Copy `private-server.mjs` and `make-password-hash.mjs` into `C:\code\lenovo-qa-analytics-dashboard\lenovo-qa-analytics\scripts`.
2. From `C:\code\lenovo-qa-analytics-dashboard\lenovo-qa-analytics`, run `npm install` and `npm run build`.
3. Run `node scripts/make-password-hash.mjs`, choose a unique password of 14+ characters, and store the printed values **outside the repository** in a private configuration. Do not share the upload token with engineers.
4. Set `DASHBOARD_PASSWORD_HASH`, `SESSION_SECRET`, `REPORT_UPLOAD_TOKEN`, `REPORT_PATH`, `DIST_DIR`, `HOST`, `PORT`. For a local test, run `node scripts/private-server.mjs` and visit `http://127.0.0.1:4174/lenovo-qa-analytics-dashboard/`.
5. For an online site, provision an independent server with Node.js 22+, HTTPS reverse proxy, a domain, persistent private storage and environment secrets. Set `NODE_ENV=production`, `TRUST_HTTPS_PROXY=true`, `PUBLIC_HOST=your-domain.example`, `PUBLIC_ORIGIN=https://your-domain.example`, `HOST=127.0.0.1`. The reverse proxy must forward to `127.0.0.1:4174` and serve **no** static report files directly.
6. After HTTPS is working, on Windows set `REPORT_UPLOAD_TOKEN` as a persistent **user-level secret** and run `publish-report.ps1 -ServerUrl https://your-domain.example` once. Verify the server returns `{ok:true}` and the dashboard shows the real report after login.
7. Run `install-publish-task.ps1 -ServerUrl https://your-domain.example -ScriptsPath C:\path\to\this\folder` to schedule uploads. The script does **not** modify the existing Jira refresh tasks.
8. **Do not publish reports or secrets to GitHub Pages.** The current Pages URL remains demo-only. Share the **new authenticated HTTPS URL** with engineers.

## Security and limitations
The login protects the dashboard and report on the **new Node server**; a password prompt on GitHub Pages alone would not. This starter uses an in-memory per-IP rate limiter; for internet production use reverse-proxy rate limiting, TLS, logging, backups, monitoring and a properly restricted host firewall. Shared passwords have no individual accountability. Do not publish corporate data without appropriate approval. The report can contain ticket details and names; review what is uploaded. Keep `REPORT_PATH` outside the publicly served `dist` directory. Rotate shared passwords and tokens if compromised.

The Windows upload tasks run 15 minutes after the Jira refresh jobs; if refresh takes longer, the uploader could send an older report. Verify timestamps and adjust task times to match actual job duration.
