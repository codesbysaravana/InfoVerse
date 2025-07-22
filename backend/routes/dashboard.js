import express from 'express';
import { db } from '../drizzle/db.js';
import { summaries } from '../drizzle/schema.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await db.select().from(summaries).orderBy(summaries.createdAt);
    res.json({ summaries: data });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get trending topics
router.get('/trends', async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSummaries = await db
      .select()
      .from(summaries)
      .where(summaries.createdAt, '>=', last24Hours)
      .orderBy(summaries.createdAt);
    
    res.json({ trends: recentSummaries });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get source statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db
      .select({
        source: summaries.source,
        count: sql`count(*)::integer`
      })
      .from(summaries)
      .groupBy(summaries.source);
    
    res.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
