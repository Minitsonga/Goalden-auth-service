import express from "express";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import internalRouter from "./routes/internal.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const ACTION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

app.use(express.json());
app.use((req, res, next) => {
  if (!ACTION_METHODS.has(req.method) || req.path === "/health") {
    return next();
  }

  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(
      `[auth-service] action=${req.method} ${req.originalUrl} status=${res.statusCode} durationMs=${durationMs}`,
    );
  });

  return next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "goalden-auth-service" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/internal", internalRouter);

app.use(errorHandler);

export default app;
