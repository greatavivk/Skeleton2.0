# YouTube API Proxy

A minimal Express proxy for a curated set of YouTube Data API v3 endpoints.

## Local development

```bash
npm install
YT_API_KEY=your-key-here node server.js
```

By default the server listens on port `3000`. Configure `ALLOWED_ORIGIN` to restrict browser access and `PORT` to customize the listener port.

## Deployment on Render

- **Build command:** `npm ci`
- **Start command:** `node server.js`
- Set `YT_API_KEY`, `ALLOWED_ORIGIN`, and `PORT` (optional) in your Render environment.

## Example request

```bash
curl "https://<render-url>/api/yt/search?part=snippet&q=cats"
```
