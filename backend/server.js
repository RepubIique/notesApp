import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
import authRoutes from './routes/auth.js';
import messagesRoutes from './routes/messages.js';
import imagesRoutes from './routes/images.js';
import workoutRoutes from './routes/workouts.js';
import voiceMessagesRoutes from './routes/voice-messages.js';
import translationsRoutes from './routes/translations.js';
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/voice-messages', voiceMessagesRoutes);
app.use('/api/translations', translationsRoutes);

let server;

// Only start server if this file is run directly (not imported)
// Check using import.meta.url
const isMainModule = process.argv[1] && process.argv[1].endsWith('server.js');

if (isMainModule && process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
export { server };
