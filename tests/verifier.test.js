"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const corpus = require("../data/evidence-corpus.json");
const registry = require("../data/source-registry.json");
const { verdictFromScore, verifyArticle } = require("../server/lib/verifier");

test("verdictFromScore maps score bands", () => {
  assert.equal(verdictFromScore(90).label, "High confidence");
  assert.equal(verdictFromScore(70).label, "Likely credible, needs monitoring");
  assert.equal(verdictFromScore(50).label, "Unverified");
  assert.equal(verdictFromScore(20).label, "High risk");
});

test("risky viral health claim receives low score and warnings", () => {
  const result = verifyArticle({
    article: {
      title: "Viral post claims unnamed pill cures all cancers overnight",
      sourceUrl: "https://exampleviralnews.test/story",
      body: "A viral post claims doctors are hiding an unnamed pill that cures all cancers overnight. It provides no study, no trial, no institution, no named doctor, and asks readers to share before it is deleted."
    },
    corpus,
    registry
  });
  assert.ok(result.score < 50);
  assert.ok(result.warnings.length > 0);
  assert.ok(result.claims.length > 0);
});

test("credentialed evidence-bearing article scores above risky story", () => {
  const result = verifyArticle({
    article: {
      title: "WHO says trial evidence should guide flu treatment",
      sourceUrl: "https://who.int/news-room/example",
      author: "WHO newsroom",
      publishedAt: "2026-07-02",
      body: "According to official public health guidance and study data, a clinical trial reduced flu complications among high-risk adults. Officials said the treatment should be used with existing vaccination guidance."
    },
    corpus,
    registry
  });
  assert.ok(result.score >= 64);
  assert.ok(result.credentials.score > 85);
});
