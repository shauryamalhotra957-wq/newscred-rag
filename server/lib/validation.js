"use strict";

const ARTICLE_LIMITS = Object.freeze({
  title: 220,
  sourceUrl: 500,
  author: 120,
  publishedAt: 80,
  body: 12000
});

function validationErrors(article = {}) {
  const errors = {};
  if (!String(article.title || "").trim()) errors.title = "A headline is required.";
  if (!String(article.body || "").trim()) errors.body = "Article body text is required.";
  for (const [field, limit] of Object.entries(ARTICLE_LIMITS)) {
    if (String(article[field] || "").length > limit) errors[field] = `Must be ${limit} characters or fewer.`;
  }
  const sourceUrl = String(article.sourceUrl || "").trim();
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (!/^https?:$/.test(url.protocol)) errors.sourceUrl = "Use an HTTP or HTTPS URL.";
    } catch {
      errors.sourceUrl = "Use a valid source URL.";
    }
  }
  return errors;
}

function validateArticle(article) {
  const errors = validationErrors(article);
  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { ARTICLE_LIMITS, validateArticle, validationErrors };
