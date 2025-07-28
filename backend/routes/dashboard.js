import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Define MongoDB Schema for summaries if not already defined
const summarySchema = new mongoose.Schema({
  title: String,
  url: String,
  summary: String,
  source: String,
  createdAt: { type: Date, default: Date.now }
});

const Summary = mongoose.model('Summary', summarySchema);

router.get('/', async (req, res) => {
  try {
    const data = await Summary.find().sort({ createdAt: 1 });
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
    const recentSummaries = await Summary.find({
      createdAt: { $gte: last24Hours }
    }).sort({ createdAt: 1 });
    
    res.json({ trends: recentSummaries });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get source statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Summary.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          source: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    res.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
