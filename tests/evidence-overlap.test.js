"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compareEvidence } = require("../server/lib/verifier");

test("long claims need multiple overlapping evidence terms", () => {
  const result = compareEvidence(
    ["climate policy requires independent audit"],
    [{ id: "E-1", title: "Audit report", summary: "An audit was published.", claims: [], topics: [] }]
  );
  assert.deepEqual(result.support, []);
  assert.deepEqual(result.gaps, ["climate policy requires independent audit"]);
});

test("short claims can still match one precise term", () => {
  const result = compareEvidence(
    ["audit required"],
    [{ id: "E-1", title: "Audit report", summary: "The audit is required.", claims: [], topics: [] }]
  );
  assert.equal(result.support[0].evidenceIds[0], "E-1");
});
