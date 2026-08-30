"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listKnowledgeChunks,
  listKnowledgeDocuments,
  searchKnowledge
} from "../lib/api-client.js";

function formatScore(value) {
  return `${Math.round(value * 100)}%`;
}

export function KnowledgeWorkspace() {
  const [documents, setDocuments] = useState([]);
  const [chunks, setChunks] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [query, setQuery] = useState("refund chargeback human review");
  const [citations, setCitations] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId),
    [documents, selectedDocumentId]
  );

  useEffect(() => {
    let isActive = true;

    async function loadKnowledgeBase() {
      setIsLoading(true);
      setError(null);

      try {
        const [documentResponse, chunkResponse] = await Promise.all([
          listKnowledgeDocuments(),
          listKnowledgeChunks()
        ]);

        if (!isActive) {
          return;
        }

        setDocuments(documentResponse.data);
        setChunks(chunkResponse.data);
        setSelectedDocumentId(documentResponse.data[0]?.id ?? "");
      } catch (requestError) {
        if (isActive) {
          setError(requestError.message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadKnowledgeBase();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setIsSearching(true);
    setError(null);

    try {
      const response = await searchKnowledge({
        query,
        topK: 5
      });

      setCitations(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSearching(false);
    }
  }

  const visibleChunks = selectedDocumentId
    ? chunks.filter((chunk) => chunk.documentId === selectedDocumentId)
    : chunks;

  return (
    <section className="knowledge-layout">
      <aside className="panel knowledge-list-panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Knowledge Base</p>
            <h2>Seeded Sources</h2>
          </div>
          <span className="count-badge">{documents.length}</span>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="document-list" aria-busy={isLoading}>
          {documents.map((document) => (
            <button
              className="document-row"
              data-selected={document.id === selectedDocumentId}
              key={document.id}
              type="button"
              onClick={() => setSelectedDocumentId(document.id)}
            >
              <strong>{document.title}</strong>
              <span>{document.source}</span>
              <div>
                <small>{document.version}</small>
                <small>{document.chunkCount} chunks</small>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="panel knowledge-detail-panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Source Detail</p>
            <h2>{selectedDocument?.title ?? "Loading"}</h2>
          </div>
          {selectedDocument ? <span className="status-pill status-safe-to-suggest">{selectedDocument.visibility}</span> : null}
        </div>

        {selectedDocument ? (
          <div className="knowledge-meta-grid">
            <div className="metric">
              <span>Source</span>
              <strong>{selectedDocument.source}</strong>
            </div>
            <div className="metric">
              <span>Language</span>
              <strong>{selectedDocument.language}</strong>
            </div>
            <div className="metric">
              <span>Tags</span>
              <strong>{selectedDocument.tags.join(", ")}</strong>
            </div>
          </div>
        ) : null}

        <form className="knowledge-search" onSubmit={handleSearch}>
          <label className="field">
            <span>Search Query</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search policy, playbooks, escalation rules"
            />
          </label>
          <button className="primary-button" disabled={!query.trim() || isSearching} type="submit">
            {isSearching ? "Searching" : "Search Knowledge"}
          </button>
        </form>

        <div className="knowledge-columns">
          <section className="result-block">
            <h3>Chunks</h3>
            <div className="chunk-list">
              {visibleChunks.map((chunk) => (
                <article className="chunk-item" key={chunk.id}>
                  <div>
                    <strong>#{chunk.position + 1}</strong>
                    <span>{chunk.tokenCount} tokens</span>
                  </div>
                  <p>{chunk.content}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="result-block">
            <h3>Citations</h3>
            <div className="citation-list">
              {citations.length > 0 ? (
                citations.map((citation) => (
                  <article className="citation-item" key={citation.chunkId}>
                    <div>
                      <strong>{citation.title}</strong>
                      <span>{formatScore(citation.relevanceScore)}</span>
                    </div>
                    <blockquote>{citation.quote}</blockquote>
                  </article>
                ))
              ) : (
                <div className="empty-inline">Run a search to inspect cited chunks.</div>
              )}
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}
