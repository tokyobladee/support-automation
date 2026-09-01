"use client";

import { useMemo, useState } from "react";
import { draftCopilotReply, submitAgentFeedback } from "../lib/api-client.js";
import { webEnv } from "../lib/env.js";

const sampleTickets = [
  {
    label: "Refund",
    text: "I was charged twice for my monthly plan and want a refund today."
  },
  {
    label: "Expert",
    text: "The expert was rude and gave advice that made my situation worse."
  },
  {
    label: "Bug",
    text: "The app crashes every time I upload a screenshot from Android."
  }
];

const showSampleTickets = webEnv.NEXT_PUBLIC_ENABLE_SAMPLE_TICKETS;

const actionLabels = {
  draft: "Draft",
  accepted: "Accepted",
  rejected: "Rejected",
  escalated: "Escalated",
  marked_bad_output: "Bad Output"
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

export function CopilotWorkspace() {
  const [subject, setSubject] = useState("");
  const [ticketText, setTicketText] = useState(sampleTickets[0].text);
  const [result, setResult] = useState(null);
  const [selectedTone, setSelectedTone] = useState("formal");
  const [editableReply, setEditableReply] = useState("");
  const [decision, setDecision] = useState("draft");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVariant = useMemo(() => {
    if (!result) {
      return null;
    }

    return (
      result.data.replyVariants.find((variant) => variant.tone === selectedTone) ??
      result.data.replyVariants[0]
    );
  }, [result, selectedTone]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setDecision("draft");
    setFeedbackStatus("");

    try {
      const response = await draftCopilotReply({
        subject: subject.trim() || undefined,
        text: ticketText,
        source: "manual",
        topK: 5
      });
      const firstVariant = response.data.replyVariants[0];

      setResult(response);
      setSelectedTone(firstVariant.tone);
      setEditableReply(firstVariant.body);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelectVariant(variant) {
    setSelectedTone(variant.tone);
    setEditableReply(variant.body);
    setDecision("draft");
    setFeedbackStatus("");
  }

  async function handleAgentDecision(nextDecision) {
    if (!result || !selectedVariant) {
      return;
    }

    setDecision(nextDecision);
    setFeedbackStatus("Saving");
    setError(null);

    try {
      await submitAgentFeedback({
        draftId: result.meta.draftId,
        decision: nextDecision,
        tone: selectedVariant.tone,
        editedContent: editableReply,
        reason: nextDecision === "marked_bad_output" ? "Agent marked this AI output for review." : undefined
      });
      setFeedbackStatus("Saved");
    } catch (requestError) {
      setError(requestError.message);
      setFeedbackStatus("Failed");
    }
  }

  return (
    <section className="copilot-layout">
      <form className="panel copilot-ticket-panel" onSubmit={handleSubmit}>
        <div className="panel-header">
          <div>
            <p className="section-label">Agent Copilot</p>
            <h2>Ticket Context</h2>
          </div>
          {result ? (
            <span className={eligibilityClass(result.data.automationEligibility)}>
              {formatLabel(result.data.automationEligibility)}
            </span>
          ) : null}
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

        {showSampleTickets ? (
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
        ) : null}

        {error ? <div className="error-banner">{error}</div> : null}

        <button className="primary-button" disabled={!ticketText.trim() || isSubmitting} type="submit">
          {isSubmitting ? "Drafting" : "Generate Drafts"}
        </button>
      </form>

      <section className="copilot-main-column">
        {result ? (
          <>
            <div className="copilot-summary-grid">
              <section className="panel copilot-summary-panel">
                <div className="panel-header">
                  <div>
                    <p className="section-label">Summary</p>
                    <h2>Agent Brief</h2>
                  </div>
                  <span className="count-badge">{result.data.citations.length}</span>
                </div>
                <p>{result.data.summary}</p>
                <div className="metric-grid">
                  <div className="metric">
                    <span>Category</span>
                    <strong>{formatLabel(result.data.classification.category)}</strong>
                  </div>
                  <div className="metric">
                    <span>Priority</span>
                    <strong>{formatLabel(result.data.classification.priority)}</strong>
                  </div>
                  <div className="metric">
                    <span>Confidence</span>
                    <strong>{Math.round(result.data.classification.confidence * 100)}%</strong>
                  </div>
                </div>
              </section>

              <section className="panel copilot-summary-panel">
                <div className="panel-header">
                  <div>
                    <p className="section-label">Human Review</p>
                    <h2>Decision State</h2>
                  </div>
                  <span className="decision-badge">{actionLabels[decision]}</span>
                </div>
                {feedbackStatus ? <div className="feedback-status">{feedbackStatus}</div> : null}
                <div className="reason-list">
                  {result.data.reviewReasons.length > 0 ? (
                    result.data.reviewReasons.map((reason) => (
                      <div className="reason-item" key={reason}>
                        <strong>{formatLabel(reason)}</strong>
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
            </div>

            <section className="panel reply-panel">
              <div className="panel-header">
                <div>
                  <p className="section-label">Reply Variants</p>
                  <h2>Draft Response</h2>
                </div>
                <div className="tone-switcher">
                  {result.data.replyVariants.map((variant) => (
                    <button
                      data-active={variant.tone === selectedTone}
                      key={variant.tone}
                      type="button"
                      onClick={() => handleSelectVariant(variant)}
                    >
                      {formatLabel(variant.tone)}
                    </button>
                  ))}
                </div>
              </div>

              {selectedVariant ? (
                <div className="reply-editor-grid">
                  <div className="variant-list">
                    {result.data.replyVariants.map((variant) => (
                      <button
                        className="variant-card"
                        data-selected={variant.tone === selectedTone}
                        key={variant.tone}
                        type="button"
                        onClick={() => handleSelectVariant(variant)}
                      >
                        <strong>{formatLabel(variant.tone)}</strong>
                        <span>{variant.subject}</span>
                        <p>{variant.body}</p>
                      </button>
                    ))}
                  </div>

                  <div className="final-reply">
                    <label className="field">
                      <span>Editable Final Reply</span>
                      <textarea
                        value={editableReply}
                        onChange={(event) => setEditableReply(event.target.value)}
                      />
                    </label>
                    <div className="agent-action-row">
                      <button type="button" onClick={() => handleAgentDecision("accepted")}>
                        Accept
                      </button>
                      <button type="button" onClick={() => handleAgentDecision("rejected")}>
                        Reject
                      </button>
                      <button type="button" onClick={() => handleAgentDecision("escalated")}>
                        Escalate
                      </button>
                      <button type="button" onClick={() => handleAgentDecision("marked_bad_output")}>
                        Bad Output
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="panel citations-panel">
              <div className="panel-header">
                <div>
                  <p className="section-label">Sources</p>
                  <h2>Cited Knowledge</h2>
                </div>
              </div>
              <div className="citation-list">
                {result.data.citations.map((citation) => (
                  <article className="citation-item" key={citation.chunkId}>
                    <div>
                      <strong>{citation.title}</strong>
                      <span>{citation.source}</span>
                    </div>
                    <blockquote>{citation.quote}</blockquote>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="panel empty-state">
            <h2>No Draft</h2>
            <p>No copilot response has been generated for this session.</p>
          </div>
        )}
      </section>
    </section>
  );
}
