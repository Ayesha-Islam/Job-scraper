# Engineering note: Description quality is an acceptance problem

## The weak assumption

The first version of the pipeline treated any extracted text as a description.
That made extraction look successful even when the stored value was a navigation
shell, login wall, anti-bot page, generic company copy, or a very short teaser.
Character count alone could not distinguish useful role content from a long page
wrapper.

## What the evidence showed

The failure signatures were source-specific:

- LinkedIn could return “join or sign in” content instead of a role;
- RemoteHub pages could expose navigation and marketplace wrapper text;
- infrastructure and rate-limit pages could be long enough to pass a naive
  threshold;
- an enrichment request could be worse than the usable listing description it
  was meant to replace.

Those signatures are encoded and tested in
`api/src/services/job.processor.ts`, including authentication-wall, navigation,
Cloudflare, keyword, word-count, and source-policy checks.

## The change

Description handling became a selection process:

1. clean HTML and normalize whitespace;
2. reject known page-shell and infrastructure signals;
3. require enough words and job-related signals;
4. apply provider-specific enrichment rules;
5. compare an enrichment candidate with the current description;
6. preserve the current text when the candidate is not clearly better.

Structured JSON-LD and focused description selectors are preferred over whole
page text. LinkedIn receives an additional fallback candidate search because its
public page shapes vary.

## Why this is stronger

The metric is no longer “a selector returned text.” The useful question is
whether the text is acceptable as job content. That moves quality enforcement
from fragile selectors into a shared, testable boundary while still allowing
source-specific evidence.

## Verification

Tests cover:

- empty and short descriptions;
- navigation and authentication-wall text;
- provider wrappers;
- preservation of a usable description after failed enrichment;
- acceptance of a stronger enrichment candidate;
- cleanup and extraction-method metrics.

Run:

```bash
cd api
npm test
```

Repository evidence:

- [`e9ec743`: remove description noise and handle missing content](https://github.com/Ayesha-Islam/Job-scraper/commit/e9ec74380f8e3f0bbad07f6c6e0e4ab3228976ef)
- [`99b6567`: centralize enrichment and validation](https://github.com/Ayesha-Islam/Job-scraper/commit/99b6567776cfa3a640f18c479bac1bbdb95fe68f)
- [`cbc8e6f`: harden source-specific extraction](https://github.com/Ayesha-Islam/Job-scraper/commit/cbc8e6f16d97612a2a03c90e5730ef77b7f41562)
- [Processor regression tests](https://github.com/Ayesha-Islam/Job-scraper/blob/main/api/tests/unit/job.processor.test.ts)

## Remaining limits

Heuristics can reject unusually written but valid roles or accept polished
generic text. English keyword checks do not generalize automatically to other
languages. Source behavior must still be sampled after markup changes.

The next useful production evidence would be a small labeled set of accepted and
rejected descriptions, allowing precision and recall to replace anecdotal
tuning.

## Related

- [Ingestion and data quality](../architecture/ingestion-and-data-quality.md)
- [Adding a provider](../guides/adding-a-provider.md)
- [Verification evidence](../evidence/verification.md)
