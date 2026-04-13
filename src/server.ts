import mongoose from "mongoose";
import app from "./app.js";
import { config } from "./config/index.js";

async function start(): Promise<void> {
  await mongoose.connect(config.mongodb.uri);
  console.log("MongoDB connected to goalden_auth");

  app.listen(config.port, () => {
    console.log(`Goalden auth-service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
