import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import claimRoutes from "./routes/claimRoutes.js";
import extractionRoutes from "./routes/extractionRoutes.js";
import testCaseRoutes from "./routes/testCaseRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: clientOrigins }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Plum OPD Adjudicator",
    database: mongoose.connection.readyState === 1 ? "connected" : "not_connected"
  });
});

app.use("/api/claims", claimRoutes);
app.use("/api/extraction", extractionRoutes);
app.use("/api/test-cases", testCaseRoutes);

async function start() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } else {
    console.log("MONGODB_URI not set; running with in-memory API responses only.");
  }

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
