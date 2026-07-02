"use strict";

const { tokenize } = require("./text");

function termCounts(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}

function cosineSimilarity(aTokens, bTokens) {
  const a = termCounts(aTokens);
  const b = termCounts(bTokens);
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (const value of a.values()) aNorm += value * value;
  for (const value of b.values()) bNorm += value * value;
  for (const [token, value] of a.entries()) dot += value * (b.get(token) || 0);
  if (!aNorm || !bNorm) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function evidenceText(doc) {
  return [doc.title, doc.source, doc.summary, ...(doc.topics || []), ...(doc.claims || [])].join(" ");
}

function retrieveEvidence({ query, claims = [], corpus, topK = 5 }) {
  const queryTokens = tokenize([query, ...claims].join(" "));
  return corpus
    .map((doc) => {
      const docTokens = tokenize(evidenceText(doc));
      const similarity = cosineSimilarity(queryTokens, docTokens);
      const topicHits = (doc.topics || []).filter((topic) => query.toLowerCase().includes(topic.toLowerCase())).length;
      const score = similarity * 100 + topicHits * 4 + Number(doc.credibility || 0) / 25;
      return {
        ...doc,
        score: Number(score.toFixed(3)),
        similarity: Number(similarity.toFixed(3))
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = {
  cosineSimilarity,
  retrieveEvidence
};
