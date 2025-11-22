import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import pino from 'pino';
import { env } from './config/env.js';
import uploadRouter from './routes/upload.js';
import analyzeRouter from './routes/analyze.js';

const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });

async function start() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN ? [env.CLIENT_ORIGIN] : true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', provider: env.ANALYSIS_PROVIDER || 'none' });
  });

  app.use('/api/upload', uploadRouter);
  app.use('/api/analyze', analyzeRouter);

  app.use((err, _req, res, _next) => {
    logger.error({ err }, 'Unhandled error');
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  const mongoUri = env.MONGODB_URI;
  if (!mongoUri) {
    logger.warn('MONGODB_URI not set. Caching will be disabled.');
  } else {
    try {
      await mongoose.connect(mongoUri, { dbName: env.MONGODB_DB || undefined });
      logger.info('Connected to MongoDB');
    } catch (e) {
      logger.error({ e }, 'Failed to connect MongoDB');
    }
  }

  const port = env.PORT || 8080;
  app.listen(port, () => logger.info(`Server listening on :${port}`));
}

start().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
