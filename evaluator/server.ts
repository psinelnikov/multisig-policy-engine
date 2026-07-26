import http from "http";
import { downloadReceipt } from "./storage.js";

/// Minimal HTTP server: proxies 0G Storage downloads for the frontend.
/// GET /receipt/:rootHash → full audit receipt JSON
/// GET /health → health check
export function startReceiptServer(port: number = 3001) {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    const match = req.url?.match(/^\/receipt\/(0x[a-fA-F0-9]+)$/);
    if (req.method === "GET" && match) {
      const rootHash = match[1];
      const receipt = await downloadReceipt(rootHash);
      if (receipt) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(receipt));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Receipt not found" }));
      }
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(port, () => {
    console.log(`[evaluator] Receipt proxy listening on port ${port}`);
  });

  return server;
}
