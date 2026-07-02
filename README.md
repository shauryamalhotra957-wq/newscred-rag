# NewsCred RAG

NewsCred RAG is a working prototype for a news verification app. It checks source credentials, extracts checkable claims, retrieves relevant evidence with RAG, compares claims against that evidence, and returns an explainable verdict.

## Run

```powershell
npm.cmd start
```

Open `http://127.0.0.1:4273`.

## Test

```powershell
npm.cmd test
```

## What It Does

- Accepts headline, source URL, author/byline, publication date, and article body.
- Scores source credentials using a source registry plus metadata checks.
- Extracts checkable claims from the article.
- Retrieves evidence from a curated corpus using a RAG-style retriever.
- Produces a confidence score, verdict, evidence cards, credential warnings, and claim gaps.
- Documents exactly how the verdict was produced.

## RAG In This App

RAG means Retrieval-Augmented Generation. In this prototype, retrieval is implemented locally and deterministically:

1. The submitted article is sanitized.
2. Claims are extracted from the title and claim-like sentences.
3. Claims and article text are tokenized.
4. The evidence corpus is tokenized.
5. Each evidence document is scored by cosine similarity, topic hits, and document credibility.
6. The top evidence documents are returned to the verdict engine.
7. The verdict engine blends evidence strength with source credentials and risk signals.

In production, this same boundary can be upgraded with embeddings and an LLM:

- Store evidence documents in a vector database.
- Embed article claims and evidence chunks.
- Retrieve top-k evidence chunks.
- Give the LLM only the retrieved evidence plus a strict output schema.
- Preserve citations, scores, and retrieved document IDs in the final result.

## Important Limitation

This app does not magically prove truth. It produces an auditable verification assessment. Real deployment should connect live fact-check APIs, primary-source databases, publisher credentials, C2PA media provenance checks, and human editorial review.

## Research Grounding

- ClaimReview structured data: https://schema.org/ClaimReview
- Google Fact Check Tools API: https://developers.google.com/fact-check/tools/api
- W3C Verifiable Credentials: https://www.w3.org/TR/vc-data-model-2.0/
- C2PA specification: https://spec.c2pa.org/specifications/specifications/2.2/index.html
- International Fact-Checking Network: https://www.poynter.org/ifcn/
