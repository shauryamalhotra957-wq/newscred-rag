"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { decodeEntities, fetchGlobalNews, parseFeed } = require("../server/lib/liveNews");

test("decodeEntities handles numeric code points beyond the BMP", () => {
  assert.equal(decodeEntities("Climate alert &#128680; and &#x1F30D;"), "Climate alert \u{1F6A8} and \u{1F30D}");
});

test("parseFeed preserves decoded non-BMP entities in titles", () => {
  const items = parseFeed(
    `<rss><channel><item>
      <title>Storm warning &#x1F6A8;</title>
      <link>https://example.test/story</link>
      <description>Officials issued an alert.</description>
    </item></channel></rss>`,
    { id: "example", name: "Example Wire", region: "Test" }
  );

  assert.equal(items[0].title, "Storm warning \u{1F6A8}");
  assert.equal(items[0].body, "Storm warning \u{1F6A8}. Officials issued an alert.");
});

test("fetchGlobalNews does not cache a total feed outage", async () => {
  const feed = {
    id: "example",
    name: "Example Wire",
    region: "Test",
    url: "https://example.test/rss"
  };
  let attempts = 0;
  const fetchText = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary outage");
    return `<rss><channel><item>
      <title>Service restored</title>
      <link>https://example.test/restored</link>
      <description>The feed is available again.</description>
    </item></channel></rss>`;
  };

  const first = await fetchGlobalNews({ feeds: [feed], fetchText, cacheMs: 60_000 });
  const second = await fetchGlobalNews({ feeds: [feed], fetchText, cacheMs: 60_000 });

  assert.equal(first.items.length, 0);
  assert.equal(second.items[0].title, "Service restored");
  assert.equal(attempts, 2);
});
