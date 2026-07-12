import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import {
  globalErrorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";

import messageRoutes from "./routes/messageRoutes.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked this origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "WhatsApp CRM backend is running.",
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    service: "WhatsApp CRM Backend",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/whatsapp", messageRoutes);

app.use(notFoundHandler);

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log("============================================");
  console.log(`Backend running: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(
    `Webhook: http://localhost:${PORT}/api/whatsapp/webhook`
  );
  console.log("============================================");
});
