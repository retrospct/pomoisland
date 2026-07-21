# Implement the landing-site contact form

Status: needs-info

## Summary

Build the contact experience described in `../PRD.md` after issue 01 records the remaining product,
delivery, privacy, and abuse decisions.

## Scope

- Add the approved contact entry point and responsive form UI.
- Implement accessible client validation and sending/success/error states.
- Add a `POST /api/contact` Vercel Function with authoritative server validation.
- Add the approved transactional email integration using Vercel environment variables.
- Add passive spam controls and the approved server-side rate limit.
- Add privacy copy and preserve the existing GitHub Issues support route.
- Keep all submitted values out of Web Analytics and application logs.

## Acceptance criteria

- All PRD success criteria pass in a Vercel Preview deployment.
- Empty, malformed, oversized, wrong-method, and wrong-content-type requests are rejected.
- Duplicate/rapid requests are throttled according to the approved policy.
- Provider failures produce a safe user-facing error and do not leak implementation details.
- Keyboard, screen-reader, reduced-motion, desktop, and mobile checks pass.
- A real Preview submission reaches the approved mailbox before production deployment.
- Setup, environment variables, local testing, and operational ownership are documented.

## Blocked by

- Issue 01: Resolve contact-form delivery and privacy decisions.

## Comments
