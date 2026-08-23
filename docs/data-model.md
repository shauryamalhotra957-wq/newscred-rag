# Data Model

## Article input

An article contains a title, source URL, optional author, optional publication date, and body text. Input is normalized and length-limited before retrieval.

## Evidence document

Evidence corpus entries provide an `id`, title, source, source URL, summary, credibility score, topics, and optional claims. Retrieval returns the top scored documents without mutating the corpus.

## Verification result

A result includes a bounded 0–100 score, a verdict band, credential assessment, extracted claims, evidence cards, claim support/gaps, risk warnings, and method limitations.
