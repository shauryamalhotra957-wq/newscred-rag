# Verifier scoring contract

NewsCred returns an auditable assessment, not a proof of truth.

- Source credentials, retrieved evidence, claim support, evidence markers, and risk warnings contribute separately to the score.
- Short claims may match one precise evidence term; longer claims require multiple meaningful overlapping terms.
- Retrieval results are bounded before ranking, and every response includes provenance fields.
- Verification IDs are UUID-based so concurrent checks cannot overwrite one another in downstream consumers.
- Low-confidence or high-risk results should be reviewed by a human editor before publication.

The overlap and retrieval bounds are exercised by tests/evidence-overlap.test.js and tests/retrieval-bounds.test.js.
