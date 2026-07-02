"use strict";

const { extractDomain, sanitizeText } = require("./text");

function findRegistryEntry(domain, registry) {
  if (!domain) return null;
  return registry.find((entry) => domain === entry.domain || domain.endsWith(`.${entry.domain}`)) || null;
}

function scoreSourceCredentials(article, registry) {
  const sourceUrl = sanitizeText(article.sourceUrl, 500);
  const domain = extractDomain(sourceUrl);
  const registryEntry = findRegistryEntry(domain, registry);
  let score = registryEntry ? registryEntry.credentialScore : 42;
  const signals = [];
  const warnings = [];

  if (sourceUrl.startsWith("https://")) {
    score += 4;
    signals.push("HTTPS source URL");
  } else if (sourceUrl) {
    score -= 8;
    warnings.push("Source URL is not HTTPS");
  } else {
    score -= 12;
    warnings.push("No source URL supplied");
  }

  if (registryEntry) {
    signals.push(`Known source: ${registryEntry.name}`);
    for (const strength of registryEntry.strengths || []) signals.push(strength);
    for (const flag of registryEntry.riskFlags || []) warnings.push(flag);
  } else {
    warnings.push("Domain is not in the trusted source registry");
  }

  if (sanitizeText(article.author, 120)) {
    score += 6;
    signals.push("Named author/byline supplied");
  } else {
    score -= 10;
    warnings.push("No named author/byline");
  }

  if (sanitizeText(article.publishedAt, 80)) {
    score += 5;
    signals.push("Publication date supplied");
  } else {
    score -= 8;
    warnings.push("No publication date");
  }

  const body = sanitizeText(article.body, 12000).toLowerCase();
  const citationSignals = [
    "according to",
    "study",
    "trial",
    "filing",
    "statement",
    "official",
    "data",
    "report",
    "press release"
  ].filter((phrase) => body.includes(phrase));
  if (citationSignals.length >= 2) {
    score += 8;
    signals.push("Contains citation language and evidence markers");
  } else {
    score -= 6;
    warnings.push("Few citation or evidence markers in article body");
  }

  return {
    domain,
    sourceName: registryEntry ? registryEntry.name : domain || "Unknown source",
    sourceType: registryEntry ? registryEntry.type : "unregistered",
    score: Math.max(0, Math.min(100, Math.round(score))),
    signals: Array.from(new Set(signals)).slice(0, 10),
    warnings: Array.from(new Set(warnings)).slice(0, 10)
  };
}

module.exports = {
  findRegistryEntry,
  scoreSourceCredentials
};
