DROP INDEX IF EXISTS "knowledge_documents_organizationId_source_version_key";

CREATE UNIQUE INDEX "knowledge_documents_organizationId_source_version_title_key"
  ON "knowledge_documents"("organizationId", "source", "version", "title");
