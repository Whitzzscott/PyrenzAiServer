import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Routes from './Route/router';
import helmet from "helmet";
import compression from "compression";
import path from 'path';

const app = express();
const PORT = 1983;

const allowedOrigins = ["http://localhost:8800"];

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests. Please try again later." },
});

const setResponseHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Content-Type", "text/html");
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
  res.setHeader("Feature-Policy", "accelerometer 'none'; autoplay 'none'; clipboard-write 'none'; encrypted-media 'none'; geolocation 'none'; microphone 'none'; midi 'none'; payment 'none'; usb 'none'");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'; form-action 'self'; base-uri 'self'; manifest-src 'self';");
  next();
};

app.use(helmet());
app.use(compression());
app.use(setResponseHeaders);

type CorsCallback = (err: Error | null, allow?: boolean) => void;

app.use(
  cors({
    origin: (origin: string | undefined, callback: CorsCallback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
  }),
);

app.use(limiter);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

app.get("/ping", (_req: Request, res: Response) => {
  console.log("Ping received");
  res.send("Pong");
});

type RouteHandler = (req: Request, res: Response) => Promise<void> | void;

interface RoutesType {
  [key: string]: RouteHandler;
}

const routes = Routes as RoutesType;

app.all("/api/:action", async (req: Request, res: Response) => {
  const { action } = req.params;

  if (typeof routes[action] === "function") {
    try {
      await routes[action](req, res);
    } catch (error) {
      if (!res.headersSent) {
        console.error("API Route Error:", error);
        res.status(500).json({
          error: "Internal Server Error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  } else {
    res.status(404).json({
      error:
        "[INVALID ACTION]: Invalid API action. Maybe contact the developer for this?",
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
