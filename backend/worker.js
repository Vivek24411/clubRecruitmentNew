const dotenv = require("dotenv");
dotenv.config();
require("./src/config/validateEnv")();
const connectDB = require("./src/utils/dbConnection");
const { startJobWorker } = require("./src/services/jobQueue.services");
const http = require("http");
const mongoose = require("mongoose");
const { log } = require("./src/utils/observability");

async function main() {
  await connectDB();
  startJobWorker();
  const healthPort = Number(process.env.WORKER_HEALTH_PORT) || 3101;
  http.createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404).end();
      return;
    }
    const ready = mongoose.connection.readyState === 1;
    res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify({ ready, uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() }));
  }).listen(healthPort, "127.0.0.1", () => log("info", "worker.started", { healthPort }));
}

main().catch((error) => {
  log("error", "worker.start_failed", { error: String(error?.message || error).slice(0, 1000) });
  process.exitCode = 1;
});
