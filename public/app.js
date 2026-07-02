"use strict";

const state = {
  csrfToken: null,
  samples: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char];
  });
}

function setStatus(text) {
  $("#apiStatus").textContent = text;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.csrfToken && options.method && options.method !== "GET") headers.set("X-CSRF-Token", state.csrfToken);
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

function collectArticle() {
  return {
    title: $("#title").value,
    sourceUrl: $("#sourceUrl").value,
    author: $("#author").value,
    publishedAt: $("#publishedAt").value,
    body: $("#body").value
  };
}

function loadSample(index) {
  const sample = state.samples[index];
  if (!sample) return;
  $("#title").value = sample.title || "";
  $("#sourceUrl").value = sample.sourceUrl || "";
  $("#author").value = sample.author || "";
  $("#publishedAt").value = sample.publishedAt || "";
  $("#body").value = sample.body || "";
}

function renderList(items, className = "") {
  if (!items || !items.length) return '<div class="empty">None found.</div>';
  return `<ul class="list ${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderResult(result) {
  const score = result.score;
  $("#resultTitle").textContent = result.article.title || "Untitled story";
  $("#scoreRing").textContent = `${score}`;
  $("#scoreRing").style.background = `conic-gradient(${score >= 82 ? "#16805b" : score >= 64 ? "#0b7891" : score >= 46 ? "#bb7a16" : "#b63838"} ${score * 3.6}deg, rgba(18, 38, 56, 0.14) 0deg)`;
  $("#verdictLabel").textContent = result.verdict.label;
  $("#verdictNote").textContent = result.method.limitations;

  $("#credentialBody").innerHTML = `
    <div class="metric-row"><span>Source</span><strong>${escapeHtml(result.credentials.sourceName)}</strong></div>
    <div class="metric-row"><span>Domain</span><strong>${escapeHtml(result.credentials.domain || "unknown")}</strong></div>
    <div class="metric-row"><span>Credential score</span><strong>${result.credentials.score}/100</strong></div>
    <div class="tag-row">
      ${result.credentials.signals.map((item) => `<span class="tag good">${escapeHtml(item)}</span>`).join("")}
      ${result.credentials.warnings.map((item) => `<span class="tag warning">${escapeHtml(item)}</span>`).join("")}
    </div>
  `;

  $("#claimsBody").innerHTML = renderList(result.claims);
  $("#evidenceBody").innerHTML = result.evidence
    .map(
      (doc) => `
        <article class="evidence-item">
          <h3>${escapeHtml(doc.title)}</h3>
          <p>${escapeHtml(doc.summary)}</p>
          <div class="metric-row"><span>${escapeHtml(doc.source)}</span><strong>match ${doc.score}</strong></div>
          <a href="${escapeHtml(doc.sourceUrl)}" target="_blank" rel="noreferrer">Source reference</a>
        </article>
      `
    )
    .join("");

  const warnings = result.warnings.map((item) => `<span class="tag warning">${escapeHtml(item)}</span>`).join("");
  const strengths = result.strengths.map((item) => `<span class="tag good">${escapeHtml(item)}</span>`).join("");
  const gaps = result.comparison.gaps.map((item) => `<span class="tag warning">Gap: ${escapeHtml(item)}</span>`).join("");
  $("#signalsBody").innerHTML = `<div class="tag-row">${strengths}${warnings}${gaps}</div>`;
}

async function verify(event) {
  event.preventDefault();
  setStatus("Verifying");
  const data = await api("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article: collectArticle() })
  });
  renderResult(data.result);
  setStatus("Verdict ready");
}

async function init() {
  try {
    const session = await api("/api/session");
    state.csrfToken = session.csrfToken;
    const samples = await api("/api/samples");
    state.samples = samples.samples;
    setStatus("Secure session");
  } catch {
    setStatus("Offline");
  }

  $("#verifyForm").addEventListener("submit", (event) => {
    verify(event).catch((error) => {
      setStatus("Try again");
      $("#verdictLabel").textContent = "Could not verify";
      $("#verdictNote").textContent = error.message;
    });
  });
  $("#loadCredible").addEventListener("click", () => loadSample(0));
  $("#loadRisky").addEventListener("click", () => loadSample(1));
}

init();
