import mongoose from 'mongoose';

const feedSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  engagement: {
    type: Number,
    default: 0,
    index: true
  }
});

// Add text index for search
feedSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('Feed', feedSchema);
