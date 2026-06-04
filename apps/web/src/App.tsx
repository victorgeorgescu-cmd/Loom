import { useEffect, useState } from "react";

/**
 * M1 scaffold. The split iframe(contentEditable) ↔ Monaco editor with the
 * protected-scaffold guardrails and two-way sync is the M2 deliverable; this
 * page just confirms the web app boots and can reach the API.
 */
export function App() {
  const [health, setHealth] = useState<string>("checking…");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setHealth(d.ok ? "api: ok" : "api: error"))
      .catch(() => setHealth("api: unreachable (start @loom/api)"));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 640, margin: "64px auto", padding: 16 }}>
      <h1>Loom</h1>
      <p>Multi-brand email production. M1 scaffold is up.</p>
      <p style={{ color: "#666" }}>{health}</p>
      <p style={{ color: "#666" }}>
        Editor (split iframe ↔ Monaco) lands in M2 at <code>/editor/:id</code>.
      </p>
    </main>
  );
}
