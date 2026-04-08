# Copilot Instructions

## Project Guidelines
- Prefer avoiding ToLower().Contains(...) in data filters; use Mongo-level case-insensitive search (regex/collation/full-text) for better index usage and scalability.