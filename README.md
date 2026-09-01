# Support AI Copilot

Support AI Copilot is a web application for support teams. It helps classify incoming tickets, find relevant knowledge-base material, draft customer replies, and keep risky decisions under human review.

## What Is Inside

- `Triage` - classifies a ticket by category, priority, confidence, evidence, and automation eligibility.
- `Copilot` - prepares a ticket summary and reply variants using the knowledge base.
- `Knowledge Base` - shows seeded support documents and searchable cited chunks.
- `Audit Log` - shows AI runs and human review decisions.

The app can run with a local mock AI provider for free testing, or with a real Gemini/OpenAI API key.

## Requirements

- Node.js `>=24`
- pnpm `>=11`
- Docker Desktop, only if you want to run PostgreSQL/Redis locally

## Install

Windows PowerShell:

```powershell
pnpm install
Copy-Item .env.example .env
```

Linux/macOS:

```bash
pnpm install
cp .env.example .env
```

## Environment

Edit the root `.env` file.

### Free Local Mode

This mode does not call Gemini or OpenAI.

```env
AI_PROVIDER=mock
EMBEDDING_PROVIDER=hash
PERSISTENCE_PROVIDER=memory
NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS=false
```

### Gemini Mode

Use this if you have a Gemini API key.

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_CLASSIFICATION_MODEL=gemini-3.6-flash
EMBEDDING_PROVIDER=hash
PERSISTENCE_PROVIDER=memory
NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS=false
```

### OpenAI Mode

Use this if you have an OpenAI API key.

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_CLASSIFICATION_MODEL=gpt-4.1-mini
EMBEDDING_PROVIDER=hash
PERSISTENCE_PROVIDER=memory
NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS=false
```

`EMBEDDING_PROVIDER=hash` keeps knowledge search local and free. The AI provider is used for ticket classification and Copilot reply drafting.

## Run

Windows PowerShell and Linux/macOS:

```bash
pnpm dev
```

Open:

- Web UI: http://localhost:3000
- API health: http://localhost:4000/health

If you change `.env`, stop the dev server and run `pnpm dev` again.

## Run With PostgreSQL

For persistent local storage, set:

```env
PERSISTENCE_PROVIDER=prisma
```

Then start the database and apply migrations.

Windows PowerShell and Linux/macOS:

```bash
docker compose up -d postgres redis
pnpm db:generate
pnpm --filter @support/database exec prisma migrate deploy
pnpm dev
```

## How To Check The Product

1. Open `Triage`.
2. Paste a customer ticket.
3. Click `Classify Ticket`.
4. Review category, priority, confidence, evidence, and automation decision.
5. Click `Draft Reply in Copilot`.
6. Generate reply variants in `Copilot`.
7. Check the cited knowledge at the bottom of the Copilot result.
8. Use `Accept`, `Reject`, `Escalate`, or `Bad Output`.
9. Open `Audit Log` to see recorded AI and human-review events.

Example ticket:

```text
I was charged twice for my subscription and I want a refund immediately.
```

## Seeded Knowledge Base

The project includes five demo knowledge documents:

- `Subscription Cancellation Playbook`
- `Refund And Chargeback Policy`
- `Bug Report Intake`
- `Expert Complaint Escalation`
- `Account Access And Privacy Handling`

They are test data for retrieval and citations. In a real project, these would be replaced with real company support policies.

## Useful Commands

Run checks:

```bash
pnpm lint
pnpm test
pnpm build
```

Run evaluations:

```bash
pnpm eval
pnpm eval:classification
```

Open Prisma Studio:

```bash
pnpm db:studio
```

## Project Structure

- `apps/web` - Next.js UI
- `apps/api` - Fastify API
- `packages/domain` - support domain rules
- `packages/contracts` - shared Zod schemas
- `packages/ai` - AI providers, prompts, classifier and Copilot logic
- `packages/retrieval` - knowledge documents, chunks, embeddings, citations
- `packages/database` - Prisma schema, migrations, repositories
- `packages/audit` - audit events
- `packages/observability` - metrics and tracing helpers
