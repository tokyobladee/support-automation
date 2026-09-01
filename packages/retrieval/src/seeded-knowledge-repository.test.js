import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KeywordKnowledgeRetriever } from "./keyword-knowledge-retriever.js";
import { buildSeededKnowledgeRepository } from "./seeded-knowledge-repository.js";

describe("seeded knowledge repository", () => {
  it("indexes seeded knowledge documents reproducibly", async () => {
    const firstRepository = await buildSeededKnowledgeRepository();
    const secondRepository = await buildSeededKnowledgeRepository();
    const firstDocuments = await firstRepository.listDocuments();
    const secondDocuments = await secondRepository.listDocuments();

    assert.equal(firstDocuments.length, 5);
    assert.deepEqual(
      firstDocuments.map((document) => document.contentHash),
      secondDocuments.map((document) => document.contentHash)
    );
    assert.deepEqual(
      firstDocuments.map((document) => document.id),
      secondDocuments.map((document) => document.id)
    );
  });

  it("retrieves citations for core support workflows", async () => {
    const repository = await buildSeededKnowledgeRepository();
    const retriever = new KeywordKnowledgeRetriever({ repository });
    const cases = [
      {
        query: "cancel subscription before renewal",
        expectedTitle: "Subscription Cancellation Playbook"
      },
      {
        query: "refund chargeback compensation",
        expectedTitle: "Refund And Chargeback Policy"
      },
      {
        query: "app crash upload screenshot android",
        expectedTitle: "Bug Report Intake"
      },
      {
        query: "expert rude wrong advice complaint",
        expectedTitle: "Expert Complaint Escalation"
      }
    ];

    for (const caseItem of cases) {
      const result = await retriever.search({
        query: caseItem.query,
        topK: 1
      });

      assert.equal(result.citations[0]?.title, caseItem.expectedTitle);
    }
  });
});
