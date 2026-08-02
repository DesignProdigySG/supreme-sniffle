"use client";

import { useState, type FormEvent } from "react";

interface Hop {
  person: { id: string; name: string; is_internal: boolean };
  relationship: string;
  weight?: number;
}

interface WarmIntroPathResult {
  hops: Hop[];
  length: number;
}

export default function WarmIntroPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [strongest, setStrongest] = useState(false);
  const [path, setPath] = useState<WarmIntroPathResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPath(null);
    setNotFound(false);
    try {
      const params = new URLSearchParams({ from, to, strongest: String(strongest) });
      const res = await fetch(`/api/warm-intro?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (!data.path) setNotFound(true);
      else setPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <a href="/" className="back-link">
        &larr; Home
      </a>
      <h1>Warm-intro path finder</h1>
      <p className="subtitle">Shortest — or strongest — path from one person to another.</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          From (Person ID)
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="person-yuan-wen" required />
        </label>
        <label>
          To (Person ID)
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="person-target" required />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={strongest} onChange={(e) => setStrongest(e.target.checked)} />
          Optimize for connection strength instead of fewest hops
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Find path"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {notFound && <p>No path found.</p>}
      {path && (
        <ol className="path">
          {path.hops.map((hop, i) => (
            <li key={i}>
              <span className="rel">{hop.relationship}</span> &rarr; <strong>{hop.person.name}</strong>
              {hop.weight !== undefined && <span className="weight"> (weight {hop.weight})</span>}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
