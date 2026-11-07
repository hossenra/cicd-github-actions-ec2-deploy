const http = require("node:http");

function greet(name = "DevOps Students") {
  return `Hello, ${name}! CI/CD deployment is working from actions automatically fine.`;
}

function handler(req, res) {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<!doctype html><html><head><meta charset="utf-8"><title>CI/CD Demo</title><style>body{font-family:system-ui;background:#15132a;color:white;display:grid;place-items:center;min-height:90vh}main{text-align:center;padding:32px}h1{color:#c084fc}</style></head><body><main><h1>GitHub Actions + AWS EC2</h1><p>${greet()}</p><p>Lint → Test → Deploy</p></main></body></html>`,
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
}

function createServer() {
  return http.createServer(handler);
}

module.exports = { greet, createServer };
