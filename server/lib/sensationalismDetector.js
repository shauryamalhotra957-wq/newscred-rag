/**
 * Sensationalism & Clickbait Risk Detector
 * Detects sensationalist linguistic patterns, unverified absolutes, and headline escalation markers.
 */

const SENSATIONAL_PHRASES = [
  "shocking truth",
  "they don't want you to know",
  "miracle cure",
  "secret remedy",
  "100% proven",
  "doctors are furious",
  "you won't believe",
  "unbelievable discovery",
  "conspiracy exposed",
  "guaranteed results",
];

const ABSOLUTE_QUALIFIERS = [
  "definitely",
  "undeniably",
  "always",
  "never",
  "completely",
  "instantly",
  "magic",
  "toxic",
];

export class SensationalismDetector {
  static analyze(text) {
    if (!text || typeof text !== "string") {
      return { score: 0, flags: [], level: "LOW" };
    }

    const lower = text.toLowerCase();
    const flags = [];
    let riskPoints = 0;

    // 1. Sensational phrase matches
    for (const phrase of SENSATIONAL_PHRASES) {
      if (lower.includes(phrase)) {
        flags.push(`Sensationalist phrase: "${phrase}"`);
        riskPoints += 0.35;
      }
    }

    // 2. Absolute / hyperbole terms
    const tokens = lower.split(/\s+/);
    let absoluteCount = 0;
    for (const tok of tokens) {
      const clean = tok.replace(/[^a-z]/g, "");
      if (ABSOLUTE_QUALIFIERS.includes(clean)) {
        absoluteCount++;
      }
    }
    if (absoluteCount >= 2) {
      flags.push(`Multiple ungrounded absolutes (${absoluteCount})`);
      riskPoints += Math.min(0.3, absoluteCount * 0.1);
    }

    // 3. Excessive punctuation (!!!, ???, !?)
    if (/[!?]{2,}/.test(text)) {
      flags.push("Excessive punctuation markers");
      riskPoints += 0.2;
    }

    // 4. Excessive uppercase words (>3 characters)
    const words = text.split(/\s+/);
    const upperWords = words.filter((w) => w.length > 3 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));
    if (upperWords.length >= 2) {
      flags.push(`Shouting / capitalized emphasis: ${upperWords.slice(0, 3).join(", ")}`);
      riskPoints += 0.25;
    }

    const normalizedScore = Number(Math.min(1.0, riskPoints).toFixed(2));
    const level = normalizedScore >= 0.7 ? "HIGH" : normalizedScore >= 0.35 ? "MEDIUM" : "LOW";

    return {
      score: normalizedScore,
      flags,
      level,
    };
  }
}
