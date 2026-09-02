name: Bug Report
description: Report an issue with NewsCred RAG retrieval or credential scoring
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: Thank you for helping improve NewsCred RAG!
  - type: textarea
    id: bug-description
    attributes:
      label: Bug Description
      description: Detailed summary of what went wrong.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
    validations:
      required: true
