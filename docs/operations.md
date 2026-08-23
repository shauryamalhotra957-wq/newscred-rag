# Operations Guide

## Run locally

Run `npm start` and open `http://127.0.0.1:4273`. The process binds to loopback by default; put a TLS-terminating reverse proxy in front of it for deployment.

## Checks

Run `npm test` before deployment. Check `GET /api/health` for liveness and monitor 4xx/5xx responses at the proxy.

## Data updates

Review evidence-corpus and source-registry changes for provenance, publication date, licensing, and relevance. Keep the corpus curated rather than treating retrieved snippets as proof.
