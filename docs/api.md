# HTTP API

All JSON responses use `application/json; charset=utf-8`.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Liveness information. |
| `/api/session` | GET | Creates or resumes a session and returns a CSRF token. |
| `/api/samples` | GET | Returns local demonstration articles. |
| `/api/corpus` | GET | Lists evidence and registered sources. |
| `/api/live-news` | GET | Retrieves normalized feed items with local assessments. |
| `/api/verify` | POST | Verifies an `article` object. Requires the session cookie and `X-CSRF-Token`. |

`POST /api/verify` accepts `title`, `sourceUrl`, `author`, `publishedAt`, and `body`. It returns a score, banded verdict, credential signals, evidence, claim comparison, warnings, and method notes. The score is an assessment aid, not a truth determination.

## Discovery parameters and response headers

`GET /api/corpus` accepts an optional case-insensitive `q` query and a bounded `limit` from 1 to 100. JSON responses include `Cache-Control: no-store` and an `X-Request-Id` header; callers may provide a safe 8–80 character request ID for log correlation.
