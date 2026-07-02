# Security Notes

News verification tools handle adversarial text. Treat every submitted article as untrusted input.

## Implemented

- CSRF protection for write endpoints.
- Same-origin write enforcement.
- Restrictive CSP, frame, referrer, permissions, and nosniff headers.
- Rate limiting, with stricter limits on verification.
- Request size limits.
- Static path traversal protection.
- Prompt-injection phrase stripping from article text.
- Escaped frontend rendering for all returned article/evidence text.

## Production Checklist

- Add authenticated accounts and role-based access control.
- Run submitted URLs through isolated fetch workers, not the app server.
- Store evidence and verdict audit logs in an append-only datastore.
- Add malware/media scanning for images and videos.
- Validate publisher credentials with verifiable credentials where available.
- Connect to C2PA manifest inspection for media provenance.
- Add abuse monitoring for coordinated disinformation submissions.
- Add human escalation for high-impact health, election, financial, and safety claims.
