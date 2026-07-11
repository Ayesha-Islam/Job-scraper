# Prisma Migrations Guide

## Before You Begin

| Item               | Value                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Estimated Time** | 10–30 minutes                                                                                                               |
| **Difficulty**     | Intermediate                                                                                                                |
| **Prerequisites**  | PostgreSQL running, Prisma installed, development environment configured                                                    |
| **Outcome**        | Safely modify the database schema, generate migrations, update the Prisma Client, and keep the project schema synchronized. |

---

# Overview

JobScraper uses Prisma Migrate to version-control database schema changes.

Every schema modification is tracked through migrations stored in the repository.

This provides:

* Reproducible database setup
* Version-controlled schema evolution
* Consistent environments
* Reliable onboarding
* Predictable deployments

Contributors should never modify the production database manually.

All structural changes must be introduced through Prisma migrations.

---

# Migration Workflow

The recommended workflow is:

```text id="yz3k7l"
Modify schema.prisma

↓

Create Migration

↓

Review SQL

↓

Apply Migration

↓

Generate Prisma Client

↓

Run Tests

↓

Commit
```

Following this sequence keeps the schema, generated client, and application code synchronized.

---

# Current Schema Location

The schema is located at:

```text id="7djlwm"
api/

prisma/

schema.prisma
```

All structural database changes begin here.

---

# When to Create a Migration

Create a migration whenever you:

* Add a table
* Remove a table
* Add a column
* Remove a column
* Rename a field
* Change relationships
* Add indexes
* Modify constraints

If the database structure changes, a migration should be created.

---

# When Not to Create a Migration

Do **not** create a migration for:

* Business logic changes
* SQL query modifications
* Service layer changes
* Controller changes
* Scraper updates
* Configuration changes

Only schema changes require migrations.

---

# Step 1 — Modify the Schema

Update:

```text id="mjlwm3"
schema.prisma
```

Examples include:

* Adding new models
* Updating fields
* Creating relationships
* Adding indexes
* Introducing unique constraints

Make one logical change at a time whenever possible.

---

# Step 2 — Create a Migration

Generate a migration.

```bash id="f8r81u"
npx prisma migrate dev --name <migration-name>
```

Example:

```bash id="frg6hr"
npx prisma migrate dev --name add_saved_jobs
```

Prisma will:

* Generate SQL
* Apply the migration
* Update migration history

---

# Step 3 — Review the Migration

A migration should never be treated as generated code that can be ignored.

Review:

* Table creation
* Index creation
* Foreign keys
* Constraints
* Column types

Confirm that the generated SQL matches the intended schema change.

---

# Step 4 — Generate the Prisma Client

Whenever the schema changes:

```bash id="fnkhm8"
npx prisma generate
```

This regenerates the type-safe Prisma Client used by the application.

Although `migrate dev` usually triggers generation automatically, running it explicitly ensures the client is synchronized.

---

# Step 5 — Verify the Database

Launch Prisma Studio.

```bash id="7sxijy"
npx prisma studio
```

Inspect:

* Tables
* Relationships
* New fields
* Constraints

Verify that the schema matches expectations before continuing.

---

# Step 6 — Update the Application

Schema changes often require updates to:

* Services
* Controllers
* Validation
* Tests
* API responses

Avoid committing migrations without updating affected application code.

---

# Step 7 — Run Tests

Execute the test suite.

```bash id="6om39o"
npm test
```

Schema modifications frequently affect:

* Service tests
* Controller tests
* Integration tests

Tests should pass before committing.

---

# Step 8 — Commit the Migration

Commit:

* Updated `schema.prisma`
* Migration directory
* Generated application changes

Do **not** omit migration files.

Without them, other developers cannot reproduce the schema.

---

# Applying Existing Migrations

To apply migrations already present in the repository:

```bash id="2z7wo5"
npx prisma migrate deploy
```

This command is intended for applying existing migration history.

It does not generate new migrations.

---

# Resetting the Development Database

When necessary:

```bash id="uluxyh"
npx prisma migrate reset
```

This command:

* Drops the database
* Recreates the schema
* Reapplies all migrations
* Regenerates the Prisma Client

Use only in development.

All existing data will be removed.

---

# Viewing Migration History

Migration history is stored in:

```text id="gvz5yv"
prisma/

migrations/
```

Each directory represents a single schema change.

Example:

```text id="jlwm7i"
20251214161302_jobs01

20251223121504_users

20260607191600_semantic_dedup
```

Avoid modifying existing migrations after they have been committed.

---

# Common Migration Scenarios

## Add a New Model

1. Update `schema.prisma`.
2. Generate a migration.
3. Review SQL.
4. Generate Prisma Client.
5. Update application code.
6. Run tests.

---

## Add a Column

Follow the same workflow.

Ensure:

* Existing records remain valid.
* Defaults are considered where appropriate.
* Application logic is updated.

---

## Rename a Field

Prisma may generate:

* Drop column
* Create column

Review the generated SQL carefully.

Renaming fields can unintentionally remove existing data if not handled correctly.

---

## Add an Index

Indexes improve query performance.

Examples include:

* Frequently filtered fields
* Sorting columns
* Composite unique constraints

Indexes should be introduced deliberately rather than preemptively.

---

# Common Mistakes

## Editing the Database Manually

Never modify the schema directly using SQL clients.

Changes must originate from `schema.prisma`.

---

## Forgetting Prisma Client Generation

Changing the schema without regenerating the client leads to outdated TypeScript types.

---

## Skipping Migration Review

Generated SQL should always be reviewed.

Migration generators are helpful but not infallible.

---

## Editing Existing Migration History

Committed migrations represent the project's database history.

Changing historical migrations can produce inconsistent environments.

Create a new migration instead.

---

## Combining Unrelated Changes

Prefer:

```text id="9ld0sk"
Add Saved Jobs
```

instead of:

```text id="k95vrz"
Random Fixes
```

Each migration should represent one logical schema change.

---

# Best Practices

* Keep migrations small.
* Review generated SQL.
* Commit migration directories.
* Regenerate the Prisma Client after schema changes.
* Run tests before committing.
* Never edit committed migration history.
* Use descriptive migration names.

---

# Troubleshooting

## Migration Fails

Verify:

* PostgreSQL is running.
* Environment variables are correct.
* Database credentials are valid.

---

## Prisma Client Errors

Run:

```bash id="m5rjlwm"
npx prisma generate
```

Outdated generated code is a common cause of Prisma errors.

---

## Schema Drift

If Prisma reports schema drift:

* Review migration history.
* Confirm no manual database modifications were made.
* Reset the development database if necessary.

---

## Missing Tables

Verify that migrations have been applied.

```bash id="hqxqku"
npx prisma migrate deploy
```

---

# Related Documentation

For additional information, see:

* Local Development Guide
* Docker Guide
* Database Design
* Database Schema Reference
* Testing Guide
* Engineering Decision: Prisma vs Raw SQL
