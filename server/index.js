"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const { verifyArticle } = require("./lib/verifier");
const { cleanup, enforceRateLimit, getSession, readBody, requireCsrf, setHeaders, writeJson } = require("./lib/security");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const JSON_LIMIT = 96 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function safeStaticPath(publicDir, requestPath) {
  const pathname = decodeURIComponent(requestPath.split("?")[0]);
  const localPath = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(publicDir, `.${localPath}`);
  if (!resolved.startsWith(path.resolve(publicDir))) return null;
  return resolved;
}

async function readJson(req) {
  const body = await readBody(req, JSON_LIMIT);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function createServer(options = {}) {
  const publicDir = options.publicDir || PUBLIC_DIR;
  const corpus = options.corpus || loadJson(path.join(DATA_DIR, "evidence-corpus.json"));
  const registry = options.registry || loadJson(path.join(DATA_DIR, "source-registry.json"));
  const samples = options.samples || loadJson(path.join(DATA_DIR, "sample-news.json"));

  return http.createServer(async (req, res) => {
    setHeaders(res);
    cleanup();
    if (!enforceRateLimit(req, res, req.url.startsWith("/api/verify") ? 30 : 120)) return;
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const session = getSession(req, res);

    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        return writeJson(res, 200, { ok: true, service: "newscred-rag", timestamp: new Date().toISOString() });
      }
      if (req.method === "GET" && url.pathname === "/api/session") {
        return writeJson(res, 200, { csrfToken: session.csrf, maxArticleBytes: JSON_LIMIT });
      }
      if (req.method === "GET" && url.pathname === "/api/samples") {
        return writeJson(res, 200, { samples });
      }
      if (req.method === "GET" && url.pathname === "/api/corpus") {
        return writeJson(res, 200, {
          documents: corpus.map((doc) => ({
            id: doc.id,
            title: doc.title,
            source: doc.source,
            sourceUrl: doc.sourceUrl,
            credibility: doc.credibility,
            topics: doc.topics
          })),
          sources: registry.map((source) => ({
            domain: source.domain,
            name: source.name,
            type: source.type,
            credentialScore: source.credentialScore
          }))
        });
      }
      if (req.method === "POST" && url.pathname === "/api/verify") {
        if (!requireCsrf(req, res, session)) return;
        const payload = await readJson(req);
        const result = verifyArticle({ article: payload.article || {}, corpus, registry });
        return writeJson(res, 200, { ok: true, result });
      }
      if (req.method === "GET") {
        const file = safeStaticPath(publicDir, url.pathname);
        if (!file) return writeJson(res, 403, { error: "path_blocked" });
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return writeJson(res, 404, { error: "not_found" });
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Cache-Control": [".html", ".css", ".js"].includes(ext) ? "no-store" : "public, max-age=3600"
        });
        fs.createReadStream(file).pipe(res);
        return;
      }
      writeJson(res, 405, { error: "method_not_allowed" });
    } catch (error) {
      const status = error.status || (error instanceof SyntaxError ? 400 : 500);
      writeJson(res, status, {
        error: status === 500 ? "server_error" : "bad_request",
        message: status === 500 ? "Unexpected server error." : error.message
      });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4273);
  createServer().listen(port, "127.0.0.1", () => {
    console.log(`NewsCred RAG running at http://127.0.0.1:${port}`);
  });
}

module.exports = {
  createServer,
  safeStaticPath
};
