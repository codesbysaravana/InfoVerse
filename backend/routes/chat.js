import express from 'express';
import { db } from '../drizzle/db.js';
import { summaries } from '../drizzle/schema.js';
import { generateResponse, generateStreamingResponse } from '../utils/gemini.js';

const router = express.Router();
const messageHistory = new Map(); // In-memory storage for chat history

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

    // Get relevant summaries for context
    const relevantSummaries = await db
      .select()
      .from(summaries)
      .where(summaries.summary, 'like', `%${query}%`)
      .limit(3);

    // Get chat history for context
    const history = messageHistory.get(sessionId) || [];
    const contextMessages = history.slice(-5); // Last 5 messages for context

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

    // Store in history after complete response
    const newMessage = {
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date().toISOString()
    };
    
    if (!messageHistory.has(sessionId)) {
      messageHistory.set(sessionId, []);
    }
    messageHistory.get(sessionId).push(
      { role: 'user', content: query, timestamp: new Date().toISOString() },
      newMessage
    );

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

    // Get relevant summaries for context
    const relevantSummaries = await db
      .select()
      .from(summaries)
      .where(summaries.summary, 'like', `%${query}%`)
      .limit(3);

    // Get chat history for context
    const history = messageHistory.get(sessionId) || [];
    const contextMessages = history.slice(-5); // Last 5 messages for context

    // Prepare context for Gemini
    const context = [
      ...relevantSummaries.map(s => s.summary),
      ...contextMessages.map(m => `${m.role}: ${m.content}`)
    ];

    // Generate response using Gemini
    const answer = await generateResponse(query, context);

    // Store in history
    const newMessage = {
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString()
    };
    
    if (!messageHistory.has(sessionId)) {
      messageHistory.set(sessionId, []);
    }
    messageHistory.get(sessionId).push(
      { role: 'user', content: query, timestamp: new Date().toISOString() },
      newMessage
    );

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
    const history = messageHistory.get(sessionId) || [];
    res.json({ history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;
