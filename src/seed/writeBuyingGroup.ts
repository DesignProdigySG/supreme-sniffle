import { getDriver } from "../db/client";
import { slugify } from "../lib/slugify";

export interface BuyingGroupMemberInput {
  name: string;
  role: string;
  confirmation: string;
  createdVia: string;
}

/**
 * Merges an Account and its buying-group members/works_at edges. Shared by
 * both seeding paths (AI extraction over prose, direct parse of structured
 * brief JSON) since the graph write is identical either way.
 */
export async function writeBuyingGroup(
  accountId: string,
  accountName: string,
  members: BuyingGroupMemberInput[],
): Promise<number> {
  const driver = getDriver();
  const session = driver.session();
  try {
    await session.run(`MERGE (a:Account {id: $accountId}) ON CREATE SET a.name = $accountName`, {
      accountId,
      accountName,
    });

    for (const member of members) {
      const personId = `person-${slugify(member.name)}`;
      await session.run(
        `MERGE (p:Person {id: $personId})
         ON CREATE SET p.name = $name, p.is_internal = false, p.created_via = $createdVia
         WITH p
         MATCH (a:Account {id: $accountId})
         MERGE (p)-[w:works_at]->(a)
         SET w.role = $role, w.confirmation = $confirmation, w.start_date = coalesce(w.start_date, date())`,
        {
          personId,
          name: member.name,
          accountId,
          role: member.role,
          confirmation: member.confirmation,
          createdVia: member.createdVia,
        },
      );
    }
  } finally {
    await session.close();
  }

  return members.length;
}
