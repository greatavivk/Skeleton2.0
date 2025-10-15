# YouTube API Proxy

A minimal Express proxy for a curated set of YouTube Data API v3 endpoints.

## Local development

```bash
npm install
YT_API_KEY=your-key-here node server.js
```

By default the server listens on port `3000`. Configure `ALLOWED_ORIGIN` to restrict browser access and `PORT` to customize the listener port. For hardened transport security you can run the proxy over HTTPS by supplying the following environment variables:

- `TLS_KEY_FILE`: absolute path to your private key (PEM).
- `TLS_CERT_FILE`: absolute path to the certificate that pairs with the private key (PEM).
- `TLS_CA_FILE` *(optional)*: bundle of intermediate certificates to present to clients.
- `REQUIRE_TLS`: set to `true` to require HTTPS and redirect any plain HTTP requests to the secure endpoint.
- `SERVER_TIMEOUT_MS` *(optional)*: request timeout (defaults to 15000 ms) to reduce the impact of slow‑loris style attacks.

When `REQUIRE_TLS` is enabled the server will refuse to start unless both `TLS_KEY_FILE` and `TLS_CERT_FILE` are present, ensuring it never falls back to an insecure transport. Behind a reverse proxy or load balancer you can omit the TLS files and terminate TLS at the edge; keep `REQUIRE_TLS` unset in that scenario.

If you update dependencies, re-run `npm install` (or `npm install --package-lock-only`) so `package-lock.json` stays in sync for deployments.

## Deployment on Render

- **Build command:** `npm ci`
- **Start command:** `node server.js`
- Set `YT_API_KEY`, `ALLOWED_ORIGIN`, and `PORT` (optional) in your Render environment.

## Example request

```bash
curl "https://<render-url>/api/yt/search?part=snippet&q=cats"
```
