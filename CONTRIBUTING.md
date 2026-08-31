# Contributing

Install the locked JavaScript dependencies and run the repository checks:

~~~bash
npm ci
npm test
npm run build
~~~

Preserve source attribution and the distinction between retrieved evidence and generated copy. Add regression coverage for ingestion, citation rendering, and low-confidence or missing-source behavior.

Never commit private news feeds, provider keys, or unreviewed claims.
