"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanup, enforceRateLimit } = require("../server/lib/security");

test("cleanup prunes expired rate-limit buckets", () => {
  const originalNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;

  try {
    const req = {
      socket: { remoteAddress: "192.0.2.44" },
      url: "/api/health"
    };
    const res = {
      setHeader() {},
      writeHead() {},
      end() {}
    };

    assert.equal(enforceRateLimit(req, res, 1), true);
    now += 60_001;

    const removed = cleanup();
    assert.equal(removed.bucketsRemoved, 1);
    assert.equal(enforceRateLimit(req, res, 1), true);
  } finally {
    Date.now = originalNow;
    cleanup();
  }
});
