// ws/websocket.js (or similar)

import WebSocket, { WebSocketServer } from 'ws';
import { connectToMongo } from '../mongoClient.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });
  const clients = new Set();
  const feeds = new Map();

  const broadcast = (type, data) => {
    const message = JSON.stringify({ type, data });
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  const updateFeeds = async () => {
    try {
      const db = await connectToMongo();
      const collection = db.collection('summaries');

      const recentSummaries = await collection
        .find({})
        .sort({ createdAt: -1 }) // newest first
        .limit(50)
        .toArray();

      broadcast('feedUpdate', recentSummaries);
    } catch (error) {
      console.error('Feed update error:', error);
    }
  };

  const updateInterval = setInterval(updateFeeds, 5000);

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected, total clients:', clients.size);

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

  return () => {
    clearInterval(updateInterval);
    clients.forEach(client => client.close());
  };
}
