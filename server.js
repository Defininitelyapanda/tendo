const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const preferredPort = Number(process.env.PORT || 3000);
const portsToTry = Array.from({ length: 10 }, (_, index) => preferredPort + index);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const sendFile = (res, filePath) => {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
};

const startServer = portIndex => {
  const port = portsToTry[portIndex];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let requestPath = decodeURIComponent(url.pathname);

    if (requestPath === '/.env' || requestPath.startsWith('/.env/') || requestPath.includes('/.git/') || requestPath.includes('/backend/') || requestPath.includes('/scripts/') || requestPath.includes('/desktop/') || requestPath.includes('/android-app/')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (requestPath === '/') {
      requestPath = '/index.html';
    }

    const normalizedPath = path.normalize(path.join(rootDir, requestPath));
    if (!normalizedPath.startsWith(rootDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(normalizedPath, (error, stats) => {
      if (error || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      fs.readFile(normalizedPath, (readError, content) => {
        if (readError) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Internal server error');
          return;
        }

        const ext = path.extname(normalizedPath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(content);
      });
    });
  });

  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && portIndex < portsToTry.length - 1) {
      console.warn(`Port ${port} is busy; retrying on ${portsToTry[portIndex + 1]}.`);
      startServer(portIndex + 1);
      return;
    }
    console.error(`Failed to start TENDO prototype on port ${port}:`, error.message);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`TENDO prototype running at http://localhost:${port}`);
  });
};

startServer(0);
