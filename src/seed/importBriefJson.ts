import { readFileSync } from "node:fs";
import { slugify } from "../lib/slugify";
import { writeBuyingGroup } from "./writeBuyingGroup";

interface WhenBuyingGroupEntry {
  name: string;
  title: string;
  focus_area: string;
  status: string;
}

interface WhenAccountBrief {
  account: {
    name: string;
    industry?: string;
    theme?: string;
  };
  buying_group: WhenBuyingGroupEntry[];
}

/**
 * Some buying-group entries have a real person's name (status ""); others
 * have a role description in the name field instead, because the engine
 * knows the role exists but hasn't identified who holds it yet (status
 * "Needs enrichment"). Carrying that through as "unconfirmed" rather than
 * treating the role placeholder as a real name.
 */
function confirmationFor(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "" || normalized === "confirmed") return "confirmed";
  if (normalized === "needs enrichment" || normalized === "unconfirmed") return "unconfirmed";
  return "likely";
}

export interface ImportBriefJsonOptions {
  filePath: string;
}

export interface ImportBriefJsonResult {
  accountName: string;
  membersImported: number;
}

/**
 * Direct, deterministic import of a WHEN Layer Intelligence Engine account
 * brief (structured JSON, not prose) — no AI extraction pass needed since
 * the buying_group array is already structured.
 */
export async function importBriefJson({ filePath }: ImportBriefJsonOptions): Promise<ImportBriefJsonResult> {
  const brief: WhenAccountBrief = JSON.parse(readFileSync(filePath, "utf-8"));
  const accountId = `account-${slugify(brief.account.name)}`;

  const membersImported = await writeBuyingGroup(
    accountId,
    brief.account.name,
    brief.buying_group.map((entry) => ({
      name: entry.name,
      role: entry.title || entry.focus_area,
      confirmation: confirmationFor(entry.status),
      createdVia: "brief_json_import",
    })),
  );

  return { accountName: brief.account.name, membersImported };
}
