import WebSocket from 'ws';
import { db } from '../drizzle/db.js';
import { summaries } from '../drizzle/schema.js';

export function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  const clients = new Set();
  const feeds = new Map();

  // Broadcast to all clients
  const broadcast = (type, data) => {
    const message = JSON.stringify({ type, data });
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Update feeds periodically
  const updateFeeds = async () => {
    try {
      const recentSummaries = await db
        .select()
        .from(summaries)
        .orderBy(summaries.createdAt)
        .limit(50);

      broadcast('feedUpdate', recentSummaries);
    } catch (error) {
      console.error('Feed update error:', error);
    }
  };

  // Start periodic updates
  const updateInterval = setInterval(updateFeeds, 5000);

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected, total clients:', clients.size);

    // Send initial data
    if (feeds.size > 0) {
      ws.send(JSON.stringify({ type: 'initialFeeds', data: Array.from(feeds.values()).flat() }));
    }

    ws.on('message', async (message) => {
      try {
        const { type, data } = JSON.parse(message.toString());

        switch (type) {
          case 'subscribe':
            const { sources, timeRange } = data;
            ws.send(JSON.stringify({ type: 'subscribed', data: { sources, timeRange } }));
            break;

          case 'requestUpdate':
            await updateFeeds();
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', data: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', data: 'Failed to process message' }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected, remaining clients:', clients.size);
    });
  });

  // Cleanup on server shutdown
  return () => {
    clearInterval(updateInterval);
    clients.forEach(client => client.close());
  };
}
