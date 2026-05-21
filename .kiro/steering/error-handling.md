---
inclusion: always
---


# Error Handling Standards

## Exception Handling
- Wrap risky code in try/catch blocks always
- Catch specific exceptions, not just generic errors
- Never silently swallow exceptions

## Error Messages
- Must be human-readable and actionable
- Include: source of error, what went wrong, what to do next
- Keep formatting and language consistent across the app

## Logging
- Every log entry must include: timestamp, severity level, 
  source, contextual data
- Use levels correctly:
  - debug   → local dev only
  - info    → normal operations
  - warning → something unexpected but non-breaking
  - error   → something broke, needs attention