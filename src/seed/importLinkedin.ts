import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { getDriver } from "../db/client";

interface ConnectionRow {
  "First Name": string;
  "Last Name": string;
  URL: string;
  "Email Address": string;
  Company: string;
  Position: string;
  "Connected On": string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function linkedInIdFromUrl(url: string): string | undefined {
  const match = url.match(/linkedin\.com\/in\/([^/?]+)/i);
  return match ? `li-${match[1].toLowerCase()}` : undefined;
}

/**
 * LinkedIn's official export puts a few "Notes:" preamble lines before the
 * real header row — find it rather than assuming row 0.
 */
function stripPreamble(csvText: string): string {
  const lines = csvText.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith("First Name,"));
  if (headerIndex === -1) {
    throw new Error('Could not find the "First Name,Last Name,..." header row in this CSV.');
  }
  return lines.slice(headerIndex).join("\n");
}

export interface ImportLinkedInOptions {
  filePath: string;
  ownerPersonId: string;
}

export interface ImportLinkedInResult {
  connectionsSeen: number;
  rowsProcessed: number;
}

export async function importLinkedInConnections({
  filePath,
  ownerPersonId,
}: ImportLinkedInOptions): Promise<ImportLinkedInResult> {
  const raw = readFileSync(filePath, "utf-8");
  const csvText = stripPreamble(raw);
  const rows: ConnectionRow[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const driver = getDriver();
  const session = driver.session();
  let rowsProcessed = 0;

  try {
    const owner = await session.run(`MATCH (p:Person {id: $ownerPersonId}) RETURN p`, { ownerPersonId });
    if (owner.records.length === 0) {
      throw new Error(
        `No Person with id "${ownerPersonId}" found — create the owner (internal team member) node before importing their connections.`,
      );
    }

    for (const row of rows) {
      const firstName = row["First Name"]?.trim();
      const lastName = row["Last Name"]?.trim();
      const company = row["Company"]?.trim();
      const url = row["URL"]?.trim();
      if (!firstName && !lastName) continue;

      const name = [firstName, lastName].filter(Boolean).join(" ");
      const id = (url && linkedInIdFromUrl(url)) ?? `person-${slugify(`${name}-${company ?? ""}`)}`;

      const result = await session.run(
        `MERGE (p:Person {id: $id})
         ON CREATE SET p.name = $name, p.is_internal = false, p.linkedin_url = $url, p.created_via = 'linkedin_import'
         WITH p
         MATCH (owner:Person {id: $ownerPersonId})
         MERGE (owner)-[k:knows]-(p)
         ON CREATE SET k.weight = 1, k.distance = 1, k.connected_on = $connectedOn, k.source = 'linkedin'
         RETURN p, k`,
        {
          id,
          name,
          url: url || null,
          ownerPersonId,
          connectedOn: row["Connected On"] ?? null,
        },
      );
      if (result.records.length > 0) {
        rowsProcessed += 1;
      }
    }
  } finally {
    await session.close();
  }

  return { connectionsSeen: rows.length, rowsProcessed };
}
