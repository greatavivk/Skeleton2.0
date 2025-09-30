import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN;
const apiKey = process.env.YT_API_KEY;
const port = Number(process.env.PORT) || 3000;

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

app.use(helmet());
app.use(morgan('combined'));

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
  youtubeUrl.search = params.toString();

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

app.listen(port, () => {
  console.log(`YouTube proxy listening on port ${port}`);
});
