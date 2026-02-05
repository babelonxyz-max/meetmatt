import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { paymentRoutes } from "./routes/payments";
import { webhookRoutes } from "./routes/webhooks";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./config/logger";
import { QueueService } from "./services/queue";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "payment-service", timestamp: new Date().toISOString() });
});

// Routes
app.use("/payments", paymentRoutes);
app.use("/webhooks", webhookRoutes);

// Error handling
app.use(errorHandler);

// Initialize queue service
const queueService = new QueueService();
queueService.initialize().catch((err) => {
  logger.error("Failed to initialize queue service:", err);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await queueService.close();
  process.exit(0);
});

export { app };
