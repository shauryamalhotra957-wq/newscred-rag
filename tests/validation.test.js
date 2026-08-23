"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateArticle } = require("../server/lib/validation");

test("validateArticle requires a headline and body", () => {
  const result = validateArticle({ sourceUrl: "https://example.test" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.title, "A headline is required.");
  assert.equal(result.errors.body, "Article body text is required.");
});

test("validateArticle rejects invalid source URLs", () => {
  const result = validateArticle({ title: "Report", body: "Text", sourceUrl: "javascript:alert(1)" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.sourceUrl);
});
