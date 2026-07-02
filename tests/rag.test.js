"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const corpus = require("../data/evidence-corpus.json");
const { cosineSimilarity, retrieveEvidence } = require("../server/lib/rag");

test("cosineSimilarity returns stronger match for overlapping tokens", () => {
  const strong = cosineSimilarity(["health", "trial", "study"], ["health", "trial", "evidence"]);
  const weak = cosineSimilarity(["health", "trial", "study"], ["finance", "market", "filing"]);
  assert.ok(strong > weak);
});

test("retrieveEvidence returns relevant health baseline for cure claim", () => {
  const docs = retrieveEvidence({
    query: "unnamed pill cures cancer overnight no trial",
    claims: ["A pill cures all cancers overnight"],
    corpus
  });
  assert.ok(docs.some((doc) => doc.id === "health-misinfo-checks"));
});
