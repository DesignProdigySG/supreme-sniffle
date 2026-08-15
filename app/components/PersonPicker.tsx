"use client";

import { useEffect, useRef, useState } from "react";

interface PersonResult {
  id: string;
  name: string;
  is_internal: boolean;
}

interface PersonPickerProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (personId: string) => void;
}

/**
 * Type-ahead over Person.name that resolves to the internal person-* ID
 * under the hood — so the person filling the form never has to know or
 * type the raw ID.
 */
export default function PersonPicker({ label, placeholder, value, onChange }: PersonPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/people/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.people ?? []);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectPerson(person: PersonResult) {
    onChange(person.id);
    setSelectedName(person.name);
    setQuery(person.name);
    setOpen(false);
  }

  function handleInputChange(text: string) {
    setQuery(text);
    setOpen(true);
    if (text !== selectedName) onChange("");
  }

  return (
    <div className="person-picker" ref={containerRef} style={{ position: "relative" }}>
      <label>
        {label}
        <input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          required
        />
      </label>
      <input type="hidden" value={value} />
      {open && results.length > 0 && (
        <ul
          className="person-picker-results"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            margin: 0,
            padding: 0,
            listStyle: "none",
            borderRadius: 4,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {results.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => selectPerson(person)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {person.name}
                {!person.is_internal && <span style={{ opacity: 0.6 }}> (external)</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
