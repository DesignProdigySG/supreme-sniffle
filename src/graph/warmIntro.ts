import { getDriver } from "../db/client";
import type { PathHop, WarmIntroPath } from "./types";

const MAX_HOPS = 6;

function toPath(nodes: any[], relationships: any[]): WarmIntroPath {
  const hops: PathHop[] = relationships.map((rel, i) => ({
    person: {
      id: nodes[i + 1].properties.id,
      name: nodes[i + 1].properties.name,
      is_internal: nodes[i + 1].properties.is_internal,
    },
    relationship: rel.type,
    weight: rel.properties.weight,
  }));
  return { hops, length: hops.length };
}

/**
 * Fewest-hops path from one person to another, over knows/interacted_with/
 * referred_by edges (relationship direction ignored — an intro can be asked
 * for in either direction).
 *
 * Deliberately avoids Cypher's shortestPath() function — it returned zero
 * rows against real seeded data even though the equivalent plain MATCH
 * found the path instantly (reproduced directly in the Aura Query
 * browser). shortestPath() has a documented history of exactly this kind
 * of unreliability with multi-type relationship alternation; ORDER BY
 * length(path) LIMIT 1 over a plain variable-length MATCH is the standard
 * workaround and isn't subject to the same planner path.
 */
export async function findShortestPath(fromPersonId: string, toPersonId: string): Promise<WarmIntroPath | null> {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (from:Person {id: $fromPersonId}), (to:Person {id: $toPersonId})
       MATCH path = (from)-[:knows|interacted_with|referred_by*1..${MAX_HOPS}]-(to)
       RETURN path
       ORDER BY length(path) ASC
       LIMIT 1`,
      { fromPersonId, toPersonId },
    );
    if (result.records.length === 0) return null;
    const path = result.records[0].get("path");
    return toPath(path.segments.map((s: any) => s.start).concat(path.end), path.segments.map((s: any) => s.relationship));
  } finally {
    await session.close();
  }
}

/**
 * Path that maximizes connection strength rather than minimizing hops.
 * `knows`/`interacted_with` edges carry a `distance` property, precomputed
 * at write time as the inverse of their recency/frequency weight — so a
 * shortest-*distance* search (APOC Dijkstra) is a strongest-*path* search.
 * Requires the APOC core plugin.
 */
export async function findStrongestPath(fromPersonId: string, toPersonId: string): Promise<WarmIntroPath | null> {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (from:Person {id: $fromPersonId}), (to:Person {id: $toPersonId})
       CALL apoc.algo.dijkstra(from, to, 'knows|interacted_with|referred_by', 'distance')
       YIELD path
       RETURN path
       LIMIT 1`,
      { fromPersonId, toPersonId },
    );
    if (result.records.length === 0) return null;
    const path = result.records[0].get("path");
    return toPath(path.segments.map((s: any) => s.start).concat(path.end), path.segments.map((s: any) => s.relationship));
  } finally {
    await session.close();
  }
}
