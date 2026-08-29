"use client";

import { useMemo, useState } from "react";
import { classifyTicket } from "../lib/api-client.js";

const sampleTickets = [
  {
    label: "Refund",
    text: "I was charged twice for my subscription and I want a refund immediately."
  },
  {
    label: "Bug",
    text: "The expert chat crashes every time I upload a screenshot from my Android phone."
  },
  {
    label: "Mixed",
    text: "I cannot log in, my plan renewed today, and I also want my money back."
  }
];

const eligibilityLabels = {
  safe_to_suggest: "Safe to suggest",
  human_review_required: "Human review",
  automation_blocked: "Blocked"
};

const reviewReasonLabels = {
  low_confidence: "Low confidence",
  blocked_category: "Blocked category",
  policy_sensitive_category: "Policy-sensitive",
  urgent_priority: "Urgent",
  mixed_topics: "Mixed topics",
  unclear_intent: "Unclear intent",
  aggressive_tone: "Aggressive tone",
  legal_or_privacy_risk: "Legal or privacy risk",
  safety_risk: "Safety risk",
  financial_decision: "Financial decision",
  missing_knowledge_citation: "Missing citation"
};

function formatLabel(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function eligibilityClass(value) {
  return `status-pill status-${value.replaceAll("_", "-")}`;
}

export function TriageWorkspace() {
  const [subject, setSubject] = useState("");
  const [ticketText, setTicketText] = useState(sampleTickets[0].text);
  const [source, setSource] = useState("manual");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = ticketText.trim().length > 0 && !isSubmitting;
  const confidencePercent = useMemo(() => {
    if (!result) {
      return 0;
    }

    return Math.round(result.data.confidence * 100);
  }, [result]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await classifyTicket({
        subject: subject.trim() || undefined,
        text: ticketText,
        source
      });

      setResult(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Support AI Copilot</p>
          <h1>Ticket Triage</h1>
        </div>
        <div className="system-status">
          <span className="status-dot" />
          Mock AI provider
        </div>
      </header>

      <section className="triage-layout">
        <form className="panel ticket-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <p className="section-label">Incoming Ticket</p>
              <h2>Request Details</h2>
            </div>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="manual">Manual</option>
              <option value="api">API</option>
              <option value="webhook">Webhook</option>
              <option value="slack">Slack</option>
              <option value="crm">CRM</option>
            </select>
          </div>

          <label className="field">
            <span>Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Optional ticket subject"
            />
          </label>

          <label className="field field-large">
            <span>Ticket Text</span>
            <textarea
              value={ticketText}
              onChange={(event) => setTicketText(event.target.value)}
              placeholder="Paste customer message"
            />
          </label>

          <div className="sample-row">
            {sampleTickets.map((sample) => (
              <button
                className="sample-button"
                key={sample.label}
                type="button"
                onClick={() => setTicketText(sample.text)}
              >
                {sample.label}
              </button>
            ))}
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <button className="primary-button" disabled={!canSubmit} type="submit">
            {isSubmitting ? "Classifying" : "Classify Ticket"}
          </button>
        </form>

        <aside className="panel result-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Classification</p>
              <h2>Review</h2>
            </div>
            {result ? (
              <span className={eligibilityClass(result.data.automationEligibility)}>
                {eligibilityLabels[result.data.automationEligibility]}
              </span>
            ) : null}
          </div>

          {result ? (
            <div className="result-stack">
              <div className="metric-grid">
                <div className="metric">
                  <span>Category</span>
                  <strong>{formatLabel(result.data.category)}</strong>
                </div>
                <div className="metric">
                  <span>Priority</span>
                  <strong>{formatLabel(result.data.priority)}</strong>
                </div>
                <div className="metric">
                  <span>Confidence</span>
                  <strong>{confidencePercent}%</strong>
                </div>
              </div>

              <section className="result-block">
                <h3>Next Step</h3>
                <p>{result.data.recommendedNextStep}</p>
              </section>

              <section className="result-block">
                <h3>Rationale</h3>
                <p>{result.data.rationale}</p>
              </section>

              <section className="result-block">
                <h3>Review Reasons</h3>
                <div className="chip-row">
                  {result.data.reviewReasons.length > 0 ? (
                    result.data.reviewReasons.map((reason) => (
                      <span className="reason-chip" key={reason}>
                        {reviewReasonLabels[reason] ?? formatLabel(reason)}
                      </span>
                    ))
                  ) : (
                    <span className="reason-chip reason-chip-muted">None</span>
                  )}
                </div>
              </section>

              <section className="result-block">
                <h3>Evidence</h3>
                <div className="evidence-list">
                  {result.data.evidence.map((item) => (
                    <article className="evidence-item" key={`${item.quote}-${item.reason}`}>
                      <blockquote>{item.quote}</blockquote>
                      <p>{item.reason}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="empty-state">
              <h2>No Classification</h2>
              <p>No triage decision has been recorded for this session.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
