"use client";

import { useEffect, useMemo, useState } from "react";
import { listAuditEvents } from "../lib/api-client.js";

const eventTypes = [
  {
    value: "",
    label: "All events"
  },
  {
    value: "ai_run_completed",
    label: "AI runs"
  },
  {
    value: "human_decision_recorded",
    label: "Human decisions"
  }
];

export function AuditWorkspace() {
  const [events, setEvents] = useState([]);
  const [eventType, setEventType] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setIsLoading(true);
      setError("");

      try {
        const response = await listAuditEvents({
          type: eventType || undefined,
          limit: 100
        });

        if (isMounted) {
          setEvents(response.data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [eventType]);

  const summary = useMemo(() => summarizeEvents(events), [events]);

  return (
    <section className="audit-layout">
      <div className="panel audit-panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Audit trail</p>
            <h2>AI Runs And Human Decisions</h2>
          </div>
          <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
            {eventTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="metric-grid audit-metrics">
          <div className="metric">
            <span>Total events</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="metric">
            <span>AI runs</span>
            <strong>{summary.aiRuns}</strong>
          </div>
          <div className="metric">
            <span>Human decisions</span>
            <strong>{summary.humanDecisions}</strong>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-inline">Loading audit events</div>
        ) : events.length === 0 ? (
          <div className="empty-inline">No audit events recorded yet</div>
        ) : (
          <div className="audit-table">
            <div className="audit-row audit-row-header">
              <span>Time</span>
              <span>Event</span>
              <span>Actor</span>
              <span>Details</span>
            </div>
            {events.map((event) => (
              <div className="audit-row" key={event.id}>
                <span>{formatDate(event.createdAt)}</span>
                <strong>{formatEventType(event.type)}</strong>
                <span>{event.actorType}</span>
                <p>{formatEventDetails(event)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function summarizeEvents(events) {
  return {
    total: events.length,
    aiRuns: events.filter((event) => event.type === "ai_run_completed").length,
    humanDecisions: events.filter((event) => event.type === "human_decision_recorded").length
  };
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatEventType(value) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEventDetails(event) {
  if (event.type === "ai_run_completed") {
    return [
      event.payload.purpose,
      event.payload.provider,
      event.payload.model,
      event.payload.promptVersion
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return [
    event.payload.decision,
    event.payload.tone,
    event.payload.hasReason ? `reason ${event.payload.reasonLength} chars` : undefined,
    event.payload.hasEditedContent ? "edited" : undefined
  ]
    .filter(Boolean)
    .join(" / ");
}
