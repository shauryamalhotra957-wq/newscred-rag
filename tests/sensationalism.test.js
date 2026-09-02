import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SensationalismDetector } from "../server/lib/sensationalismDetector.js";

describe("SensationalismDetector", () => {
  it("flags clickbait patterns and exclamation marks", () => {
    const text = "SHOCKING TRUTH: Doctors are furious about this secret remedy!!!";
    const result = SensationalismDetector.analyze(text);

    assert.equal(result.level, "HIGH");
    assert.ok(result.score >= 0.7);
    assert.ok(result.flags.some((f) => f.includes("Excessive punctuation")));
    assert.ok(result.flags.some((f) => f.includes("secret remedy") || f.includes("doctors are furious")));
  });

  it("assigns low risk score to sober journalistic headlines", () => {
    const text = "Central bank announces 25 basis point rate adjustment following quarterly review.";
    const result = SensationalismDetector.analyze(text);

    assert.equal(result.level, "LOW");
    assert.equal(result.score, 0);
    assert.equal(result.flags.length, 0);
  });

  it("handles null or invalid inputs safely", () => {
    const result = SensationalismDetector.analyze(null);
    assert.equal(result.score, 0);
    assert.equal(result.level, "LOW");
  });
});
