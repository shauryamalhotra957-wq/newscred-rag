# NewsCred RAG

NewsCred RAG is a working prototype for news verification. It checks source credentials, extracts checkable claims, retrieves relevant evidence, compares claims against that evidence, and returns an explainable verdict.

![NewsCred RAG verification newsroom](public/assets/verification-newsroom.png)

## Project Snapshot

| Area | Detail |
| --- | --- |
| Experience | Newsroom-style verification console |
| Core system | Source scoring, claim extraction, evidence retrieval, explainable verdicts |
| Design signal | Evidence-first interface with local deterministic RAG trail |
| Quality signal | Node test suite, product spec, RAG implementation notes, threat model |

## Why It Exists

News verification should be explainable. This project does not simply label an article as true or false; it shows the signals behind the assessment: source strength, claim coverage, retrieved evidence, confidence, and gaps that need human review.

## Validate

```powershell
npm.cmd run validate
```

`npm.cmd run validate` is the pre-commit check for this dependency-free prototype. It currently runs the full Node test suite.

## What It Does

- Accepts headline, source URL, author/byline, publication date, and article body.
- Scores source credentials using a local source registry plus metadata checks.
- Extracts checkable claims from the submitted article.
- Retrieves evidence from a curated evidence corpus.
- Produces a verdict, confidence score, evidence cards, credential warnings, and claim gaps.
- Documents how the verdict was produced.
- Includes tests for API behavior, source credentials, retrieval, text extraction, and verifier logic.

## Tech Stack

- Node.js
- Vanilla JavaScript frontend
- Local deterministic RAG pipeline
- JSON evidence corpus and source registry
- Node test runner

## Quick Start

```powershell
npm install
npm start
```

Open:

```text
http://127.0.0.1:4273
```

## Test

```powershell
npm test
```

## RAG Pipeline

```text
Article input
  -> sanitization
  -> claim extraction
  -> tokenization
  -> evidence retrieval
  -> credential scoring
  -> verdict generation
  -> explainable result
```

In this prototype, retrieval is local and deterministic:

1. Submitted text is sanitized.
2. Claim-like sentences are extracted.
3. Claims and evidence documents are tokenized.
4. Evidence is scored by similarity, topic overlap, and source credibility.
5. The verifier blends evidence strength, source credentials, and risk signals.
6. The UI shows the verdict and the reasoning trail.

## Production Upgrade Path

- Store evidence documents in a vector database.
- Embed article claims and evidence chunks.
- Retrieve top-k evidence with citations.
- Add Google Fact Check Tools API, ClaimReview, C2PA media provenance, and primary-source databases.
- Add an LLM only behind a strict schema with retrieved evidence as bounded context.
- Add human editorial review for high-risk or low-confidence results.

## Important Limitation

This app does not magically prove truth. It produces an auditable verification assessment. Real deployment should combine retrieval, source provenance, fact-check databases, media provenance, and human review.

## Project Structure

```text
newscred-rag/
  public/
    index.html
    app.js
    styles.css
    assets/
  server/
    index.js
    lib/
      credentials.js
      rag.js
      security.js
      text.js
      verifier.js
  data/
    evidence-corpus.json
    sample-news.json
    source-registry.json
  tests/
  docs/
```

## Documentation

- [Architecture](docs/architecture.md)
- [Product Spec](docs/product-spec.md)
- [RAG Implementation](docs/rag-implementation.md)
- [Threat Model](docs/threat-model.md)
- [Security Policy](SECURITY.md)

## Research Grounding

- ClaimReview structured data: https://schema.org/ClaimReview
- Google Fact Check Tools API: https://developers.google.com/fact-check/tools/api
- W3C Verifiable Credentials: https://www.w3.org/TR/vc-data-model-2.0/
- C2PA specification: https://spec.c2pa.org/specifications/specifications/2.2/index.html
- International Fact-Checking Network: https://www.poynter.org/ifcn/

## License

This project is currently marked `UNLICENSED` in `package.json`. Add a license before accepting external contributions or reuse.

