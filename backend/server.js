import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import dashboardRouter from './routes/dashboard.js';
import chatRouter from './routes/chat.js';
import feedRouter from './routes/feed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/chat', chatRouter);
app.use('/api/feed', feedRouter);

app.get('/', (req, res) => {
  res.send('IntelVerse AI Backend is running...');
});

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Setup WebSocket support
import { setupWebSocket } from './utils/websocket.js';
const cleanup = setupWebSocket(server);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up...');
  cleanup();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
