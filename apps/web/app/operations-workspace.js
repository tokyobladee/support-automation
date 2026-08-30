"use client";

import { createElement, useState } from "react";
import { AuditWorkspace } from "./audit-workspace.js";
import { CopilotWorkspace } from "./copilot-workspace.js";
import { KnowledgeWorkspace } from "./knowledge-workspace.js";
import { TriageWorkspace } from "./triage-workspace.js";

const views = [
  {
    id: "triage",
    label: "Triage"
  },
  {
    id: "copilot",
    label: "Copilot"
  },
  {
    id: "knowledge",
    label: "Knowledge Base"
  },
  {
    id: "audit",
    label: "Audit Log"
  }
];

const viewTitles = {
  triage: "Ticket Triage",
  copilot: "Agent Copilot",
  knowledge: "Knowledge Base",
  audit: "Audit Log"
};

const viewComponents = {
  triage: TriageWorkspace,
  copilot: CopilotWorkspace,
  knowledge: KnowledgeWorkspace,
  audit: AuditWorkspace
};

export function OperationsWorkspace() {
  const [activeView, setActiveView] = useState("triage");

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Support AI Copilot</p>
          <h1>{viewTitles[activeView]}</h1>
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

      {createElement(viewComponents[activeView])}
    </main>
  );
}
