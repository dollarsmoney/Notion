# Marketplace

A marketplace where vendors list products and buyers order and pay for them
through Paystack. Next.js frontend, Express API, Supabase for Postgres, Auth and
Storage.

This is the **application repository**. The Kubernetes configuration lives in a
separate infrastructure repository — see [Deployment](#deployment).

---

## Architecture

```
Browser (Next.js)
  │
  ├── supabase-js ──── register / login / logout ─────► Supabase Auth
  │                    role ("user" or "vendor") is set at sign-up
  │   ◄── session JWT
  │
  ├── Authorization: Bearer <jwt> ───────────────────► Express API
  │                                                     verifies the JWT, loads
  │                                                     the profile, enforces role
  │                                                     writes with the service-role key
  │
  └── image upload ──────────────────────────────────► Supabase Storage
                                                        (product-images bucket)

Express API ◄──────── initialize / verify ───────────► Paystack
```

The browser never talks to Paystack's API directly and never sees the service
role key. Product prices, order totals and payment status are all decided
server-side.

### Payment flow

An order is only marked `paid` after Paystack confirms the charge.

1. `POST /api/orders` — the client sends product ids and quantities only. The
   API reads prices and stock from the database, creates the order as `pending`
   and snapshots the unit price on each order item.
2. `POST /api/payments/initialize` — creates a Paystack transaction, stores a
   `payments` row with the reference, returns the `authorization_url`.
3. The browser is redirected to Paystack, then back to `/payment/callback?reference=…`.
4. `GET /api/payments/verify/:reference` — calls Paystack's verify endpoint. The
   order flips to `paid` only when the transaction status is `success` **and**
   the charged amount and currency match the order. Stock is drawn down in the
   same database transaction.
5. `POST /api/payments/webhook` — Paystack's server-to-server notification,
   authenticated with an HMAC-SHA512 signature over the raw request body. It
   calls the same finalize routine, so a buyer who closes the tab still gets a
   correctly settled order.

Steps 4 and 5 share one idempotent function, so running both is safe.

---

## Project layout

```
marketplace/
├── backend/                Express + TypeScript API
│   ├── src/
│   │   ├── middleware/     JWT auth, role guards, error handling
│   │   ├── routes/         products, orders, payments, health
│   │   ├── services/       order logic, Paystack client
│   │   └── config/env.ts   validated environment variables
│   ├── supabase/migrations/  SQL schema, RLS policies, storage bucket
│   └── tests/              vitest + supertest
├── frontend/               Next.js App Router + Tailwind
│   ├── src/app/            pages and route handlers
│   ├── src/components/     AuthProvider, product form, shared UI
│   └── src/lib/            runtime config, supabase client, API client
├── docker-compose.yml
├── .env.example
└── .github/workflows/ci.yml
```

---

## Getting started

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then run the
migrations in order from the SQL editor:

1. `backend/supabase/migrations/0001_init.sql` — schema, triggers, RLS policies
2. `backend/supabase/migrations/0002_storage.sql` — public `product-images` bucket and its policies
3. `backend/supabase/migrations/0003_settle_late_payments.sql` — lets a late Paystack success settle an order that was already recorded as failed

Then, under **Authentication → Providers**, ensure Email is enabled. For local
development it is convenient to turn **Confirm email** off so sign-ups log in
immediately.

Collect these from **Project Settings → API**:

| Value | Used by | Safe in the browser? |
| --- | --- | --- |
| Project URL | both | yes |
| anon / publishable key | both | yes |
| service_role key | backend only | **no** |

### 2. Paystack

Create an account at [paystack.com](https://paystack.com) and copy the **test**
keys from **Settings → API Keys & Webhooks**. Only the secret key is needed by
the backend.

To exercise the webhook, set the webhook URL to
`https://<your-api-host>/api/payments/webhook`. Locally you can point it at an
ngrok tunnel, or simply rely on the callback verification.

### 3. Environment variables

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Fill in the real values. `.env` files are gitignored — never commit them.

| Variable | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | backend, frontend | Project URL |
| `SUPABASE_ANON_KEY` | backend, frontend | Validates user JWTs / browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Privileged writes that bypass RLS |
| `PAYSTACK_SECRET_KEY` | backend | Transaction initialize, verify, webhook signature |
| `PAYSTACK_PUBLIC_KEY` | — | Not needed by this redirect-based flow |
| `NEXT_PUBLIC_API_URL` | frontend | Browser-facing API origin |
| `FRONTEND_URL` | backend | Paystack callback target |
| `CORS_ORIGINS` | backend | Comma-separated allowed origins |

### 4. Run it

With Docker:

```bash
docker compose up --build
```

Or directly — run each from its own workspace directory, since the backend reads
`.env` relative to the working directory:

```bash
cd backend  && npm ci && npm run dev    # http://localhost:4000
cd frontend && npm ci && npm run dev    # http://localhost:3000
```

`npm run dev` and `npm start` load `backend/.env` through Node's
`--env-file-if-exists` flag. In Docker and Kubernetes there is no `.env` file, so
the flag does nothing and the container's environment is used instead. The
backend refuses to start if a required variable is missing, and names which one.

Register one account as a **vendor** and another as a **user**, create an active
listing with stock, then buy it with a
[Paystack test card](https://paystack.com/docs/payments/test-payments/).

---

## Runtime configuration in the frontend

`NEXT_PUBLIC_*` variables are normally inlined at build time, which would force a
separate image per environment. Instead, `/api/config` reads the values from
`process.env` on each request and the browser fetches them once at boot
(`src/lib/config.ts`). The same image therefore runs unchanged in dev, demo and
production — only the ConfigMap differs.

---

## API

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/products` | public, supports `search`, `page`, `limit` |
| `GET` | `/api/products/:id` | public, active listings only |
| `GET` | `/api/products/mine` | vendor |
| `POST` | `/api/products` | vendor |
| `PATCH` | `/api/products/:id` | vendor, own listing |
| `DELETE` | `/api/products/:id` | vendor, own listing |
| `POST` | `/api/orders` | authenticated |
| `GET` | `/api/orders` | authenticated, own orders |
| `GET` | `/api/orders/:id` | authenticated, own order |
| `POST` | `/api/payments/initialize` | authenticated, own order |
| `GET` | `/api/payments/verify/:reference` | authenticated, own order |
| `POST` | `/api/payments/webhook` | Paystack signature |
| `GET` | `/healthz`, `/readyz` | public, used by Kubernetes probes |

---

## Database

Five tables: `profiles`, `products`, `orders`, `order_items`, `payments`.

- A trigger on `auth.users` creates the matching `profiles` row and copies the
  role chosen at sign-up. A second trigger stops users changing their own role.
- Row Level Security is on for every table. Anonymous visitors can read only
  `products` with `status = 'active'`; vendors manage their own listings; buyers
  read their own orders and payments; vendors additionally see the order items
  for products they sold.
- `orders`, `order_items` and `payments` have no client-facing insert or update
  policies at all — only the backend's service-role key writes them.
- `mark_order_paid(uuid)` flips `pending → paid` and decrements stock atomically,
  returning `false` if the order was already settled.

---

## Testing

```bash
cd backend  && npm run lint && npm run typecheck && npm test && npm run build
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

The backend suite covers the parts that protect money: rejecting unauthenticated
and non-vendor requests, pricing orders from the database rather than the
request body, refusing to overshoot stock, and refusing to mark an order paid
when Paystack reports anything other than a matching successful charge.

---

## Branches and pull requests

```
feature branch → dev → demo → production
```

| Branch | Deploys to | Gate |
| --- | --- | --- |
| `dev` | dev cluster | CI green, one review |
| `demo` | demo cluster | CI green, review, environment approval |
| `production` | production cluster | CI green, review, environment approval |

Every pull request must reference a Jira ticket — put the key in the PR title
(`MKT-123 Add order history`) and link it in the body. The PR template asks for
both.

Recommended branch protection on all three branches: require the `quality`
checks to pass, require at least one approving review, require branches to be up
to date, and disallow direct pushes.

---

## Deployment

CI builds images and pushes them to GHCR. **GHCR only stores images — it does
not deploy anything.** The infrastructure repository holds the desired
Kubernetes state, and its own workflow performs the Helm release.

```
Developer
   │  PR (Jira ticket)
   ▼
Application repo  (this repo)
   │  GitHub Actions: install → lint → typecheck → test → build
   ▼
Docker build (multi-stage)
   │
   ▼
GHCR   ghcr.io/dollarsmoney/notion-backend:sha-abc1234      ← stores the image
       ghcr.io/dollarsmoney/notion-frontend:sha-abc1234
   │
   ▼
bump-infra job: writes that tag into the infrastructure repo
       helm/marketplace/values-<env>.yaml  →  image.tag: sha-abc1234
   │
   ▼
Infrastructure repo CI/CD
   │  path filter on values-<env>.yaml, GitHub Environment approval
   ▼
helm upgrade --install
   │
   ▼
Dev / Demo / Production Kubernetes cluster  ← pulls the image from GHCR
```

The branch determines the environment: `dev` → `values-dev.yaml`, `demo` →
`values-demo.yaml`, `production` → `values-production.yaml`. Because the tag is
the commit SHA, the file in the infrastructure repo always records exactly which
build is running in each cluster.

### Repository secrets and variables

Set these in **Settings → Secrets and variables → Actions**:

| Name | Type | Purpose |
| --- | --- | --- |
| `INFRA_REPO_TOKEN` | secret | Fine-grained PAT with `contents: write` on the infrastructure repo |
| `INFRA_REPOSITORY` | variable | e.g. `dollarsmoney/InfraRepo` |

`GITHUB_TOKEN` is provided automatically and is what pushes to GHCR.

The first push creates the packages as private. Under the repository's Packages
settings, either make them public or grant the infrastructure repo's pull token
read access, so the clusters can pull them.
