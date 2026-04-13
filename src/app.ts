import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "goalden-auth-service" });
});

app.use(errorHandler);

export default app;
