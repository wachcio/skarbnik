import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

// Dual-mode: appka umie pracować za reverse proxy (NGINX Proxy Manager —
// dom i docelowo VPS) ALBO sama terminować HTTPS. Sterowane przez .env
// (ENABLE_HTTPS, SSL_CERT_PATH, SSL_KEY_PATH) — patrz PROJECT.md.
if (env.ENABLE_HTTPS) {
  const cert = fs.readFileSync(env.SSL_CERT_PATH);
  const key = fs.readFileSync(env.SSL_KEY_PATH);

  https.createServer({ cert, key }, app).listen(env.APP_HTTPS_PORT, () => {
    console.log(`Skarbnik API (HTTPS) nasłuchuje na porcie ${env.APP_HTTPS_PORT}`);
  });
} else {
  http.createServer(app).listen(env.APP_PORT, () => {
    console.log(`Skarbnik API (HTTP) nasłuchuje na porcie ${env.APP_PORT}`);
  });
}
