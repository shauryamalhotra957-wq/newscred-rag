"use strict";

const DEFAULT_TIMEOUT_MS = 6500;

const LIVE_FEEDS = [
  {
    id: "bbc-world",
    name: "BBC News",
    region: "United Kingdom / Global",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml"
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    region: "Qatar / Global",
    url: "https://www.aljazeera.com/xml/rss/all.xml"
  },
  {
    id: "guardian-world",
    name: "The Guardian",
    region: "United Kingdom / Global",
    url: "https://www.theguardian.com/world/rss"
  },
  {
    id: "npr-news",
    name: "NPR",
    region: "United States",
    url: "https://feeds.npr.org/1001/rss.xml"
  },
  {
    id: "france24",
    name: "France 24",
    region: "France / Global",
    url: "https://www.france24.com/en/rss"
  },
  {
    id: "dw",
    name: "Deutsche Welle",
    region: "Germany / Global",
    url: "https://rss.dw.com/rdf/rss-en-all"
  },
  {
    id: "abc-au",
    name: "ABC News Australia",
    region: "Australia",
    url: "https://www.abc.net.au/news/feed/51120/rss.xml"
  },
  {
    id: "ap-top",
    name: "Associated Press",
    region: "United States / Global",
    url: "https://apnews.com/hub/ap-top-news?output=rss"
  }
];

let cache = {
  fetchedAt: 0,
  payload: null
};

function decodeCodePoint(value, radix = 10) {
  const codePoint = Number.parseInt(value, radix);
  if (!Number.isFinite(codePoint)) return "";
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => decodeCodePoint(code))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => decodeCodePoint(code, 16))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripTags(value) {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(block, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function linkValue(block) {
  const textLink = tagValue(block, "link");
  if (textLink) return textLink;
  const atomLink = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return atomLink ? decodeEntities(atomLink[1]).trim() : "";
}

function parseFeed(xml, feed) {
  const blocks = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || String(xml || "").match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks
    .map((block, index) => {
      const title = tagValue(block, "title");
      const link = linkValue(block);
      const summary = tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content:encoded");
      const publishedAt = tagValue(block, "pubDate") || tagValue(block, "dc:date") || tagValue(block, "updated") || tagValue(block, "published");
      const author = tagValue(block, "dc:creator") || tagValue(block, "author") || feed.name;
      if (!title || !link) return null;
      return {
        id: `${feed.id}-${index}`,
        source: feed.name,
        region: feed.region,
        title,
        sourceUrl: link,
        author,
        publishedAt,
        body: [title, summary].filter(Boolean).join(". "),
        summary
      };
    })
    .filter(Boolean);
}

async function defaultFetchText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NewsCred-RAG/1.0 (+https://localhost)",
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });
    if (!response.ok) throw new Error(`feed_http_${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGlobalNews(options = {}) {
  const feeds = options.feeds || LIVE_FEEDS;
  const fetchText = options.fetchText || defaultFetchText;
  const perFeed = options.perFeed || 4;
  const limit = options.limit || 24;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const cacheMs = options.cacheMs ?? 5 * 60 * 1000;
  const now = Date.now();

  if (!options.skipCache && cache.payload && now - cache.fetchedAt < cacheMs) {
    return { ...cache.payload, cached: true };
  }

  const feedResults = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const xml = await fetchText(feed.url, timeoutMs);
        const items = parseFeed(xml, feed).slice(0, perFeed);
        return { feed: feed.name, ok: true, count: items.length, items };
      } catch (error) {
        return { feed: feed.name, ok: false, count: 0, error: error.message, items: [] };
      }
    })
  );

  const items = feedResults
    .flatMap((result) => result.items)
    .sort((a, b) => {
      const left = Date.parse(a.publishedAt) || 0;
      const right = Date.parse(b.publishedAt) || 0;
      return right - left;
    })
    .slice(0, limit);

  const payload = {
    fetchedAt: new Date().toISOString(),
    feeds: feedResults.map(({ feed, ok, count, error }) => ({ feed, ok, count, error })),
    items
  };
  if (feedResults.some((result) => result.ok)) {
    cache = { fetchedAt: now, payload };
  }
  return payload;
}

module.exports = {
  LIVE_FEEDS,
  decodeEntities,
  fetchGlobalNews,
  parseFeed,
  stripTags
};
