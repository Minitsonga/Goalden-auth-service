import express from "express";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "goalden-auth-service" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

app.use(errorHandler);

export default app;
