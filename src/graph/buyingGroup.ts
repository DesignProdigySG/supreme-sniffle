import { getDriver } from "../db/client";
import type { BuyingGroupMember } from "./types";

/**
 * Current buying group at an account: everyone with an open works_at edge
 * (end_date IS NULL), i.e. still there. role/confirmation live on the edge,
 * not the Person, since they're specific to this person-at-this-account.
 */
export async function getBuyingGroup(accountId: string): Promise<BuyingGroupMember[]> {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:Person)-[w:works_at]->(a:Account {id: $accountId})
       WHERE w.end_date IS NULL
       RETURN p, w
       ORDER BY p.name`,
      { accountId },
    );
    return result.records.map((record) => {
      const p = record.get("p").properties;
      const w = record.get("w").properties;
      return {
        person: { id: p.id, name: p.name, is_internal: p.is_internal, linkedin_url: p.linkedin_url, email: p.email },
        role: w.role,
        confirmation: w.confirmation,
        start_date: w.start_date,
      };
    });
  } finally {
    await session.close();
  }
}
