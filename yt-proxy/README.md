# YouTube API Proxy

A minimal Express proxy for a curated set of YouTube Data API v3 endpoints.

## Local development

```bash
npm install
YT_API_KEY=your-key-here node server.js
```

By default the server listens on port `3000`. Configure `ALLOWED_ORIGIN` to restrict browser access and `PORT` to customize the listener port. Set `PIPED_INSTANCE` to point at an alternative [Piped](https://github.com/TeamPiped/Piped) deployment if you want to proxy video streams through a non-default host.

If you update dependencies, re-run `npm install` (or `npm install --package-lock-only`) so `package-lock.json` stays in sync for deployments.

## Deployment on Render

- **Build command:** `npm ci`
- **Start command:** `node server.js`
- Set `YT_API_KEY`, `ALLOWED_ORIGIN`, `PIPED_INSTANCE` (optional), and `PORT` (optional) in your Render environment.

## Example request

```bash
curl "https://<render-url>/api/yt/search?part=snippet&q=cats"
```

### Streaming proxy

The `/api/piped/streams/:videoId` endpoint relays JSON metadata from the configured Piped instance and can be used by clients to discover direct MP4 or HLS streams for playback in a custom player.
