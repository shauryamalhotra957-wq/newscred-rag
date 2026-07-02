# Product Spec

## Goal

Give people a fast, understandable way to evaluate whether a news story deserves trust before sharing or publishing it.

## Users

- Readers checking viral stories.
- Editors triaging submissions.
- Moderators reviewing high-risk claims.
- Researchers building evidence-backed media tools.

## Core Workflow

1. Paste story metadata and article text.
2. Run verification.
3. Review source credential score.
4. Review extracted claims.
5. Review retrieved evidence and gaps.
6. Decide whether the story is high confidence, likely credible, unverified, or high risk.

## Future Production Features

- Live URL ingestion through an isolated fetch service.
- Google Fact Check Tools API integration.
- ClaimReview output publishing.
- Publisher and journalist verifiable credentials.
- C2PA media provenance checks.
- Vector database and embedding retrieval.
- LLM verdict drafting with strict citation requirements.
- Human review queues for sensitive domains.
