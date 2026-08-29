const workflows = [
  {
    title: "Ticket Triage",
    description: "Classify category, priority, next step, confidence, and review boundaries."
  },
  {
    title: "Agent Copilot",
    description: "Summarize tickets, retrieve knowledge, and draft tone-specific reply variants."
  },
  {
    title: "Quality Loop",
    description: "Track prompt versions, evaluations, AI runs, feedback, and human decisions."
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="workspace">
        <div className="panel intro">
          <p className="eyebrow">Support Operations</p>
          <h1>Support AI Copilot</h1>
          <p>
            A production-minded workspace for AI-assisted support triage, reply drafting,
            knowledge retrieval, and human-in-the-loop review.
          </p>
        </div>

        <div className="workflow-grid">
          {workflows.map((workflow) => (
            <article className="workflow-card" key={workflow.title}>
              <h2>{workflow.title}</h2>
              <p>{workflow.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
