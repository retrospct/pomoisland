# Resolve contact-form delivery and privacy decisions

Status: needs-info

## Summary

Choose the product and operational details required before a contact form can be implemented safely.
The proposed scope and defaults are in `../PRD.md`.

## Decisions required

- Identify the mailbox and person responsible for responding.
- Choose a transactional email provider and verify the sending domain.
- Choose inline section, dialog, or dedicated page placement.
- Approve fields and topic choices.
- Define message/provider-log retention and approve the privacy copy.
- Select the server-side rate-limiting mechanism and initial threshold.
- Confirm the Vercel plan if custom analytics events are desired.

## Recommended defaults

- Keep GitHub Issues as **Support** and add a distinct **Contact** footer link.
- Use a dedicated `/contact` page so success/failure states are easy to navigate and test.
- Make name optional; require email, topic, and message.
- Deliver by transactional email without adding a database in version one.
- Use passive abuse controls first and add an interactive challenge only if needed.
- Track page views only at launch and keep all submitted values out of analytics.

## Exit criteria

- Every required decision has an owner and recorded answer.
- The recipient can receive provider test mail from the verified domain.
- Privacy and retention copy is approved.
- Issue 02 can be moved to `ready-for-agent` without the implementer inventing product policy.

## Comments
