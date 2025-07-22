import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import routes
import dashboardRouter from './routes/dashboard.js';
import chatRouter from './routes/chat.js';
import feedRouter from './routes/feed.js';

// Create Express app
const app = express();

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// General middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression()); // Compress responses

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      '/api/dashboard': 'Real-time dashboard data and analytics',
      '/api/chat': 'RAG-powered AI chat interface',
      '/api/feed': 'Live feed aggregation from multiple sources'
    }
  });
});

// API Routes with version prefix
const apiRouter = express.Router();
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/feed', feedRouter);

app.use('/api', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid or missing authentication token'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred'
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

export default app;
