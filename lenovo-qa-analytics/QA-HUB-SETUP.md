# QA Hub catalog and optional visual login

**Security warning:** GitHub Pages is public. The login only hides the React interface; it is NOT authentication or access control. The JSON, bundles, and any release downloads remain directly accessible. Never use this login to protect confidential information. The hash in access-config.json is publicly retrievable. Use a unique, strong password that is not used elsewhere.

## Enable the login

Create `lenovo-qa-analytics/public/access-config.json` with:
```json
{"passwordSha256":"<64-character lowercase SHA-256 hex>"}
```
Use a unique high-entropy password and generate its SHA-256 locally. Commit the config to trigger GitHub Pages. To rotate, replace the hash and deploy again. The current UI session lasts until the tab session ends or the user signs out; rotation does not revoke already-open sessions.

## Downloads

Upload **only the Windows installer EXE** from each supplied release ZIP, not the 200 MB Electron unpacked directories. GitHub Releases is suitable for hosting the EXEs. Configure download URLs at build time using `VITE_QA_TOOL_DOWNLOADS` as JSON with keys `pdp`, `pictures`, `links`, `performance`. Example:
```json
{"pdp":"https://github.com/OWNER/REPO/releases/download/TAG/installer.exe"}
```
Until URLs are configured, each card displays "Installer pending upload". Do not publish releases before checking distribution permissions.

The existing Jira agent, report publishing and Analytics pages remain unchanged.
