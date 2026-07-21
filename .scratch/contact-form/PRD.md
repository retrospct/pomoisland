# Contact form for the landing site

## Status

Planning only. Do not implement until the decisions in issue 01 are resolved.

## Problem

The landing site currently sends people to GitHub Issues for support. That works for public bug
reports, but it does not provide a private, low-friction way to ask a question, share feedback, or
make a non-public inquiry.

## Goal

Add a small, trustworthy contact path that feels native to the landing page and delivers useful
messages without exposing credentials or turning the repository into a customer-support system.

## Non-goals

- Replacing GitHub Issues for public bugs and feature requests.
- Building a support inbox, CRM, ticket tracker, newsletter, or mailing list.
- Persisting submissions in a new database for the first version.
- Adding attachments, accounts, live chat, or marketing automation.

## Proposed experience

- Keep the existing **Support** link to GitHub Issues.
- Add a separate **Contact** entry in the footer.
- Open a compact contact section or dedicated page with:
  - name (optional),
  - email (required),
  - topic (required),
  - message (required),
  - a short privacy note.
- Preserve entered text when a recoverable submission error occurs.
- Show clear sending, success, validation-error, and service-error states.
- Make keyboard, screen-reader, reduced-motion, and mobile behavior first-class acceptance criteria.

## Technical direction

- Submit JSON over `POST` to a Vercel Function at `/api/contact`.
- Reject other methods and unexpected content types.
- Validate and normalize every field on the server with conservative length limits.
- Deliver through a transactional email provider; keep provider credentials in Vercel environment
  variables and never expose them to client code.
- Start without database storage. Provider delivery logs should contain the minimum useful data and
  follow an explicit retention policy.
- Return stable, non-sensitive error codes to the browser; do not return provider errors or secrets.

## Abuse and privacy baseline

- Use a hidden honeypot and a minimum time-to-submit check.
- Add server-side rate limiting before launch; rate-limit failures should be generic.
- Evaluate a challenge only if passive controls are insufficient.
- Escape or safely encode submitted content before placing it in HTML email.
- Do not log message bodies, email addresses, tokens, or raw provider responses.
- Publish who receives submissions, why the data is collected, and how long it is retained.
- Never send names, email addresses, message text, or other form values to Web Analytics.

## Analytics

- Vercel Web Analytics page views are sufficient for the first release.
- If the Vercel plan later supports custom events, a submission-success event may be added without
  form values or other personal data.
- Submission counts and delivery failures should come from server/provider operational metrics, not
  client-side analytics alone.

## Success criteria

- A legitimate visitor can send a message from desktop or mobile and receives an unambiguous result.
- Invalid and oversized requests are rejected server-side.
- Secrets and personal form values do not appear in the client bundle, analytics, or application logs.
- Basic automated spam is rejected or throttled without making the default experience hostile.
- GitHub Issues remains clearly available for public support and bug reports.
- The production function and email delivery path have an owner and a documented failure check.

## Rollout

1. Resolve the product, delivery, privacy, and abuse decisions in issue 01.
2. Build and visually review the form and all client states.
3. Implement and test the Vercel Function and email delivery in Preview.
4. Exercise validation, rate limiting, redaction, accessibility, and failure paths.
5. Add production secrets, deploy, submit a real test, and verify receipt and logs.

## Open decisions

- Contact destination and accountable owner.
- Transactional email provider and verified sending domain.
- Inline section, dialog, or dedicated `/contact` page.
- Topic choices and whether name should remain optional.
- Retention period and privacy-copy owner.
- Rate-limiting mechanism and threshold.
- Whether the deployed Vercel plan supports custom analytics events.
