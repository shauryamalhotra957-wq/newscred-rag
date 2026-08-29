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
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.started + WINDOW_MS - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
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
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    req.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        fail(Object.assign(new Error("request_too_large"), { status: 413 }));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks));
      }
    });
    req.on("error", fail);
  });
}

function writeJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function cleanup(now = Date.now()) {
  const sessionCutoff = now - 2 * 60 * 60 * 1000;
  for (const [id, session] of sessions.entries()) {
    if (session.lastSeen < sessionCutoff) sessions.delete(id);
  }

  const bucketCutoff = now - WINDOW_MS;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.started < bucketCutoff) buckets.delete(key);
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
