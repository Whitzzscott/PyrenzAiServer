import express from 'express';
import type { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import Routes from './Route/Router.js';
import helmet from 'helmet';
import compression from 'compression';

dotenv.config();

const PORT = process.env.PORT || 3000;

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
});

const app = express();

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(limiter);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

app.get('/ping', (_req, res) => {
  console.log('Ping received');
  res.send('Pong');
});

app.all('/api/:action', async (req, res) => {
  const { action } = req.params;

  if (typeof Routes[action] === 'function') {
    try {
      const result = await Routes[action](req, res);
      res.status(200).json(result);
    } catch (error) {
      console.error('API Route Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: (error as Error).message,
      });
    }
  } else {
    res.status(404).json({
      error: '[INVALID ACTION]: Invalid API action. Maybe contact the developer for this?',
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
