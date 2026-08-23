"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createServer, safeStaticPath } = require("../server");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

test("safeStaticPath blocks traversal", () => {
  const publicDir = path.join(process.cwd(), "public");
  assert.equal(safeStaticPath(publicDir, "/../../secret.txt"), null);
  assert.equal(safeStaticPath(publicDir, "/../publicity/secret.txt"), null);
  assert.equal(safeStaticPath(publicDir, "/%zz"), null);
});

test("API returns a request ID and accepts safe caller IDs", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { headers: { "X-Request-Id": "client_trace_123" } });
    assert.equal(response.headers.get("x-request-id"), "client_trace_123");
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    server.close();
  }
});

test("health endpoint includes a non-negative uptime", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const health = await response.json();
    assert.equal(health.ok, true);
    assert.ok(health.uptimeSeconds >= 0);
  } finally {
    server.close();
  }
});

test("corpus endpoint supports a simple discovery query", async () => {
  const server = createServer({ corpus: [{ id: "health", title: "Health guidance", source: "WHO", sourceUrl: "https://who.int", credibility: 99, topics: ["health"] }], registry: [], samples: [] });
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/corpus?q=health`);
    assert.equal((await response.json()).documents.length, 1);
  } finally {
    server.close();
  }
});

test("corpus endpoint bounds results using limit", async () => {
  const corpus = ["one", "two"].map((id) => ({ id, title: id, source: "Test", sourceUrl: "https://example.test", credibility: 50, topics: [] }));
  const server = createServer({ corpus, registry: [], samples: [] });
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/corpus?limit=1`);
    assert.equal((await response.json()).documents.length, 1);
  } finally {
    server.close();
  }
});

test("verify endpoint requires an explicit JSON content type", async () => {
  const server = createServer();
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const sessionResponse = await fetch(`${base}/api/session`);
    const session = await sessionResponse.json();
    const response = await fetch(`${base}/api/verify`, { method: "POST", headers: { Cookie: sessionResponse.headers.get("set-cookie"), "X-CSRF-Token": session.csrfToken }, body: "{}" });
    assert.equal(response.status, 415);
  } finally {
    server.close();
  }
});

test("API blocks missing CSRF and verifies with valid CSRF", async () => {
  const server = createServer();
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const sessionResponse = await fetch(`${base}/api/session`);
    const cookie = sessionResponse.headers.get("set-cookie");
    const session = await sessionResponse.json();
    assert.ok(session.csrfToken);

    const blocked = await fetch(`${base}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ article: {} })
    });
    assert.equal(blocked.status, 403);

    const crossOriginBlocked = await fetch(`${base}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrfToken,
        Cookie: cookie,
        Origin: "https://malicious.example"
      },
      body: JSON.stringify({ article: {} })
    });
    assert.equal(crossOriginBlocked.status, 403);
    assert.equal((await crossOriginBlocked.json()).error, "bad_origin");

    const verified = await fetch(`${base}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrfToken,
        Cookie: cookie
      },
      body: JSON.stringify({
        article: {
          title: "Official report says data rose",
          sourceUrl: "https://bls.gov/news",
          author: "BLS",
          publishedAt: "2026-07-02",
          body: "According to official data and a report, the agency said employment data rose."
        }
      })
    });
    assert.equal(verified.status, 200);
    const payload = await verified.json();
    assert.equal(payload.ok, true);
    assert.ok(payload.result.score > 0);
  } finally {
    server.close();
  }
});

test("session endpoint tolerates malformed cookie encoding", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/session`, {
      headers: { Cookie: "newscred_session=%zz; theme=dark" }
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(payload.csrfToken);
    assert.match(response.headers.get("set-cookie"), /newscred_session=/);
  } finally {
    server.close();
  }
});

test("verify endpoint returns actionable validation errors", async () => {
  const server = createServer();
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const sessionResponse = await fetch(`${base}/api/session`);
    const session = await sessionResponse.json();
    const response = await fetch(`${base}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionResponse.headers.get("set-cookie"), "X-CSRF-Token": session.csrfToken },
      body: JSON.stringify({ article: { title: "", body: "" } })
    });
    assert.equal(response.status, 422);
    assert.equal((await response.json()).error, "invalid_article");
  } finally {
    server.close();
  }
});

test("verify endpoint rejects non-object JSON bodies", async () => {
  const server = createServer();
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const sessionResponse = await fetch(`${base}/api/session`);
    const session = await sessionResponse.json();
    const response = await fetch(`${base}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionResponse.headers.get("set-cookie"), "X-CSRF-Token": session.csrfToken },
      body: "[]"
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "bad_request");
  } finally {
    server.close();
  }
});

test("live news endpoint normalizes feed stories and returns verifier output", async () => {
  const server = createServer({
    newsFeeds: [
      {
        id: "test-wire",
        name: "Reuters",
        region: "Global",
        url: "https://feeds.example.test/reuters.xml"
      }
    ],
    fetchText: async () => `
      <rss><channel><item>
        <title>Official report says climate data rose</title>
        <link>https://reuters.com/world/climate-report</link>
        <description>According to official data, researchers reported a measurable increase.</description>
        <pubDate>Thu, 09 Jul 2026 08:30:00 GMT</pubDate>
        <dc:creator>Reuters Staff</dc:creator>
      </item></channel></rss>
    `
  });
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/live-news`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.items.length, 1);
    assert.equal(payload.items[0].source, "Reuters");
    assert.equal(payload.items[0].title, "Official report says climate data rose");
    assert.equal(payload.items[0].verification.credentials.sourceName, "Reuters");
    assert.ok(payload.items[0].verification.score > 0);
  } finally {
    server.close();
  }
});
