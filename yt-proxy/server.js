import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import { readFileSync } from 'fs';

dotenv.config();

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN;
const apiKey = process.env.YT_API_KEY;
const port = Number(process.env.PORT) || 3000;
const requireTls = process.env.REQUIRE_TLS === 'true';
const tlsKeyPath = process.env.TLS_KEY_FILE;
const tlsCertPath = process.env.TLS_CERT_FILE;
const tlsCaPath = process.env.TLS_CA_FILE;
const serverTimeoutMs = Number(process.env.SERVER_TIMEOUT_MS) || 15000;

const allowedResources = new Set(['search', 'videos', 'channels', 'playlists']);

const safeParams = {
  search: new Set([
    'channelId',
    'channelType',
    'eventType',
    'forContentOwner',
    'forDeveloper',
    'forMine',
    'location',
    'locationRadius',
    'maxResults',
    'onBehalfOfContentOwner',
    'order',
    'pageToken',
    'part',
    'publishedAfter',
    'publishedBefore',
    'q',
    'regionCode',
    'relatedToVideoId',
    'relevanceLanguage',
    'safeSearch',
    'topicId',
    'type',
    'videoCaption',
    'videoCategoryId',
    'videoDefinition',
    'videoDimension',
    'videoDuration',
    'videoEmbeddable',
    'videoLicense',
    'videoSyndicated',
    'videoType',
    'fields'
  ]),
  videos: new Set([
    'chart',
    'hl',
    'id',
    'locale',
    'maxHeight',
    'maxResults',
    'maxWidth',
    'myRating',
    'pageToken',
    'part',
    'regionCode',
    'videoCategoryId',
    'fields'
  ]),
  channels: new Set([
    'categoryId',
    'fields',
    'forUsername',
    'hl',
    'id',
    'locale',
    'managedByMe',
    'maxResults',
    'mine',
    'mySubscribers',
    'onBehalfOfContentOwner',
    'pageToken',
    'part'
  ]),
  playlists: new Set([
    'channelId',
    'fields',
    'hl',
    'id',
    'maxResults',
    'mine',
    'onBehalfOfContentOwner',
    'pageToken',
    'part'
  ])
};

app.disable('x-powered-by');

const helmetMiddleware = helmet({
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

app.use(helmetMiddleware);
app.use(morgan('combined'));

if (requireTls) {
  app.enable('trust proxy');
  app.use((req, res, next) => {
    if (req.secure) {
      return next();
    }

    const host = req.headers.host;
    if (!host) {
      return res.status(400).json({ error: 'HTTPS required' });
    }

    return res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}

app.use((req, res, next) => {
  if (!allowedOrigin) {
    return next();
  }

  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;

  if (!origin) {
    return next();
  }

  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  }

  return res.status(403).json({ error: 'Origin not allowed' });
});

app.get('/', (req, res) => {
  res.send('ok');
});

app.get('/api/yt/:resource', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: 'YT_API_KEY is not configured on the server.' });
  }

  const { resource } = req.params;

  if (!allowedResources.has(resource)) {
    return res.status(400).json({ error: 'Unsupported resource' });
  }

  const params = new URLSearchParams();
  const allowedParams = safeParams[resource];
  let forwardedParamCount = 0;

  for (const [key, value] of Object.entries(req.query)) {
    if (!allowedParams.has(key)) {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (typeof item === 'string' && item.length > 0) {
        params.append(key, item);
        forwardedParamCount += 1;
      }
    }
  }

  if (forwardedParamCount === 0) {
    return res.status(400).json({ error: 'No allowed query parameters provided' });
  }

  params.set('key', apiKey);

  const youtubeUrl = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  params.forEach((value, key) => {
    youtubeUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(youtubeUrl.href, {
      headers: { Accept: 'application/json' }
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      return res
        .status(502)
        .json({ error: 'Invalid JSON response from YouTube API', details: parseError.message });
    }

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reach YouTube API', details: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

let server;

const buildHttpsServer = () => {
  if (!tlsKeyPath || !tlsCertPath) {
    if (requireTls) {
      console.error('REQUIRE_TLS is true but TLS_KEY_FILE or TLS_CERT_FILE is missing.');
      process.exit(1);
    }

    return null;
  }

  try {
    const httpsOptions = {
      key: readFileSync(tlsKeyPath),
      cert: readFileSync(tlsCertPath),
      minVersion: 'TLSv1.2'
    };

    if (tlsCaPath) {
      httpsOptions.ca = readFileSync(tlsCaPath);
    }

    return https.createServer(httpsOptions, app);
  } catch (error) {
    console.error('Failed to load TLS materials:', error.message);
    process.exit(1);
  }
};

server = buildHttpsServer();

if (!server) {
  server = http.createServer(app);
}

server.setTimeout(serverTimeoutMs);

server.listen(port, () => {
  const protocol = server instanceof https.Server ? 'https' : 'http';
  console.log(`YouTube proxy listening on ${protocol.toUpperCase()} port ${port}`);
});
