"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFeed } = require("../server/lib/liveNews");

const feed = {
  id: "test",
  name: "Test Wire",
  region: "Global"
};

test("RSS parser keeps only http and https article links", () => {
  const xml = [
    "<rss><channel>",
    "<item><title>Safe story</title><link>https://news.example.test/story</link></item>",
    "<item><title>Unsafe story</title><link>javascript:alert(1)</link></item>",
    "<item><title>Local file</title><link>file:///etc/passwd</link></item>",
    "</channel></rss>"
  ].join("");

  const items = parseFeed(xml, feed);

  assert.deepEqual(items.map((item) => item.title), ["Safe story"]);
  assert.equal(items[0].sourceUrl, "https://news.example.test/story");
});
