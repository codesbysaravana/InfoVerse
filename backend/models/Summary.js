import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema({
  source: String,
  url: { type: String, unique: true },
  title: String,
  summary: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Summary = mongoose.model('Summary', summarySchema);
