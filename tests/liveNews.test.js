"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { decodeEntities, parseFeed } = require("../server/lib/liveNews");

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
