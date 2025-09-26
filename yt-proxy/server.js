import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN;
const apiKey = process.env.YT_API_KEY;
const port = process.env.PORT || 3000;

const allowedResources = new Set(['search', 'videos', 'channels', 'playlists']);

const safeParams = {
  search: [
    'part',
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
  ],
  videos: [
    'part',
    'chart',
    'hl',
    'id',
    'locale',
    'maxHeight',
    'maxResults',
    'maxWidth',
    'myRating',
    'pageToken',
    'regionCode',
    'videoCategoryId',
    'fields'
  ],
  channels: [
    'part',
    'categoryId',
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
    'fields'
  ],
  playlists: [
    'part',
    'channelId',
    'hl',
    'id',
    'maxResults',
    'mine',
    'onBehalfOfContentOwner',
    'pageToken',
    'fields'
  ]
};

app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

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
  const allowed = safeParams[resource];

  for (const [key, value] of Object.entries(req.query)) {
    if (!allowed.includes(key)) {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (typeof item === 'string') {
        params.append(key, item);
      }
    }
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

    const data = await response.json();
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
