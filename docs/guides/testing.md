# Testing Guide

## Before You Begin

| Item               | Value                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Estimated Time** | 15–45 minutes                                                                                                       |
| **Difficulty**     | Intermediate                                                                                                        |
| **Prerequisites**  | Local development environment, Node.js, project dependencies installed                                              |
| **Outcome**        | Understand the testing strategy, execute the test suite, and write new tests that follow the project's conventions. |

---

# Overview

Testing in JobScraper focuses on verifying business logic rather than framework behavior.

The project follows a layered testing strategy where each layer is tested according to its responsibilities.

Rather than relying exclusively on end-to-end tests, the majority of application behavior is verified through fast, isolated unit tests.

This approach provides:

* Fast feedback
* Reliable test execution
* Easier debugging
* Lower maintenance costs

---

# Testing Philosophy

JobScraper follows three principles.

## Test Business Logic

The most valuable tests verify application behavior.

Examples include:

* Search query generation
* Semantic deduplication
* Validation
* Description enrichment
* Authentication rules

Framework behavior is generally not retested.

---

## Test Layers Independently

Each architectural layer should be tested in isolation.

Controllers, services, SQL generation, and processing logic have different responsibilities and therefore require different testing approaches.

---

## Prefer Small Tests

Smaller tests:

* Execute faster
* Fail more predictably
* Are easier to maintain
* Simplify debugging

Most tests should validate one behavior at a time.

---

# Test Pyramid

JobScraper follows a practical testing pyramid.

```mermaid id="z1w1kk"
flowchart TD

End-to-End Tests

↓

Integration Tests

↓

Unit Tests
```

The majority of tests belong in the unit layer.

Integration tests verify component interaction.

End-to-end tests validate complete application flows.

---

# Test Structure

The test suite mirrors the application architecture.

Typical structure:

```text id="5vcszi"
tests/

controllers/

services/

integration/

helpers/
```

Keeping tests close to the architecture makes them easier to locate and maintain.

---

# Unit Tests

Unit tests verify a single component in isolation.

Examples include:

* Services
* Controllers
* SQL generation
* Utility functions

External dependencies should be mocked where appropriate.

---

# Service Tests

Services contain most of the application's business logic.

Consequently, they receive the highest level of test coverage.

Examples include:

* Job processing
* Search logic
* Validation
* Pagination
* Normalization

Because services are independent of HTTP, they can be tested without starting the server.

---

# Controller Tests

Controllers should remain thin.

Tests primarily verify:

* Request handling
* Response generation
* Status codes
* Delegation to services

Business rules should already be covered by service tests.

---

# SQL Tests

JobScraper intentionally tests SQL generation.

Examples include:

* Filtering
* Sorting
* Pagination
* WHERE clause generation
* ORDER BY generation

These tests ensure that dynamic query construction behaves predictably as new filters are introduced.

---

# Job Processor Tests

The Job Processor represents the core of the scraping pipeline.

Tests verify behavior such as:

* Required field validation
* Business rule enforcement
* Semantic deduplication
* Description validation
* Provider-specific handling

Because the processor coordinates multiple architectural components, it receives extensive unit testing.

---

# Integration Tests

Integration tests verify interactions between components.

Typical scenarios include:

* API endpoints
* Authentication flow
* Search requests
* Database interaction

These tests ensure that independently tested components work together correctly.

---

# End-to-End Tests

End-to-end tests verify complete user workflows.

Examples include:

* User authentication
* Searching jobs
* Saving jobs
* Viewing saved jobs

Because these tests are slower and more difficult to maintain, they are used selectively.

---

# Running the Test Suite

Execute all tests.

```bash id="40t2d5"
npm test
```

Watch mode:

```bash id="sax18z"
npm run test:watch
```

Coverage:

```bash id="v59mfw"
npm run test:coverage
```

Refer to `package.json` for the complete list of available test scripts.

---

# Writing a New Test

When adding a feature:

1. Identify the architectural layer.
2. Add the corresponding test.
3. Mock external dependencies where appropriate.
4. Verify one behavior per test.
5. Run the entire suite before committing.

Tests should follow the same organization as the production code.

---

# Mocking Strategy

Mock external systems.

Examples include:

* Database connections
* Redis
* Network requests
* Provider responses

Do **not** mock the behavior of the component under test.

The objective is to isolate the unit being verified.

---

# What Should Be Tested?

Examples include:

* Validation rules
* Query generation
* Processing logic
* Business rules
* Authentication behavior
* Error handling
* Edge cases

These areas contain the application's most valuable logic.

---

# What Should Not Be Tested?

Avoid testing:

* Framework internals
* Third-party libraries
* TypeScript itself
* Prisma internals
* Express routing implementation
* React rendering already covered by the framework

Focus on testing code owned by the project.

---

# Test Naming

Tests should describe observable behavior.

Prefer:

```text id="8km0jf"
returns newest jobs first

rejects duplicate listings

accepts valid provider output
```

Avoid names that describe implementation details.

Good test names read like specifications.

---

# Debugging Failing Tests

When a test fails:

1. Read the assertion.
2. Identify the affected layer.
3. Verify recent changes.
4. Execute the failing test independently.
5. Confirm expected behavior before modifying production code.

Avoid fixing multiple failures simultaneously.

---

# Continuous Testing

During development:

```text id="sjlwmh"
Write Code

↓

Write Test

↓

Run Test

↓

Fix

↓

Commit
```

Running tests frequently shortens the feedback loop and reduces debugging time.

---

# Best Practices

* Keep tests independent.
* Avoid shared mutable state.
* Test observable behavior.
* Prefer explicit assertions.
* Mock only external dependencies.
* Keep test setup simple.
* Update tests whenever business rules change.

---

# Common Mistakes

## Testing Multiple Behaviors

One test should verify one behavior.

Large tests are difficult to debug.

---

## Overusing Mocks

Excessive mocking can produce tests that pass while the application fails.

Mock only true external dependencies.

---

## Ignoring Edge Cases

Business rules often fail at boundaries.

Include tests for:

* Empty values
* Invalid input
* Duplicate data
* Missing fields
* Unexpected provider responses

---

## Testing Framework Code

Do not test Express, Prisma, Next.js, or Vitest.

Test your own business logic.

---

# Testing Workflow

A recommended workflow:

```text id="agq9mf"
Implement Feature

↓

Write Unit Test

↓

Run Tests

↓

Verify Integration

↓

Review Coverage

↓

Commit
```

This keeps testing aligned with the development process.

---

# Related Documentation

See also:

* Local Development Guide
* Debugging Scrapers
* Scraper Engine
* Job Processing Pipeline
* Monitoring & Observability
* API Reference
