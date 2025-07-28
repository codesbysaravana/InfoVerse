import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Summary } from './models/Summary.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intelverse';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

export async function saveSummary(summaryObj) {
  const summary = new Summary(summaryObj);
  return await summary.save();
}

export async function getRecentSummaries(limit = 10) {
  return await Summary.find().sort({ createdAt: -1 }).limit(limit);
}

export async function getSummaryByUrl(url) {
  return await Summary.findOne({ url });
}
