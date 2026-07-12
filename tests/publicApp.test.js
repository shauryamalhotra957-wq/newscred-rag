"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml, formatDate, safeExternalUrl } = require("../public/app");

test("formatDate treats only invalid dates as unknown", () => {
  assert.equal(formatDate("not a date"), "Date unknown");
  assert.notEqual(formatDate("1970-01-01T00:00:00.000Z"), "Date unknown");
});

test("escapeHtml encodes text before rendering templates", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">`), "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;");
});

test("safeExternalUrl allows only HTTP links in rendered anchors", () => {
  assert.equal(safeExternalUrl("https://example.com/story"), "https://example.com/story");
  assert.equal(safeExternalUrl("http://example.com/story"), "http://example.com/story");
  assert.equal(safeExternalUrl("javascript:alert(1)"), "#");
  assert.equal(safeExternalUrl("data:text/html,<script>alert(1)</script>"), "#");
});
