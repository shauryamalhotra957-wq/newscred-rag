"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const corpus = require("../data/evidence-corpus.json");
const registry = require("../data/source-registry.json");
const { verifyArticle } = require("../server/lib/verifier");

test("verification ids remain unique for rapid checks", () => {
  const input = {
    title: "Official report says data rose",
    sourceUrl: "https://example.test/report",
    body: "According to official data and a report, researchers reported a measurable increase."
  };
  const first = verifyArticle({ article: input, corpus, registry });
  const second = verifyArticle({ article: input, corpus, registry });
  assert.notEqual(first.id, second.id);
  assert.match(first.id, /^check_[0-9a-f-]{36}$/);
});
