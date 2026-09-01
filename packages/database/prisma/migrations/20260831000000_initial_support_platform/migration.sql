-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'lead', 'agent');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('manual', 'api', 'webhook', 'slack', 'crm');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('new', 'triaged', 'in_review', 'escalated', 'resolved', 'archived');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('subscription', 'bug', 'expert_complaint', 'refund_request', 'account_access', 'billing', 'product_guidance', 'mixed', 'unknown');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "AutomationEligibility" AS ENUM ('safe_to_suggest', 'human_review_required', 'automation_blocked');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('openai', 'anthropic', 'mock');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('pending', 'succeeded', 'failed', 'invalid_output');

-- CreateEnum
CREATE TYPE "PromptPurpose" AS ENUM ('ticket_classification', 'ticket_summary', 'reply_generation', 'retrieval_query', 'evaluation');

-- CreateEnum
CREATE TYPE "HumanDecision" AS ENUM ('accepted', 'edited', 'rejected', 'escalated', 'marked_bad_output');

-- CreateEnum
CREATE TYPE "KnowledgeVisibility" AS ENUM ('internal', 'agent_only', 'public_safe');

-- CreateEnum
CREATE TYPE "EvalCaseType" AS ENUM ('classification', 'reply_generation', 'retrieval', 'automation_boundary');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'agent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "source" "TicketSource" NOT NULL DEFAULT 'manual',
    "status" "TicketStatus" NOT NULL DEFAULT 'new',
    "externalId" TEXT,
    "customerId" TEXT,
    "subject" TEXT,
    "text" TEXT NOT NULL,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classifications" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "automationEligibility" "AutomationEligibility" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "recommendedNextStep" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "reviewReasons" TEXT[],
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUri" TEXT,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "visibility" "KnowledgeVisibility" NOT NULL DEFAULT 'internal',
    "tags" TEXT[],
    "contentHash" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embedding" vector(1536),
    "searchText" tsvector,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purpose" "PromptPurpose" NOT NULL,
    "version" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "userId" TEXT,
    "promptVersionId" TEXT,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" "PromptPurpose" NOT NULL,
    "status" "AiRunStatus" NOT NULL,
    "inputMetadata" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "validationErrors" JSONB,
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classificationId" TEXT,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_variants" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "aiRunId" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_feedback" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "replyVariantId" TEXT,
    "decision" "HumanDecision" NOT NULL,
    "editedContent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_cases" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "EvalCaseType" NOT NULL,
    "name" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expectedOutput" JSONB NOT NULL,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eval_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" TEXT NOT NULL,
    "evalCaseId" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "score" DECIMAL(5,4),
    "output" JSONB NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT,
    "userId" TEXT,
    "aiRunId" TEXT,
    "type" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_organizationId_email_key" ON "users"("organizationId", "email");

-- CreateIndex
CREATE INDEX "tickets_organizationId_status_idx" ON "tickets"("organizationId", "status");

-- CreateIndex
CREATE INDEX "tickets_organizationId_customerId_idx" ON "tickets"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "tickets_assigneeId_idx" ON "tickets"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_organizationId_source_externalId_key" ON "tickets"("organizationId", "source", "externalId");

-- CreateIndex
CREATE INDEX "classifications_ticketId_idx" ON "classifications"("ticketId");

-- CreateIndex
CREATE INDEX "classifications_category_priority_idx" ON "classifications"("category", "priority");

-- CreateIndex
CREATE INDEX "classifications_automationEligibility_idx" ON "classifications"("automationEligibility");

-- CreateIndex
CREATE INDEX "knowledge_documents_organizationId_visibility_idx" ON "knowledge_documents"("organizationId", "visibility");

-- CreateIndex
CREATE INDEX "knowledge_documents_organizationId_language_idx" ON "knowledge_documents"("organizationId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_documents_organizationId_source_version_key" ON "knowledge_documents"("organizationId", "source", "version");

-- CreateIndex
CREATE INDEX "knowledge_chunks_documentId_idx" ON "knowledge_chunks"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_documentId_position_key" ON "knowledge_chunks"("documentId", "position");

-- CreateIndex
CREATE INDEX "knowledge_chunks_searchText_idx" ON "knowledge_chunks" USING GIN ("searchText");

-- CreateIndex
CREATE INDEX "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- CreateIndex
CREATE INDEX "knowledge_documents_tags_idx" ON "knowledge_documents" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "prompt_versions_organizationId_purpose_isActive_idx" ON "prompt_versions"("organizationId", "purpose", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_organizationId_purpose_version_key" ON "prompt_versions"("organizationId", "purpose", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ai_runs_classificationId_key" ON "ai_runs"("classificationId");

-- CreateIndex
CREATE INDEX "ai_runs_ticketId_idx" ON "ai_runs"("ticketId");

-- CreateIndex
CREATE INDEX "ai_runs_purpose_status_idx" ON "ai_runs"("purpose", "status");

-- CreateIndex
CREATE INDEX "ai_runs_createdAt_idx" ON "ai_runs"("createdAt");

-- CreateIndex
CREATE INDEX "reply_variants_ticketId_idx" ON "reply_variants"("ticketId");

-- CreateIndex
CREATE INDEX "reply_variants_aiRunId_idx" ON "reply_variants"("aiRunId");

-- CreateIndex
CREATE INDEX "agent_feedback_ticketId_idx" ON "agent_feedback"("ticketId");

-- CreateIndex
CREATE INDEX "agent_feedback_userId_idx" ON "agent_feedback"("userId");

-- CreateIndex
CREATE INDEX "agent_feedback_decision_idx" ON "agent_feedback"("decision");

-- CreateIndex
CREATE INDEX "eval_cases_organizationId_type_isActive_idx" ON "eval_cases"("organizationId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "eval_cases_organizationId_type_name_key" ON "eval_cases"("organizationId", "type", "name");

-- CreateIndex
CREATE INDEX "eval_runs_evalCaseId_idx" ON "eval_runs"("evalCaseId");

-- CreateIndex
CREATE INDEX "eval_runs_promptVersionId_idx" ON "eval_runs"("promptVersionId");

-- CreateIndex
CREATE INDEX "eval_runs_passed_idx" ON "eval_runs"("passed");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_type_idx" ON "audit_events"("organizationId", "type");

-- CreateIndex
CREATE INDEX "audit_events_ticketId_idx" ON "audit_events"("ticketId");

-- CreateIndex
CREATE INDEX "audit_events_aiRunId_idx" ON "audit_events"("aiRunId");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classifications" ADD CONSTRAINT "classifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_variants" ADD CONSTRAINT "reply_variants_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_variants" ADD CONSTRAINT "reply_variants_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "ai_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_replyVariantId_fkey" FOREIGN KEY ("replyVariantId") REFERENCES "reply_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_cases" ADD CONSTRAINT "eval_cases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_evalCaseId_fkey" FOREIGN KEY ("evalCaseId") REFERENCES "eval_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "ai_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
