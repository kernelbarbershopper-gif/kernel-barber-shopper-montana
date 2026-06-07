# Security policy

## Supported versions

Only the `main` branch is currently supported. Older tags are not maintained.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Email `security@kernel-beautysalonper.com` (or your contact of choice) with:

- A clear description of the issue
- Steps to reproduce
- The impact you believe it has

We aim to acknowledge within 48h and provide a fix timeline within 7 days for
high-severity issues.

## What we consider in scope

- Authentication / authorization bypass
- Secret leakage (API keys, tokens, credentials)
- SQL injection / RLS bypass
- Payment flow manipulation
- WebView / Android APK hardening issues

## Out of scope

- Volumetric DoS
- Self-XSS
- Issues requiring a malicious admin account
