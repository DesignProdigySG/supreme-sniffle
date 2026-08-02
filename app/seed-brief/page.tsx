"use client";

import { useState, type FormEvent } from "react";

interface ImportResult {
  accountName: string;
  membersImported: number;
}

export default function SeedBriefPage() {
  const [json, setJson] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error("That's not valid JSON — paste the whole brief file's contents.");
      }
      const res = await fetch("/api/seed/import-brief-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
      setJson("");
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
      <h1>Seed a brief</h1>
      <p className="subtitle">
        Paste the contents of a WHEN Layer account-brief JSON file to load its buying group into the graph.
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Brief JSON
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder='{"account": {"name": "Acme Corp"}, "buying_group": [...]}'
            required
            rows={14}
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 13,
              padding: 10,
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--ink)",
              resize: "vertical",
            }}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Importing…" : "Import"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <p>
          Imported {result.membersImported} buying-group member(s) into account &ldquo;{result.accountName}&rdquo;.
        </p>
      )}
    </main>
  );
}
