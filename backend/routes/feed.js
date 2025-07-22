import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Feed cache with TTL
const feedCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Feed filtering and sorting utility
const filterAndSortFeeds = (feeds, options) => {
  let filtered = [...feeds];

  // Apply source filter
  if (options.sources && options.sources.length > 0) {
    filtered = filtered.filter(feed => 
      options.sources.includes(feed.source.toLowerCase())
    );
  }

  // Apply time range filter
  if (options.timeRange) {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    filtered = filtered.filter(feed => {
      const feedTime = new Date(feed.timestamp).getTime();
      return (now - feedTime) <= ranges[options.timeRange];
    });
  }

  // Apply sorting
  if (options.sortBy) {
    filtered.sort((a, b) => {
      switch (options.sortBy) {
        case 'engagement':
          return b.engagement - a.engagement;
        case 'time':
          return new Date(b.timestamp) - new Date(a.timestamp);
        default:
          return 0;
      }
    });
  }

  return filtered;
};

// Get feeds with filtering and pagination
router.get('/', asyncHandler(async (req, res) => {
  const {
    sources,
    timeRange,
    sortBy = 'time',
    page = 1,
    limit = 10
  } = req.query;

  // Check cache first
  const cacheKey = JSON.stringify({ sources, timeRange, sortBy, page, limit });
  const cached = feedCache.get(cacheKey);
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return res.json(cached.data);
  }

  // Read and process feeds
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', 'mock_feeds.json'), 'utf-8')
  );

  // Apply filters and sorting
  const filtered = filterAndSortFeeds(data, {
    sources: sources ? sources.split(',') : null,
    timeRange,
    sortBy
  });

  // Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedFeeds = filtered.slice(start, end);

  const response = {
    feeds: paginatedFeeds,
    total: filtered.length,
    page: Number(page),
    totalPages: Math.ceil(filtered.length / limit)
  };

  // Update cache
  feedCache.set(cacheKey, {
    data: response,
    timestamp: Date.now()
  });

  res.json(response);
}));

// Get feeds by source
router.get('/:source', (req, res) => {
  try {
    const { source } = req.params;
    const data = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'mock_feeds.json'), 'utf-8')
    );
    const filteredData = data.filter(item => 
      item.source.toLowerCase() === source.toLowerCase()
    );
    res.json(filteredData);
  } catch (error) {
    console.error('Feed source error:', error);
    res.status(500).json({ error: 'Failed to fetch source feeds' });
  }
});

export default router;
