"use client";

import { createElement, useState } from "react";
import { KnowledgeWorkspace } from "./knowledge-workspace.js";
import { TriageWorkspace } from "./triage-workspace.js";

const views = [
  {
    id: "triage",
    label: "Triage"
  },
  {
    id: "knowledge",
    label: "Knowledge Base"
  }
];

export function OperationsWorkspace() {
  const [activeView, setActiveView] = useState("triage");

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Support AI Copilot</p>
          <h1>{activeView === "triage" ? "Ticket Triage" : "Knowledge Base"}</h1>
        </div>
        <div className="topbar-actions">
          <div className="view-switcher">
            {views.map((view) => (
              <button
                data-active={view.id === activeView}
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </div>
          <div className="system-status">
            <span className="status-dot" />
            Operational workspace
          </div>
        </div>
      </header>

      {createElement(activeView === "triage" ? TriageWorkspace : KnowledgeWorkspace)}
    </main>
  );
}
