## Jira ticket

<!-- Required. Put the key in the PR title too, e.g. "MKT-123 Add order history". -->

- Ticket: [MKT-000](https://your-org.atlassian.net/browse/MKT-000)

## What changed

<!-- A short summary of the change and why it is needed. -->

## Target branch

- [ ] `dev` — feature work
- [ ] `demo` — promoting from `dev` for stakeholder review
- [ ] `production` — promoting from `demo` for release

## Checklist

- [ ] Jira ticket linked above and referenced in the PR title
- [ ] `npm run lint`, `npm test` and `npm run build` pass for every workspace I touched
- [ ] Database changes ship as a new migration in `backend/supabase/migrations/`
- [ ] No secrets, keys or `.env` files are committed
- [ ] Environment variable changes are reflected in `.env.example` and in the infrastructure repo's ConfigMap/Secret keys

## Deployment notes

<!-- New env vars, migrations to run first, or anything the reviewer must do by hand. -->
