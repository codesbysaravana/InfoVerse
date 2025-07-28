import express from 'express';
import { generateResponse, generateStreamingResponse } from '../utils/gemini.js';
import mongoose from 'mongoose';

const router = express.Router();

// Define MongoDB Schema for chat messages
const messageSchema = new mongoose.Schema({
  sessionId: String,
  messages: [{
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const summarySchema = new mongoose.Schema({
  title: String,
  url: String,
  summary: String,
  createdAt: { type: Date, default: Date.now }
});

// Create MongoDB models
const ChatSession = mongoose.model('ChatSession', messageSchema);
const Summary = mongoose.model('Summary', summarySchema);

// Streaming chat endpoint with RAG implementation
router.post('/stream', async (req, res) => {
  try {
    const { query, sessionId = 'default' } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get relevant summaries from MongoDB
    const relevantSummaries = await Summary.find(
      { summary: { $regex: query, $options: 'i' } },
      null,
      { limit: 3 }
    );

    // Get chat history from MongoDB
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      session = new ChatSession({ sessionId, messages: [] });
    }
    
    const contextMessages = session.messages.slice(-5); // Last 5 messages for context

    // Prepare context for Gemini
    const context = [
      ...relevantSummaries.map(s => s.summary),
      ...contextMessages.map(m => `${m.role}: ${m.content}`)
    ];

    // Start streaming response
    console.log('Attempting to generate streaming response with:', {
      queryLength: query.length,
      contextSize: context.length,
    });
    
    const stream = await generateStreamingResponse(query, context);
    console.log('Stream received from Gemini');
    let fullResponse = '';

    for await (const chunk of stream.stream) {  // Access the stream property
      const chunkText = chunk.text();
      fullResponse += chunkText;
      // Send each chunk as an SSE event
      const data = JSON.stringify({
        text: chunkText,
        sources: relevantSummaries.map(summary => ({
          title: summary.title,
          url: summary.url,
          content: summary.summary
        })),
        done: false
      });
      res.write(`data: ${data}\n\n`);
    }

    // Store messages in MongoDB
    const userMessage = {
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    const assistantMessage = {
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date()
    };

    if (!session) {
      session = new ChatSession({ sessionId, messages: [] });
    }
    
    session.messages.push(userMessage, assistantMessage);
    await session.save();

    // Send final done event
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat query' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Failed to process chat query', done: true })}\n\n`);
      res.end();
    }
  }
});

// Regular chat endpoint with RAG implementation
router.post('/', async (req, res) => {
  try {
    const { query, sessionId = 'default' } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Get relevant summaries from MongoDB
    const relevantSummaries = await Summary.find(
      { summary: { $regex: query, $options: 'i' } },
      null,
      { limit: 3 }
    );

    // Get chat history from MongoDB
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      session = new ChatSession({ sessionId, messages: [] });
    }
    
    const contextMessages = session.messages.slice(-5); // Last 5 messages for context

    // Prepare context for Gemini
    const context = [
      ...relevantSummaries.map(s => s.summary),
      ...contextMessages.map(m => `${m.role}: ${m.content}`)
    ];

    // Generate response using Gemini
    const answer = await generateResponse(query, context);

    // Store messages in MongoDB
    const userMessage = {
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    const assistantMessage = {
      role: 'assistant',
      content: answer,
      timestamp: new Date()
    };

    if (!session) {
      session = new ChatSession({ sessionId, messages: [] });
    }
    
    session.messages.push(userMessage, assistantMessage);
    await session.save();

    res.json({
      answer,
      sources: relevantSummaries.map(summary => ({
        title: summary.title,
        url: summary.url,
        content: summary.summary
      }))
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat query' });
  }
});

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.query;
    const session = await ChatSession.findOne({ sessionId });
    res.json({ history: session ? session.messages : [] });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;
