"use strict";

const crypto = require("crypto");

const sessions = new Map();
const buckets = new Map();
const WINDOW_MS = 60_000;

function token(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function parseCookies(header = "") {
  return Object.fromEntries(
    String(header)
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        const rawName = index === -1 ? item : item.slice(0, index);
        const rawValue = index === -1 ? "" : item.slice(index + 1);
        try {
          return [decodeURIComponent(rawName), decodeURIComponent(rawValue)];
        } catch {
          return ["", ""];
        }
      })
      .filter(([name]) => name)
  );
}

function setHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'"
    ].join("; ")
  );
}

function getSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const id = cookies.newscred_session;
  if (id && sessions.has(id)) {
    const existing = sessions.get(id);
    existing.lastSeen = Date.now();
    return existing;
  }
  const created = { id: token(), csrf: token(), createdAt: Date.now(), lastSeen: Date.now() };
  sessions.set(created.id, created);
  res.setHeader("Set-Cookie", `newscred_session=${created.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=7200`);
  return created;
}

function enforceRateLimit(req, res, limit = 90) {
  const key = `${req.socket.remoteAddress || "local"}:${req.url.split("?")[0]}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.started > WINDOW_MS) {
    buckets.set(key, { started: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    writeJson(res, 429, { error: "rate_limited", message: "Too many requests. Slow the feed." });
    return false;
  }
  return true;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function requireCsrf(req, res, session) {
  if (!sameOrigin(req)) {
    writeJson(res, 403, { error: "bad_origin", message: "Cross-origin writes are blocked." });
    return false;
  }
  if (req.headers["x-csrf-token"] !== session.csrf) {
    writeJson(res, 403, { error: "csrf_failed", message: "Missing or invalid CSRF token." });
    return false;
  }
  return true;
}

function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error("request_too_large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function writeJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function cleanup() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, session] of sessions.entries()) {
    if (session.lastSeen < cutoff) sessions.delete(id);
  }
}

module.exports = {
  cleanup,
  enforceRateLimit,
  getSession,
  readBody,
  requireCsrf,
  setHeaders,
  writeJson
};
