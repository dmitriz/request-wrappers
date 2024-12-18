import test from 'ava';
import http from 'http';
import https from 'https';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import req_json from './req_json'; // Assuming req_json.js is in the same directory

let httpServer, httpsServer;
const httpPort = 8080;
const httpsPort = 8443;

// Start mock servers
test.before(async () => {
  // HTTP Server
  httpServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ method: req.method, body: JSON.parse(body || '{}') }));
    });
  });
  await new Promise(resolve => httpServer.listen(httpPort, resolve));

  // HTTPS Server
  const key = readFileSync(resolve(__dirname, 'key.pem')); // Replace with your certificate
  const cert = readFileSync(resolve(__dirname, 'cert.pem')); // Replace with your certificate
  httpsServer = https.createServer({ key, cert }, (req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ method: req.method, body: JSON.parse(body || '{}') }));
    });
  });
  await new Promise(resolve => httpsServer.listen(httpsPort, resolve));
});

// Stop servers
test.after(async () => {
  await new Promise(resolve => httpServer.close(resolve));
  await new Promise(resolve => httpsServer.close(resolve));
});

// Core Tests
test('should make a successful HTTP GET request', async (t) => {
  const request = req_json({ url: `http://localhost:${httpPort}`, method: 'GET' });
  await new Promise((resolve, reject) => {
    request(
      (response) => {
        t.is(response.status, 200);
        t.deepEqual(response.body, {});
        resolve();
      },
      (error) => reject(error)
    );
  });
});

test('should make a successful HTTPS POST request', async (t) => {
  const request = req_json({
    url: `https://localhost:${httpsPort}`,
    method: 'POST',
    body: { key: 'value' },
  });
  await new Promise((resolve, reject) => {
    request(
      (response) => {
        t.is(response.status, 200);
        t.deepEqual(response.body, { method: 'POST', body: { key: 'value' } });
        resolve();
      },
      (error) => reject(error)
    );
  });
});

test('should handle timeouts', async (t) => {
  const request = req_json({
    url: `http://localhost:${httpPort}`,
    timeout: 1, // Force a timeout
  });
  await new Promise((resolve) => {
    request(
      () => t.fail('Expected a timeout error'),
      (error) => {
        t.is(error.type, 'TimeoutError');
        resolve();
      }
    );
  });
});

test('should handle connection errors', async (t) => {
  const request = req_json({ url: `http://localhost:9999` }); // Port not in use
  await new Promise((resolve) => {
    request(
      () => t.fail('Expected a connection error'),
      (error) => {
        t.is(error.type, 'RequestError');
        resolve();
      }
    );
  });
});

test('should handle invalid JSON in response', async (t) => {
  httpServer.on('request', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('Invalid JSON');
  });
  const request = req_json({ url: `http://localhost:${httpPort}` });
  await new Promise((resolve) => {
    request(
      () => t.fail('Expected a parsing error'),
      (error) => {
        t.is(error.type, 'ParseError');
        resolve();
      }
    );
  });
});

test('should handle empty response body', async (t) => {
  httpServer.on('request', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end();
  });
  const request = req_json({ url: `http://localhost:${httpPort}` });
  await new Promise((resolve, reject) => {
    request(
      (response) => {
        t.deepEqual(response.body, {});
        resolve();
      },
      (error) => reject(error)
    );
  });
});
