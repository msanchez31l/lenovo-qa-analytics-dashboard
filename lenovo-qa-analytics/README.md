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
