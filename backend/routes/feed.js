import express from 'express';
import Feed from '../models/Feed.js';

const router = express.Router();

// In-memory cache with TTL
const cache = {
  data: new Map(),
  set(key, value, ttl) {
    this.data.set(key, { value, expiry: Date.now() + ttl });
  },
  get(key) {
    const item = this.data.get(key);
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    this.data.delete(key);
    return null;
  },
};

const CACHE_TTL = 60 * 1000; // 1 minute

// Async wrapper to handle errors
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// MongoDB query builder
const buildFeedQuery = ({ sources, timeRange }) => {
  const query = {};

  if (sources?.length) {
    query.source = { $in: sources.map(s => s.toLowerCase()) };
  }

  if (timeRange) {
    const now = new Date();
    const timeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    const range = timeMap[timeRange];
    if (range) {
      query.timestamp = { $gte: new Date(now.getTime() - range) };
    }
  }

  return query;
};

// Sorting logic
const buildSortOptions = sortBy => {
  switch (sortBy) {
    case 'engagement':
      return { engagement: -1 };
    case 'time':
    default:
      return { timestamp: -1 };
  }
};

// Route: GET /feeds
router.get('/', asyncHandler(async (req, res) => {
  const {
    sources,
    timeRange,
    sortBy = 'time',
    page = 1,
    limit = 20
  } = req.query;

  const options = {
    sources: sources ? sources.split(',') : [],
    timeRange,
    sortBy,
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const cacheKey = JSON.stringify(options);
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const query = buildFeedQuery(options);
  const sort = buildSortOptions(options.sortBy);

  const [feeds, total] = await Promise.all([
    Feed.find(query)
      .sort(sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .lean(),
    Feed.countDocuments(query)
  ]);

  const response = {
    feeds,
    pagination: {
      currentPage: options.page,
      totalPages: Math.ceil(total / options.limit),
      totalItems: total
    }
  };

  cache.set(cacheKey, response, CACHE_TTL);

  res.json(response);
}));

// Route: GET /feeds/:source
router.get('/:source', asyncHandler(async (req, res) => {
  const { source } = req.params;
  const feeds = await Feed.find({ source: source.toLowerCase() }).lean();
  res.json(feeds);
}));

export default router;
