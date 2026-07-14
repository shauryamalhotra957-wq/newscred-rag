"use strict";

const state = {
  csrfToken: null,
  samples: [],
  liveNews: [],
  activeFilter: "all",
  query: "",
  selectedIndex: null,
  lastResult: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char];
  });
}

function safeExternalUrl(value) {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(String(value || ""), origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function displayHost(value, fallback = "Unknown source") {
  const href = safeExternalUrl(value);
  if (href === "#") return fallback;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function setStatus(text) {
  const status = $("#apiStatus");
  if (status) status.textContent = text;
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

function formatBriefDate(value = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashText(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function storyText(item) {
  return [item.title, item.summary, item.body, item.source, item.region].filter(Boolean).join(" ").toLowerCase();
}

function storyTopic(item) {
  const text = storyText(item);
  if (/\b(health|hospital|cancer|flu|trial|drug|disease|ebola|bird flu|medical)\b/.test(text)) return "health";
  if (/\b(president|parliament|government|minister|court|judge|election|policy|trump|hhs|congress)\b/.test(text)) return "politics";
  if (/\b(market|company|debt|bank|trade|tax|stock|funding|education|business)\b/.test(text)) return "business";
  if (/\b(ai|technology|data|cyber|video|software|platform|model)\b/.test(text)) return "technology";
  if (/\b(world cup|fifa|team|match|semifinal|player|sport)\b/.test(text)) return "sports";
  return "world";
}

function getVerification(item) {
  return item.verification || item;
}

function coverageProfile(item) {
  const verification = getVerification(item);
  const score = Number(verification.score ?? 52);
  const sourceScore = Number(verification.credentials?.score ?? verification.sourceScore ?? score);
  const warningCount = Number(verification.warnings?.length ?? 0);
  const title = item.title || item.article?.title || "";
  const h = hashText([title, item.source, item.sourceUrl].join("|"));
  const centerBase = clamp(Math.round(28 + sourceScore * 0.24 - warningCount * 2 + (h % 11)), 18, 58);
  const remaining = 100 - centerBase;
  const tilt = ((h % 35) - 17) + (score < 46 ? 8 : 0);
  let left = clamp(Math.round(remaining / 2 + tilt), 8, 74);
  let right = clamp(100 - centerBase - left, 8, 74);
  left = clamp(100 - centerBase - right, 8, 74);
  const total = left + centerBase + right;
  const leftPct = Math.round((left / total) * 100);
  const centerPct = Math.round((centerBase / total) * 100);
  const rightPct = 100 - leftPct - centerPct;
  const spread = Math.max(leftPct, centerPct, rightPct) - Math.min(leftPct, centerPct, rightPct);
  const sourceCount = clamp(Math.round(5 + sourceScore * 0.55 + (h % 38)), 8, 96);
  const original = clamp(Math.round(35 + sourceScore * 0.42 - warningCount * 3 + (h % 16)), 18, 94);
  const dominant = [
    ["Left", leftPct],
    ["Center", centerPct],
    ["Right", rightPct]
  ].sort((a, b) => b[1] - a[1])[0][0];

  return {
    left: leftPct,
    center: centerPct,
    right: rightPct,
    spread,
    sourceCount,
    original,
    dominant,
    blindspot: spread >= 34,
    balance: spread < 20 ? "Balanced" : `${dominant} heavy`,
    topic: storyTopic(item)
  };
}

function verdictTone(score) {
  if (score >= 82) return "verified";
  if (score >= 64) return "credible";
  if (score >= 46) return "caution";
  return "risk";
}

function scoreLabel(score) {
  if (score >= 82) return "High confidence";
  if (score >= 64) return "Likely credible";
  if (score >= 46) return "Unverified";
  return "High risk";
}

function coverageBars(profile) {
  return `
    <div class="coverage-bars" role="img" aria-label="Demo coverage estimate: left ${profile.left} percent, center ${profile.center} percent, right ${profile.right} percent">
      <span class="bar-left" style="width:${profile.left}%"></span>
      <span class="bar-center" style="width:${profile.center}%"></span>
      <span class="bar-right" style="width:${profile.right}%"></span>
    </div>
    <div class="coverage-legend">
      <span><i class="dot left"></i>Left ${profile.left}%</span>
      <span><i class="dot center"></i>Center ${profile.center}%</span>
      <span><i class="dot right"></i>Right ${profile.right}%</span>
    </div>
  `;
}

function updateActiveButtons() {
  $$("#topicFilters [data-filter], #quickFilters [data-filter]").forEach((button) => {
    const active = button.dataset.filter === state.activeFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function filteredStories() {
  const query = state.query.trim().toLowerCase();
  return state.liveNews.filter((item) => {
    const profile = coverageProfile(item);
    const verification = item.verification || {};
    const sourceScore = Number(verification.credentials?.score ?? 0);
    const textMatch = !query || storyText(item).includes(query);
    if (!textMatch) return false;
    if (state.activeFilter === "all") return true;
    if (state.activeFilter === "blindspot") return profile.blindspot;
    if (state.activeFilter === "balanced") return profile.balance === "Balanced";
    if (state.activeFilter === "high-source") return sourceScore >= 90;
    return profile.topic === state.activeFilter;
  });
}

function setMetric(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function renderStats() {
  const stories = state.liveNews;
  const profiles = stories.map(coverageProfile);
  const averageOriginal = profiles.length
    ? Math.round(profiles.reduce((sum, profile) => sum + profile.original, 0) / profiles.length)
    : 0;
  setMetric("#storyCount", stories.length || "--");
  setMetric("#sourceCount", new Set(stories.map((item) => item.source)).size || "--");
  setMetric("#blindspotCount", profiles.filter((profile) => profile.blindspot).length || "--");
  setMetric("#originalRate", profiles.length ? `${averageOriginal}%` : "--");
}

function renderBriefing(stories) {
  const body = $("#briefingBody");
  if (!body) return;
  const topStories = stories.slice(0, 3);
  body.innerHTML = topStories
    .map((item, index) => {
      const verification = item.verification || {};
      const profile = coverageProfile(item);
      const tone = verdictTone(Number(verification.score ?? 0));
      return `
        <article class="briefing-item">
          <span class="rank">${index + 1}</span>
          <div>
            <p>${escapeHtml(item.source)} / ${escapeHtml(profile.topic)}</p>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
          <strong class="${tone}">${escapeHtml(scoreLabel(Number(verification.score ?? 0)))}</strong>
        </article>
      `;
    })
    .join("");
}

function renderSources() {
  const body = $("#sourceBody");
  if (!body) return;
  const grouped = new Map();
  state.liveNews.forEach((item) => {
    const current = grouped.get(item.source) || { source: item.source, count: 0, score: 0, region: item.region };
    current.count += 1;
    current.score += Number(item.verification?.credentials?.score ?? 0);
    grouped.set(item.source, current);
  });
  const rows = Array.from(grouped.values())
    .map((row) => ({ ...row, average: Math.round(row.score / Math.max(1, row.count)) }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 6);
  body.classList.toggle("empty", rows.length === 0);
  body.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <div class="source-row">
              <span>${escapeHtml(row.source)}</span>
              <strong>${row.average}</strong>
            </div>
          `
        )
        .join("")
    : "Loading sources.";
}

function renderBlindspots(stories = state.liveNews) {
  const body = $("#blindspotBody");
  if (!body) return;
  const rows = stories
    .map((item) => ({ item, profile: coverageProfile(item) }))
    .filter(({ profile }) => profile.blindspot)
    .sort((a, b) => b.profile.spread - a.profile.spread)
    .slice(0, 5);
  body.classList.toggle("empty", rows.length === 0);
  body.innerHTML = rows.length
    ? rows
        .map(
          ({ item, profile }) => `
            <button class="blindspot-row" type="button" data-live-index="${state.liveNews.indexOf(item)}">
              <span>${escapeHtml(profile.balance)}</span>
              <strong>${escapeHtml(item.title)}</strong>
            </button>
          `
        )
        .join("")
    : "No major coverage gaps in this slice.";
}

function renderStoryCard(item, index) {
  const verification = item.verification || {};
  const score = Number(verification.score ?? 0);
  const sourceScore = Number(verification.credentials?.score ?? 0);
  const verdict = verification.verdict?.label || scoreLabel(score);
  const profile = coverageProfile(item);
  const isActive = state.selectedIndex === index;
  return `
    <article class="story-card ${isActive ? "active" : ""}">
      <div class="story-topline">
        <span>${escapeHtml(item.source)}</span>
        <span>${escapeHtml(item.region)}</span>
        <span>${escapeHtml(formatDate(item.publishedAt))}</span>
      </div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary || "RSS summary unavailable.")}</p>
      ${coverageBars(profile)}
      <div class="story-metrics">
        <span>${profile.sourceCount} sources</span>
        <span>${profile.balance}</span>
        <span>${profile.original}% original</span>
        <span>${sourceScore} source score</span>
      </div>
      <div class="story-actions">
        <button class="primary" type="button" data-live-index="${index}" title="Compare this story">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h7M17 14l3 3-3 3" /></svg>
          Compare
        </button>
        <a class="button-link" href="${escapeHtml(safeExternalUrl(item.sourceUrl))}" target="_blank" rel="noreferrer">Open source</a>
        <span class="verdict-pill ${verdictTone(score)}">${escapeHtml(verdict)}</span>
      </div>
    </article>
  `;
}

function renderDashboard() {
  updateActiveButtons();
  renderStats();
  renderSources();
  const stories = filteredStories();
  renderBriefing(stories);
  renderBlindspots(stories.length ? stories : state.liveNews);
  const liveBody = $("#liveNewsBody");
  if (!liveBody) return;
  liveBody.innerHTML = stories.length
    ? stories.map((item) => renderStoryCard(item, state.liveNews.indexOf(item))).join("")
    : '<div class="empty state-card">No matching stories in the current feed.</div>';
}

function renderSelectedStory(item, result) {
  const body = $("#selectedStoryBody");
  if (!body) return;
  if (!item && !result) {
    body.classList.add("empty");
    body.textContent = "No story compared yet.";
    return;
  }
  const article = result?.article || item || {};
  const verification = result || item?.verification || {};
  const profile = coverageProfile({ ...item, ...article, verification });
  const score = Number(verification.score ?? 0);
  body.classList.remove("empty");
  body.innerHTML = `
    <h3>${escapeHtml(article.title || item?.title || "Untitled story")}</h3>
    <div class="selected-meta">
      <span>${escapeHtml(displayHost(article.sourceUrl, item?.source || "Unknown source"))}</span>
      <span>${profile.sourceCount} sources</span>
      <span>${profile.balance}</span>
    </div>
    ${coverageBars(profile)}
    <div class="mini-score">
      <span>Credibility</span>
      <strong class="${verdictTone(score)}">${score || "--"}</strong>
    </div>
  `;
}

function renderResult(result, item = null) {
  const score = Number(result.score || 0);
  const profile = coverageProfile({ ...(item || {}), ...result.article, verification: result });
  $("#resultTitle").textContent = result.article.title || "Untitled story";
  $("#scoreRing").textContent = `${score}`;
  $("#scoreRing").className = `score-ring ${verdictTone(score)}`;
  $("#scoreRing").style.background = `conic-gradient(var(--tone-color) ${score * 3.6}deg, rgba(18, 31, 45, 0.12) 0deg)`;
  $("#verdictLabel").textContent = result.verdict.label;
  $("#verdictNote").textContent = result.method.limitations;

  $("#credentialBody").innerHTML = `
    <div class="coverage-card">
      ${coverageBars(profile)}
      <div class="metric-row"><span>Demo coverage</span><strong>${profile.balance}</strong></div>
      <div class="metric-row"><span>Estimated sources</span><strong>${profile.sourceCount}</strong></div>
    </div>
    <div class="metric-row"><span>Source</span><strong>${escapeHtml(result.credentials.sourceName)}</strong></div>
    <div class="metric-row"><span>Domain</span><strong>${escapeHtml(result.credentials.domain || "unknown")}</strong></div>
    <div class="metric-row"><span>Credential score</span><strong>${result.credentials.score}/100</strong></div>
    <div class="tag-row">
      ${result.credentials.signals.map((signal) => `<span class="tag good">${escapeHtml(signal)}</span>`).join("")}
      ${result.credentials.warnings.map((warning) => `<span class="tag warning">${escapeHtml(warning)}</span>`).join("")}
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
          <a href="${escapeHtml(safeExternalUrl(doc.sourceUrl))}" target="_blank" rel="noreferrer">Source reference</a>
        </article>
      `
    )
    .join("");

  const warnings = result.warnings.map((warning) => `<span class="tag warning">${escapeHtml(warning)}</span>`).join("");
  const strengths = result.strengths.map((strength) => `<span class="tag good">${escapeHtml(strength)}</span>`).join("");
  const gaps = result.comparison.gaps.map((gap) => `<span class="tag warning">Gap: ${escapeHtml(gap)}</span>`).join("");
  $("#signalsBody").innerHTML = `<div class="tag-row">${strengths}${warnings}${gaps}</div>`;
  renderSelectedStory(item, result);
}

async function compareCurrentArticle() {
  setStatus("Comparing");
  const data = await api("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article: collectArticle() })
  });
  state.lastResult = data.result;
  renderResult(data.result);
  setStatus("Ready");
}

async function compareLiveStory(index) {
  const item = state.liveNews[index];
  if (!item) return;
  state.selectedIndex = index;
  $("#title").value = item.title || "";
  $("#sourceUrl").value = item.sourceUrl || "";
  $("#author").value = item.author || item.source || "";
  $("#publishedAt").value = item.publishedAt || "";
  $("#body").value = item.body || item.summary || item.title || "";
  renderDashboard();
  renderSelectedStory(item, item.verification);
  await compareCurrentArticle();
}

function renderLiveNews(payload) {
  state.liveNews = payload.items || [];
  const healthyFeeds = (payload.feeds || []).filter((feed) => feed.ok).length;
  const totalFeeds = (payload.feeds || []).length;
  $("#liveStatus").textContent = `${state.liveNews.length} stories from ${healthyFeeds}/${totalFeeds} available feeds. Coverage mix is a local demo estimate.`;
  if (!state.liveNews.length) {
    $("#liveNewsBody").innerHTML = '<div class="empty state-card">No live headlines loaded.</div>';
    return;
  }
  renderDashboard();
}

async function loadLiveNews() {
  $("#liveStatus").textContent = "Loading live coverage.";
  $("#liveNewsBody").innerHTML = '<div class="empty state-card">Fetching public RSS feeds.</div>';
  try {
    const payload = await api("/api/live-news");
    renderLiveNews(payload);
  } catch (error) {
    $("#liveStatus").textContent = error.message;
    $("#liveNewsBody").innerHTML = '<div class="empty state-card">Live feed loading failed. Add a story manually below.</div>';
  }
}

function bindFilterControls(containerSelector) {
  const container = $(containerSelector);
  if (!container) return;
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.activeFilter = button.dataset.filter;
    renderDashboard();
  });
}

async function init() {
  const date = $("#briefingDate");
  if (date) date.textContent = formatBriefDate();

  try {
    const session = await api("/api/session");
    state.csrfToken = session.csrfToken;
    const samples = await api("/api/samples");
    state.samples = samples.samples;
    setStatus("Ready");
  } catch {
    setStatus("Offline");
  }

  $("#verifyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    compareCurrentArticle().catch((error) => {
      setStatus("Try again");
      $("#verdictLabel").textContent = "Could not compare";
      $("#verdictNote").textContent = error.message;
    });
  });
  $("#loadCredible").addEventListener("click", () => loadSample(0));
  $("#loadRisky").addEventListener("click", () => loadSample(1));
  $("#refreshNews").addEventListener("click", () => loadLiveNews());
  $("#storySearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderDashboard();
  });
  bindFilterControls("#topicFilters");
  bindFilterControls("#quickFilters");
  $("#liveNewsBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-live-index]");
    if (!button) return;
    compareLiveStory(Number(button.dataset.liveIndex)).catch((error) => {
      setStatus("Try again");
      $("#verdictLabel").textContent = "Could not compare";
      $("#verdictNote").textContent = error.message;
    });
  });
  $("#blindspotBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-live-index]");
    if (!button) return;
    compareLiveStory(Number(button.dataset.liveIndex)).catch((error) => {
      setStatus("Try again");
      $("#verdictLabel").textContent = "Could not compare";
      $("#verdictNote").textContent = error.message;
    });
  });
  renderSelectedStory();
  loadLiveNews();
}

if (typeof document !== "undefined") {
  init();
}

if (typeof module !== "undefined") {
  module.exports = { escapeHtml, formatDate, safeExternalUrl };
}
