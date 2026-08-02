import neo4j, { type Driver } from "neo4j-driver";
import "dotenv/config";

let driver: Driver | undefined;

export function getDriver(): Driver {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !username || !password) {
    throw new Error(
      "Missing NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD — copy .env.example to .env and fill it in.",
    );
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  return driver;
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}
