# Threat Model

## Assets

- Submitted article text and URLs.
- Source registry and evidence corpus.
- Verification scores and audit logs.
- Future user accounts and reviewer notes.

## Risks

- Prompt injection inside submitted article text.
- Defamation or overconfident truth labels.
- Malicious URLs or HTML if live fetching is added.
- Coordinated spam submissions.
- Evidence corpus poisoning.
- Frontend injection through article text.

## Current Mitigations

- User article text is sanitized and never interpreted as instruction.
- The app returns confidence labels rather than absolute truth claims.
- Frontend output is HTML-escaped.
- CSRF, same-origin checks, rate limits, and security headers are enabled.
- The local corpus is curated static JSON.

## Production Mitigations

- Signed corpus updates and editorial review.
- Isolated URL fetching and HTML parsing workers.
- Abuse detection and account-level rate limits.
- Human review for high-impact claims.
- Source credential verification with verifiable credentials where available.
- Immutable verdict logs with retrieved evidence hashes.
