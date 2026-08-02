import { getDriver, closeDriver } from "./client";

// Property graph, not a fixed ontology: these constraints only guarantee
// stable IDs for matching/merging during seeding. They don't constrain what
// other properties a given node or edge can carry.
const STATEMENTS = [
  "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
  "CREATE CONSTRAINT account_id IF NOT EXISTS FOR (a:Account) REQUIRE a.id IS UNIQUE",
  "CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE",
  "CREATE CONSTRAINT person_linkedin_url IF NOT EXISTS FOR (p:Person) REQUIRE p.linkedin_url IS UNIQUE",
  "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)",
  "CREATE INDEX account_name IF NOT EXISTS FOR (a:Account) ON (a.name)",
];

async function main() {
  const driver = getDriver();
  const session = driver.session();
  try {
    for (const statement of STATEMENTS) {
      await session.run(statement);
      console.log(`OK: ${statement}`);
    }
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
