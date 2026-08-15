import { getDriver } from "../db/client";
import type { PersonNode } from "./types";

/**
 * Case-insensitive substring search over Person.name, for UI typeahead —
 * so users can type "yuan wen" instead of needing the internal person-*
 * slug ID.
 */
export async function searchPeople(query: string): Promise<PersonNode[]> {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Person)
       WHERE toLower(p.name) CONTAINS toLower($query)
       RETURN p
       ORDER BY p.name
       LIMIT 10`,
      { query },
    );
    return result.records.map((record) => {
      const p = record.get("p").properties;
      return { id: p.id, name: p.name, is_internal: p.is_internal, linkedin_url: p.linkedin_url, email: p.email };
    });
  } finally {
    await session.close();
  }
}
