import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'module-alias/register.js';
import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Routes from './routes/appRouter.js';
import helmet from "helmet";
import compression from "compression";
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const allowedOrigins = ["https://pyrenzai.com"];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'authentication_key', 'captcha_key'],
};

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests. Please try again later." },
});

const setResponseHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Powered-By", "Pyrenz AI");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), microphone=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'; form-action 'self'; base-uri 'self'; manifest-src 'self';");
  next();
};

app.set('trust proxy', true);
app.use(helmet());
app.use(compression());
app.use(setResponseHeaders);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

app.get("/ping", (_req: Request, res: Response) => {
  console.log("Ping received");
  res.send("Pong");
});

type RouteHandler = (req: Request, res: Response) => Promise<void> | void;
interface RoutesType { [key: string]: RouteHandler; }
const routes = Routes as RoutesType;

app.use('/api', limiter);

app.all("/api/:action", async (req: Request, res: Response, next: NextFunction) => {
  const { action } = req.params;
  const routeHandler = routes[action];
  if (typeof routeHandler === "function") {
    try {
      await routeHandler(req, res);
    } catch (error) {
      next(error);
    }
  } else {
    res.status(404).json({ error: "[INVALID ACTION]: Invalid API action. Maybe contact the developer for this?" });
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.redirect(301, "https://pyrenzai.com");
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message || "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
