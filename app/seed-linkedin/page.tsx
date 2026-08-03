"use client";

import { useState, type FormEvent } from "react";

interface ImportResult {
  connectionsSeen: number;
  rowsProcessed: number;
}

export default function SeedLinkedInPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ownerPersonId, setOwnerPersonId] = useState("person-yuan-wen");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/seed/import-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, ownerPersonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
      setFile(null);
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
      <h1>Seed LinkedIn connections</h1>
      <p className="subtitle">
        Import your LinkedIn Connections.csv export as knows edges off your Person node.
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Owner Person ID (you)
          <input value={ownerPersonId} onChange={(e) => setOwnerPersonId(e.target.value)} required />
        </label>
        <label>
          Connections.csv
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button type="submit" disabled={loading || !file}>
          {loading ? "Importing…" : "Import"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <p>
          Processed {result.rowsProcessed}/{result.connectionsSeen} connections.
        </p>
      )}
    </main>
  );
}
