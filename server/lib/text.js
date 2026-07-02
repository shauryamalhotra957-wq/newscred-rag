"use strict";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "with"
]);

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sanitizeText(value, max = 8000) {
  return normalizeWhitespace(value)
    .replace(/[<>]/g, "")
    .replace(/\b(ignore previous|system prompt|developer message|jailbreak|exfiltrate|api key|password)\b/gi, "")
    .slice(0, max);
}

function tokenize(input) {
  return sanitizeText(input, 20000)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/'(s)?$/, ""))
    .map((token) => {
      if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
      if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
      if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
      if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
      return token;
    })
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function splitSentences(input) {
  const cleaned = sanitizeText(input, 12000);
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)
    .slice(0, 24);
}

function extractDomain(url) {
  try {
    const parsed = new URL(String(url || ""));
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function extractClaims({ title, body }) {
  const sentences = splitSentences(body);
  const claimish = sentences.filter((sentence) =>
    /\b(claims?|says?|announced|reported|confirmed|according|study|trial|killed|injured|approved|banned|launched|acquired|cures?|causes?|reduced|increased|fell|rose)\b/i.test(sentence)
  );
  const claims = [sanitizeText(title, 180), ...claimish].filter(Boolean);
  return Array.from(new Set(claims)).slice(0, 8);
}

module.exports = {
  extractClaims,
  extractDomain,
  normalizeWhitespace,
  sanitizeText,
  splitSentences,
  tokenize
};
