"use strict";

const state = {
  csrfToken: null,
  samples: [],
  liveNews: []
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

function formatDate(value) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Date unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(parsed));
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
  await verifyCurrentArticle();
}

async function verifyCurrentArticle() {
  setStatus("Verifying");
  const data = await api("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article: collectArticle() })
  });
  renderResult(data.result);
  setStatus("Verdict ready");
}

function renderLiveNews(payload) {
  state.liveNews = payload.items || [];
  const healthyFeeds = (payload.feeds || []).filter((feed) => feed.ok).length;
  const totalFeeds = (payload.feeds || []).length;
  $("#liveStatus").textContent = `${state.liveNews.length} live stories loaded from ${healthyFeeds}/${totalFeeds} available feeds. Click Check story to score source credibility, evidence alignment, and review gaps.`;
  if (!state.liveNews.length) {
    $("#liveNewsBody").innerHTML = '<div class="empty">No live headlines loaded. Try refresh again in a moment.</div>';
    return;
  }
  $("#liveNewsBody").innerHTML = state.liveNews
    .map((item, index) => {
      const score = item.verification?.score ?? "--";
      const verdict = item.verification?.verdict?.label || "Not checked";
      const sourceScore = item.verification?.credentials?.score ?? "--";
      return `
        <article class="live-card">
          <div class="live-meta">
            <span>${escapeHtml(item.source)}</span>
            <span>${escapeHtml(item.region)}</span>
            <span>${escapeHtml(formatDate(item.publishedAt))}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary || "RSS summary unavailable; the verifier will use the headline and source metadata.")}</p>
          <div class="live-verdict">
            <span>Verdict preview <strong>${escapeHtml(verdict)}</strong></span>
            <span>Story score <strong>${escapeHtml(score)}</strong></span>
            <span>Source score <strong>${escapeHtml(sourceScore)}</strong></span>
          </div>
          <div class="actions compact">
            <button class="primary" type="button" data-live-index="${index}" title="Fact-check this live story">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12l2 2 4-5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              Check story
            </button>
            <a class="button-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Open source</a>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadLiveNews() {
  $("#liveStatus").textContent = "Loading live headlines...";
  $("#liveNewsBody").innerHTML = '<div class="empty">Fetching public RSS feeds.</div>';
  try {
    const payload = await api("/api/live-news");
    renderLiveNews(payload);
  } catch (error) {
    $("#liveStatus").textContent = error.message;
    $("#liveNewsBody").innerHTML = '<div class="empty">Live feed loading failed. Manual verification still works.</div>';
  }
}

async function checkLiveStory(index) {
  const item = state.liveNews[index];
  if (!item) return;
  $("#title").value = item.title || "";
  $("#sourceUrl").value = item.sourceUrl || "";
  $("#author").value = item.author || item.source || "";
  $("#publishedAt").value = item.publishedAt || "";
  $("#body").value = item.body || item.summary || item.title || "";
  document.querySelector("#verify").scrollIntoView({ behavior: "smooth", block: "start" });
  await verifyCurrentArticle();
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
  $("#refreshNews").addEventListener("click", () => loadLiveNews());
  $("#liveNewsBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-live-index]");
    if (!button) return;
    checkLiveStory(Number(button.dataset.liveIndex)).catch((error) => {
      setStatus("Try again");
      $("#verdictLabel").textContent = "Could not verify";
      $("#verdictNote").textContent = error.message;
    });
  });
  loadLiveNews();
}

if (typeof document !== "undefined") {
  init();
}

if (typeof module !== "undefined") {
  module.exports = { escapeHtml, formatDate };
}
