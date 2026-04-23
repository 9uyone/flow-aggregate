# Copilot Instructions

## Project Guidelines
- Prefer avoiding ToLower().Contains(...) in data filters; use Mongo-level case-insensitive search (regex/collation/full-text) for better index usage and scalability.
- Prefer simplifying architecture: minimize duplication across the codebase (for example, avoid duplicated constructs like metricValueExpr) and reduce proxy endpoints in AnalyzeService where it does not harm clarity or functionality.

### Data Access & Caching
- Use a single compact cache-wrapper (e.g., CachedMongoRepository) to centralize caching, avoid scattered caching logic, and prevent code bloat.
- Implement caching in the repository layer only; avoid duplicating cache logic across services or controllers.
- Define a clear invalidation strategy (TTL and explicit invalidation) and a single source of truth for cache keys to keep the wrapper simple and maintainable.