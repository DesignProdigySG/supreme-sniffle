"use client";

import { useState, type FormEvent } from "react";

interface Member {
  person: {
    id: string;
    name: string;
    is_internal: boolean;
    linkedin_url?: string;
    email?: string;
  };
  role?: string;
  confirmation?: string;
  start_date?: string;
}

export default function BuyingGroupPage() {
  const [accountId, setAccountId] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMembers(null);
    try {
      const res = await fetch(`/api/buying-group?accountId=${encodeURIComponent(accountId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMembers(data.members);
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
      <h1>Buying group lookup</h1>
      <p className="subtitle">Who&apos;s currently in the buying group at an account.</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Account ID
          <input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="account-acme"
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {members &&
        (members.length === 0 ? (
          <p>No buying-group members found for this account.</p>
        ) : (
          <ul className="results">
            {members.map((m) => (
              <li key={m.person.id}>
                <strong>{m.person.name}</strong>
                {m.role && <span> — {m.role}</span>}
                {m.confirmation && <span className="tag">{m.confirmation}</span>}
              </li>
            ))}
          </ul>
        ))}
    </main>
  );
}
