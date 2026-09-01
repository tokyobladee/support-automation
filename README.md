# Support AI Copilot

Production-oriented AI support automation platform for ticket triage, internal knowledge retrieval, reply drafting, human review, and auditability.

The product is built as an operational support workspace, not a marketing demo. AI is kept behind replaceable provider adapters, every model output is validated with schemas, risky decisions are blocked or routed to humans, and AI runs expose evidence, confidence, citations, review state, and audit history.

## What Is Included

- Ticket triage for support requests from `manual`, `api`, `webhook`, `slack`, and `crm` sources.
- Domain categories for `subscription`, `bug`, `expert_complaint`, `refund_request`, `account_access`, `billing`, `product_guidance`, `mixed`, and `unknown`.
- Automation policy that blocks or flags low-confidence, financial, privacy, legal, account ownership, VIP, aggressive, mixed-topic, and policy-sensitive cases.
- Agent Copilot flow that classifies a ticket, retrieves relevant knowledge, drafts formal, empathetic, and concise reply variants, and requires citations for policy-sensitive claims.
- Knowledge Base with seeded demo policy/playbook documents, chunking, full-text search, vector search support, and citation assembly.
- Audit Log for AI runs and human decisions.
- Agent feedback capture for accepted, rejected, escalated, edited, and bad-output decisions.
- PostgreSQL persistence through Prisma, with `pgvector` for embeddings.
- Local fallback providers for free deterministic testing.
- OpenAI adapters for real classification, reply generation, and embeddings when API quota is available.

## Architecture

The repository uses a JavaScript ESM monorepo with Clean Architecture boundaries:

- `apps/api` - Fastify API, route composition, auth context, persistence wiring, observability wiring.
- `apps/web` - Next.js support operations UI.
- `packages/domain` - domain taxonomy, priorities, automation eligibility, review policy.
- `packages/contracts` - shared Zod schemas for API requests and responses.
- `packages/ai` - prompt builders, AI provider ports, OpenAI adapter, mock adapter, classification and copilot use cases.
- `packages/retrieval` - seeded knowledge documents, chunking, embeddings, hybrid retrieval, citation assembly.
- `packages/database` - Prisma schema, migrations, PostgreSQL repositories, pgvector index adapter.
- `packages/auth` - auth context and role permissions.
- `packages/audit` - audit event abstractions.
- `packages/observability` - metrics and tracing helpers.
- `packages/testing` - deterministic eval runner and fixtures.

Domain and use-case code do not depend on the UI, database, queues, or provider SDKs. External providers are selected through factories and ports such as ticket classifier and embedding provider adapters.

## Requirements

- Node.js `>=24`
- pnpm `>=11`
- Docker Desktop or compatible Docker engine

## Environment

Create a local `.env` from `.env.example`:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

The API and web app read the root `.env`.

For free local testing:

```env
NODE_ENV=development
PERSISTENCE_PROVIDER=prisma
AUTH_MODE=disabled
AI_PROVIDER=mock
EMBEDDING_PROVIDER=hash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS=false
DATABASE_URL=postgresql://support:support@localhost:5432/support_ai_copilot
REDIS_URL=redis://localhost:6379
```

For real OpenAI classification and reply generation, while keeping local embeddings:

```env
AI_PROVIDER=openai
EMBEDDING_PROVIDER=hash
OPENAI_API_KEY=...
OPENAI_CLASSIFICATION_MODEL=gpt-4.1-mini
```

For full OpenAI mode:

