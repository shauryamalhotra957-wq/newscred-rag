"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { retrieveEvidence } = require("../server/lib/rag");

const corpus = Array.from({ length: 3 }, (_, index) => ({
  id: `E-${index}`,
  title: `Report ${index}`,
  source: "Test source",
  summary: "Climate policy evidence.",
  topics: ["climate"],
  claims: ["policy"]
}));

test("retrieval clamps invalid result counts", () => {
  assert.equal(retrieveEvidence({ query: "climate policy", corpus, topK: 0 }).length, 1);
  assert.equal(retrieveEvidence({ query: "climate policy", corpus, topK: 99 }).length, 3);
  assert.equal(retrieveEvidence({ query: "climate policy", corpus, topK: Number.NaN }).length, 3);
});
