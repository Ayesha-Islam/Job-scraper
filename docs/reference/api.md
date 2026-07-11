# REST API Reference

## Overview

This document describes the public REST API exposed by the JobScraper backend.

The API provides endpoints for:

* Searching jobs
* Retrieving job details
* Authentication
* Saved jobs
* Application health
* Statistics
* Administrative operations

All responses are encoded as JSON.

---

# Base URL

Local development:

```text
http://localhost:3001/api/v1
```

Production deployments may expose a different base URL.

---

# API Versioning

Current version:

```text
v1
```

All endpoints are versioned to allow future API evolution without breaking existing clients.

---

# Content Type

Requests:

```http
Content-Type: application/json
```

Responses:

```http
Content-Type: application/json
```

---

# Authentication

Most endpoints are public.

Authentication is required only for user-specific operations.

Examples include:

* Saving jobs
* Viewing saved jobs
* Account operations

See:

```text
docs/architecture/authentication.md
```

---

# Pagination

Collection endpoints return paginated results.

Typical parameters:

| Parameter | Type    | Description    |
| --------- | ------- | -------------- |
| page      | integer | Current page   |
| limit     | integer | Items per page |

Typical response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1420,
    "totalPages": 71
  }
}
```

---

# Sorting

Supported sort options depend on the endpoint.

Typical examples:

| Value  | Description      |
| ------ | ---------------- |
| newest | Most recent jobs |
| oldest | Oldest jobs      |

---

# Filtering

Job search supports optional filtering.

Examples include:

* Source
* Location
* Employment Type
* Keywords

Multiple filters may be combined within a single request.

---

# Error Format

Errors follow a consistent JSON structure.

Example:

```json
{
  "success": false,
  "error": {
    "message": "Resource not found"
  }
}
```

---

# HTTP Status Codes

| Code | Meaning               |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Invalid request       |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Resource not found    |
| 409  | Conflict              |
| 500  | Internal server error |

---

# Endpoints

---

# Health

## GET /health

Returns application health information.

### Authentication

Not required.

### Response

```json
{
  "status": "healthy"
}
```

---

# Jobs

## GET /jobs

Returns a paginated collection of jobs.

### Authentication

Not required.

### Query Parameters

| Parameter | Required | Description      |
| --------- | -------- | ---------------- |
| page      | No       | Page number      |
| limit     | No       | Results per page |
| search    | No       | Search keyword   |
| source    | No       | Job provider     |
| location  | No       | Job location     |
| type      | No       | Employment type  |
| sort      | No       | Sort order       |

### Example

```http
GET /api/v1/jobs?page=1&limit=20
```

### Successful Response

```json
{
  "data": [
    {
      "id": "...",
      "company": "Example",
      "position": "Backend Engineer",
      "location": "Remote",
      "source": "RemoteOK"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 412
  }
}
```

---

## GET /jobs/:id

Returns a single job.

### Authentication

Not required.

### Path Parameters

| Parameter | Description    |
| --------- | -------------- |
| id        | Job identifier |

### Example

```http
GET /api/v1/jobs/123
```

---

# Saved Jobs

## GET /saved-jobs

Returns jobs saved by the authenticated user.

### Authentication

Required.

---

## POST /saved-jobs

Saves a job.

### Authentication

Required.

### Request

```json
{
  "jobId": "..."
}
```

---

## DELETE /saved-jobs/:id

Removes a saved job.

### Authentication

Required.

---

# Authentication

## POST /auth/login

Authenticates a user.

### Authentication

Not required.

---

## POST /auth/logout

Ends the current session.

### Authentication

Required.

---

## GET /auth/session

Returns the current authentication session.

### Authentication

Required.

---

# Statistics

## GET /stats

Returns application statistics.

Examples include:

* Total jobs
* Provider distribution
* Scraping statistics

Authentication requirements depend on application configuration.

---

# Administration

Administrative endpoints are intended for maintenance and operational tasks.

Authentication is required.

Refer to the backend implementation for the complete list of available operations.

---

# Response Conventions

Successful responses:

```json
{
  "success": true,
  "data": {}
}
```

Error responses:

```json
{
  "success": false,
  "error": {}
}
```

Maintaining a consistent response format simplifies frontend integration.

---

# Rate Limiting

The current implementation does not enforce API rate limiting.

If rate limiting is introduced in future versions, this document will be updated accordingly.

---

# CORS

Cross-Origin Resource Sharing (CORS) is configured within the backend.

Frontend requests should originate from approved origins.

See backend configuration for implementation details.

---

# API Stability

Public endpoints are considered part of the project's API contract.

Breaking changes should only occur through a new API version.

---

# Related Documentation

Additional information:

* Architecture Overview
* Authentication Architecture
* Search System
* Local Development Guide
* Environment Variables Reference
* Database Schema Reference
