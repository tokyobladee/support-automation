"use client";

export function LoadingState({ title, message }) {
  return (
    <div className="loading-state" aria-live="polite" aria-busy="true">
      <div className="loading-spinner" />
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
