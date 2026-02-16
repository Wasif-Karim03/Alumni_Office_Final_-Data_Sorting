/**
 * OWU Alumni Analytics API
 * Express server for CSV analysis endpoint
 */
import express from 'express';
import cors from 'cors';
import analyzeRoutes from './routes/analyze.js';
import { startUploadCleanup } from './services/uploadCleanup.js';

const app = express();

// Clean up uploaded files older than 20 minutes (runs every 5 min)
startUploadCleanup();
const PORT = process.env.PORT || 3001;

// CORS: allow frontend URL (set FRONTEND_URL in production, e.g. https://your-app.vercel.app)
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());

app.use('/api', analyzeRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 10MB per file.' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log('OWU Analytics API running on port', PORT);
});
