"use strict";

const { scoreSourceCredentials } = require("./credentials");
const { retrieveEvidence } = require("./rag");
const { extractClaims, sanitizeText } = require("./text");

function riskSignals(article, claims) {
  const text = sanitizeText([article.title, article.body].join(" "), 12000).toLowerCase();
  const warnings = [];
  const strengths = [];

  const hype = ["miracle", "secret", "doctors hate", "share before", "censored", "guaranteed", "overnight", "shocking"];
  const hypeHits = hype.filter((word) => text.includes(word));
  if (hypeHits.length) warnings.push(`Sensational language: ${hypeHits.join(", ")}`);

  if (/\b(anonymous|unnamed|sources say|people are saying)\b/.test(text)) {
    warnings.push("Relies on anonymous or vague sourcing");
  }

  if (/\b(study|trial|data|filing|statement|official|according to|report)\b/.test(text)) {
    strengths.push("Mentions evidence-bearing source types");
  }

  if (claims.length > 0) strengths.push(`${claims.length} checkable claim(s) extracted`);
  if (sanitizeText(article.body, 12000).length < 180) warnings.push("Article body is too short for strong verification");

  return { warnings, strengths };
}

function compareEvidence(claims, evidence) {
  const support = [];
  const gaps = [];
  for (const claim of claims) {
    const claimLower = claim.toLowerCase();
    const matching = evidence.filter((doc) => {
      const haystack = [doc.title, doc.summary, ...(doc.claims || []), ...(doc.topics || [])].join(" ").toLowerCase();
      return claimLower
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .some((word) => haystack.includes(word));
    });
    if (matching.length) {
      support.push({ claim, evidenceIds: matching.slice(0, 3).map((doc) => doc.id) });
    } else {
      gaps.push(claim);
    }
  }
  return { support, gaps };
}

function verdictFromScore(score) {
  if (score >= 82) return { label: "High confidence", tone: "verified" };
  if (score >= 64) return { label: "Likely credible, needs monitoring", tone: "credible" };
  if (score >= 46) return { label: "Unverified", tone: "caution" };
  return { label: "High risk", tone: "risk" };
}

function verifyArticle({ article, corpus, registry }) {
  const cleanArticle = {
    title: sanitizeText(article.title, 220),
    sourceUrl: sanitizeText(article.sourceUrl, 500),
    author: sanitizeText(article.author, 120),
    publishedAt: sanitizeText(article.publishedAt, 80),
    body: sanitizeText(article.body, 12000)
  };
  const claims = extractClaims(cleanArticle);
  const credential = scoreSourceCredentials(cleanArticle, registry);
  const evidence = retrieveEvidence({
    query: [cleanArticle.title, cleanArticle.body].join(" "),
    claims,
    corpus,
    topK: 5
  });
  const comparison = compareEvidence(claims, evidence);
  const risks = riskSignals(cleanArticle, claims);

  const evidenceScore = evidence.length
    ? Math.round(evidence.reduce((sum, doc) => sum + doc.score, 0) / evidence.length)
    : 0;
  const supportRatio = claims.length ? comparison.support.length / claims.length : 0;
  const gapPenalty = comparison.gaps.length * 5;
  const riskPenalty = risks.warnings.length * 4;
  const strengthBonus = risks.strengths.length * 3;
  const finalScore = Math.max(
    0,
    Math.min(100, Math.round(credential.score * 0.42 + evidenceScore * 0.34 + supportRatio * 24 + strengthBonus - gapPenalty - riskPenalty))
  );
  const verdict = verdictFromScore(finalScore);

  return {
    id: `check_${Date.now().toString(36)}`,
    article: cleanArticle,
    verdict,
    score: finalScore,
    credentials: credential,
    claims,
    evidence: evidence.map((doc) => ({
      id: doc.id,
      title: doc.title,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      summary: doc.summary,
      credibility: doc.credibility,
      score: doc.score,
      similarity: doc.similarity
    })),
    comparison,
    strengths: risks.strengths,
    warnings: [...credential.warnings, ...risks.warnings],
    method: {
      retrieval: "Tokenized cosine similarity over curated evidence documents, boosted by topic hits and source credibility.",
      scoring:
        "Final score blends source credentials, retrieved evidence strength, claim support ratio, risk penalties, and evidence markers.",
      limitations:
        "This prototype does not prove truth. It produces an auditable credibility assessment and points humans to evidence."
    }
  };
}

module.exports = {
  compareEvidence,
  verdictFromScore,
  verifyArticle
};
