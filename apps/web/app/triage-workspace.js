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
  human_review_required: "Human review required",
  automation_blocked: "Automation blocked"
};

const eligibilitySummaries = {
  safe_to_suggest:
    "AI output may be used as an agent suggestion. A human still reviews the final customer response.",
  human_review_required:
    "AI can assist, but an agent must review the context and make the next operational decision.",
  automation_blocked:
    "Automation must stop here. Route this case to a human owner before any policy or account action."
};

const eligibilityActions = {
  safe_to_suggest: "Use the recommendation as a draft and confirm before sending.",
  human_review_required: "Review the flagged reasons, inspect the ticket context, then accept or escalate.",
  automation_blocked: "Escalate to the responsible support queue and do not perform automated actions."
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

function hasReviewReasons(result) {
  return result.data.reviewReasons.length > 0;
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

            <section className="result-block review-decision">
              <div className="decision-header">
                <div>
                  <h3>Automation Decision</h3>
                  <p>{eligibilitySummaries[result.data.automationEligibility]}</p>
                </div>
                <span className={eligibilityClass(result.data.automationEligibility)}>
                  {eligibilityLabels[result.data.automationEligibility]}
                </span>
              </div>

              <div className="decision-action">
                <span>Agent action</span>
                <strong>{eligibilityActions[result.data.automationEligibility]}</strong>
              </div>

              <div className="reason-list" data-empty={!hasReviewReasons(result)}>
                {hasReviewReasons(result) ? (
                  result.data.reviewReasons.map((reason) => (
                    <div className="reason-item" key={reason}>
                      <strong>{reviewReasonLabels[reason] ?? formatLabel(reason)}</strong>
                      <span>{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="reason-item reason-item-muted">
                    <strong>No review flags</strong>
                    <span>safe_to_suggest</span>
                  </div>
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
  );
}
