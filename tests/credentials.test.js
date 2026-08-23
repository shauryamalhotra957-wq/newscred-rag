"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const registry = require("../data/source-registry.json");
const { findRegistryEntry, scoreSourceCredentials } = require("../server/lib/credentials");

test("findRegistryEntry matches exact and subdomain domains", () => {
  assert.equal(findRegistryEntry("who.int", registry).name, "World Health Organization");
  assert.equal(findRegistryEntry("news.who.int", registry).name, "World Health Organization");
});

test("known primary source scores higher than unregistered source", () => {
  const trusted = scoreSourceCredentials(
    {
      sourceUrl: "https://who.int/news",
      author: "WHO",
      publishedAt: "2026-07-02",
      body: "According to official data and report notes, the study was published."
    },
    registry
  );
  const unknown = scoreSourceCredentials(
    {
      sourceUrl: "http://random.example/story",
      author: "",
      publishedAt: "",
      body: "Share this now."
    },
    registry
  );
  assert.ok(trusted.score > unknown.score);
  assert.ok(unknown.warnings.length > trusted.warnings.length);
});

test("invalid publication dates do not receive a credential bonus", () => {
  const result = scoreSourceCredentials({ sourceUrl: "https://who.int/news", author: "WHO", publishedAt: "sometime soon", body: "Official report with data and a study." }, registry);
  assert.ok(result.warnings.includes("Publication date is invalid"));
  assert.equal(result.signals.includes("Publication date supplied"), false);
});