```env
AI_PROVIDER=openai
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_CLASSIFICATION_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

OpenAI API usage is billed separately from ChatGPT subscriptions. A ChatGPT Plus subscription does not automatically include API credits. If OpenAI returns `429`, the key is being rate-limited or has no available API quota.

## Run Locally

Install dependencies:

Windows PowerShell and Linux/macOS:

```bash
pnpm install
```

Start infrastructure:

Windows PowerShell and Linux/macOS:

```bash
docker compose up -d postgres redis
```

Generate Prisma client and apply migrations:

Windows PowerShell and Linux/macOS:

```bash
pnpm db:generate
pnpm --filter @support/database exec prisma migrate deploy
```

Run the API and web app:

Windows PowerShell and Linux/macOS:

```bash
pnpm dev
```

Open:

- Web UI: http://localhost:3000
- API health: http://localhost:4000/health

If you change `.env`, restart `pnpm dev` so the API process and Next.js client environment are rebuilt.

## How To Test The Product Flow

Use the Web UI:

1. Open `Triage`.
2. Paste a support request, for example:

   ```text
   I was charged twice for my subscription and I want a refund immediately.
   ```

3. Click `Classify Ticket`.
4. Confirm the result shows category, priority, confidence, evidence, review reasons, and automation eligibility.
5. Open `Knowledge Base`.
6. Search:

   ```text
   refund
   ```

7. Confirm `Refund And Chargeback Policy` appears in citations.
8. Open `Copilot`.
9. Paste the same ticket and click `Generate Drafts`.
10. Confirm the draft includes reply variants, citations, review reasons, and an automation decision.
11. Use `Accept`, `Reject`, `Escalate`, or `Bad Output`.
12. Open `Audit Log` and confirm AI run and human decision events are recorded.

In the expected refund flow, the system should classify the ticket as `refund_request`, mark it as high priority, block automation, and route the decision to a human because money movement requires review.

## Seeded Knowledge Base

The current knowledge base contains five generated demo documents:

- `Subscription Cancellation Playbook`
- `Refund And Chargeback Policy`
- `Bug Report Intake`
- `Expert Complaint Escalation`
- `Account Access And Privacy Handling`

These are fixtures for testing retrieval, citations, and automation boundaries. In a real deployment, they would be replaced or extended with the company's actual support policies, help-center articles, playbooks, and escalation rules.

## Verification Commands

Run all standard checks:

Windows PowerShell and Linux/macOS:

```bash
pnpm lint
pnpm schema:check
pnpm test
pnpm build
```

Run evals:

Windows PowerShell and Linux/macOS:

```bash
pnpm eval
pnpm eval:classification
```

Check database migration status:

Windows PowerShell and Linux/macOS:

```bash
pnpm --filter @support/database exec prisma migrate status
```

Open Prisma Studio:

Windows PowerShell and Linux/macOS:

```bash
pnpm db:studio
```

## Useful API Checks

Health:

Windows PowerShell:

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:4000/health
```

Linux/macOS:

```bash
curl http://localhost:4000/health
```

Classify a ticket:

Windows PowerShell:

```powershell
$body = @{
  subject = "Double charge refund"
  text = "I was charged twice for my subscription and I want a refund immediately."
  source = "manual"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/v1/classifications `
  -ContentType "application/json" `
  -Body $body
```

Linux/macOS:

```bash
curl -X POST http://localhost:4000/v1/classifications \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Double charge refund",
    "text": "I was charged twice for my subscription and I want a refund immediately.",
    "source": "manual"
  }'
```

Search knowledge:

Windows PowerShell:

```powershell
$body = @{
  query = "refund"
  topK = 5
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/v1/knowledge/search `
  -ContentType "application/json" `
  -Body $body
```

Linux/macOS:

```bash
curl -X POST http://localhost:4000/v1/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "refund",
    "topK": 5
  }'
```

Create a copilot draft:

Windows PowerShell:

```powershell
$body = @{
  subject = "Double charge refund"
  text = "I was charged twice for my subscription and I want a refund immediately."
  source = "manual"
  topK = 5
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/v1/copilot/drafts `
  -ContentType "application/json" `
  -Body $body
```

Linux/macOS:

```bash
curl -X POST http://localhost:4000/v1/copilot/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Double charge refund",
    "text": "I was charged twice for my subscription and I want a refund immediately.",
    "source": "manual",
    "topK": 5
  }'
```

## Production Notes

Production validation requires:

- `NODE_ENV=production`
- `PERSISTENCE_PROVIDER=prisma`
- `AUTH_MODE=headers`
- `AI_PROVIDER=openai`
- `EMBEDDING_PROVIDER=openai`
- `TRACING_PROVIDER=opentelemetry`
- `OPENAI_API_KEY` set

The local demo can run with `AUTH_MODE=disabled`, but production must use authenticated headers or a real auth integration.

## Current Limitations

- The seeded knowledge base is generated demo content, not real company policy.
- Real OpenAI execution requires API billing or credits and may fail with `429` when quota is unavailable.
- External CRM, Slack, webhook, and ticketing integrations are represented as source types and architecture boundaries, not live third-party connectors.
