import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import downloadRoutes from './routes/download';
import processRoutes from './routes/process';
import cacheRoutes from './routes/cache';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/download', downloadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/cache', cacheRoutes);

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Band Practice Webapp Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});