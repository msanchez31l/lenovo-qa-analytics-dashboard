# Lenovo QA Analytics Dashboard

Static React + Vite dashboard hosted on GitHub Pages.

- **Demo mode** contains only synthetic examples, including DXGWP, EPM, AGWP and five QA engineers.
- **Import JSON** reads a file locally in your browser using FileReader; it does not send it to a server or save it remotely.
- Status categories: QA, Review, In Progress, To Do, Done, Closed.
- Project, engineer and status filters; charts; count exports in CSV; Jira ticket explorer when issue-level records exist.
- No backend or live Jira connection; daily updates and six-month Jira transition filtering remain the responsibility of the existing reporting agent.
- This public GitHub Pages deployment is **not** an authenticated corporate dashboard.

## Local development

```sh
cd lenovo-qa-analytics
npm install
npm run dev
```

## GitHub Pages

Repository **Settings → Pages → Build and deployment → GitHub Actions**.
The workflow deploys on every push to main.

Expected URL: https://msanchez31l.github.io/lenovo-qa-analytics-dashboard/

## Input JSON

Normalized: `{"capturedAt":"2026-11-03T00:00:00Z","entries":[{"name":"Sample QA","project":"AGWP","counts":{"qa":1,"review":2,"inProgress":0,"toDo":2,"done":12,"closed":5},"tickets":[]}]}`

Also supports agent-style nested user/project/status objects, with arrays of Jira issues or integer counts. Legacy status names like `QA/Testing` are recognized.

**Security:** Never commit real Lenovo issue data, SSO cookies, passwords, webhooks, or tokens. Import on a public externally hosted page only if company policy authorizes use. Data is kept in the browser's current tab and disappears on refresh.

**Metric caveat:** counts mean issues matching owner/status filters, not personal productivity or actual ticket-close attribution; Done/Closed six-month selection comes from the source report.

## Real Jira data — local agent bridge (private, manual)

The static website never authenticates to Jira. Continue running the existing local QA Status Reporting Agent, which uses corporate SSO and produces a JSON report.

1. Run the agent locally in its own project (e.g. `npm run report`).
2. Identify the JSON output file it generated.
3. From a local checkout of this dashboard repository, run:

```powershell
node .\lenovo-qa-analytics\scripts\normalize-agent-report.mjs "C:\path\to\agent-output.json" "C:\private\qa-dashboard-report.json"
```

4. Open the hosted dashboard and select **Import JSON**, then choose `C:\private\qa-dashboard-report.json`.

The bridge accepts normalized `entries`, a flat `issues` array with Jira fields, or nested engineer/project/status counts. Because the actual local agent's JSON schema is not in this repository, inspect its output before treating the bridge as validated against your environment. Issue-level sorting, searching, and date filters require individual tickets with `key`, `summary`, and `updated`; aggregate-only reports cannot provide them.

**Never upload real Jira reports to this public repository, commit them as demo data, or deploy them as site assets.** Imported files are read by the browser only. The Google Fonts CSS loaded by the page is an external asset request; use an approved internal hosting environment if company policy forbids using corporate data in a public-hosted application.

## Appearance

Use the **Dark / Light** toggle in the dashboard header. The setting persists in local browser storage and does not contain report data.

## What is not connected

- No live Jira API or Teams webhook runs from GitHub Pages.
- No unattended refresh of real corporate data.
- No shared team database or authenticated access.
- No guarantee of Done/Closed six-month transition filtering unless the agent has already enforced it.

For automatic corporate reporting, use a company-approved internal endpoint or storage and an authenticated frontend; do not use a public GitHub Pages JSON asset.

## Schedule local Jira agent (Argentina)

From Windows PowerShell in the repository checkout:

```powershell
.\lenovo-qa-analytics\scripts\install-jira-refresh.ps1 -AgentPath "C:\code\lenovo-qa-status-agent"
```

This registers Windows Task Scheduler jobs at **06:00, 12:00, 18:00** in the PC's **local time zone**. Set Windows to Argentina Standard Time if those times should follow Buenos Aires time. The computer must be on and the corporate Jira SSO session must still be valid. This has **not** been executed on your PC; it is a setup script. The schedule runs the existing agent's `npm run report`, not a remote dashboard refresh. It does not transfer corporate data to the public site.
