import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { getDriver } from "../db/client";

interface ExtractedMember {
  person_name: string;
  role: string;
  confirmation: "confirmed" | "likely" | "unconfirmed";
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_buying_group",
  description:
    "Record the buying-group members mentioned in an account brief, with their role and how confirmed their involvement is.",
  input_schema: {
    type: "object",
    properties: {
      members: {
        type: "array",
        items: {
          type: "object",
          properties: {
            person_name: { type: "string", description: "Full name as written in the brief." },
            role: { type: "string", description: "Their role/title/function relative to the deal, as described." },
            confirmation: {
              type: "string",
              enum: ["confirmed", "likely", "unconfirmed"],
              description: "How certain the brief is that this person is actually in the buying group.",
            },
          },
          required: ["person_name", "role", "confirmation"],
        },
      },
    },
    required: ["members"],
  },
};

async function extractMembers(briefText: string): Promise<ExtractedMember[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY — copy .env.example to .env and fill it in.");
  }
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "record_buying_group" },
    messages: [
      {
        role: "user",
        content: `Extract the buying-group members from this account brief. Only include people explicitly described as part of the deal/buying group — not every name mentioned in passing.\n\n${briefText}`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return the expected tool call.");
  }
  return (toolUse.input as { members: ExtractedMember[] }).members;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface ExtractBriefOptions {
  filePath: string;
  accountId: string;
  accountName: string;
}

export interface ExtractBriefResult {
  membersExtracted: number;
}

export async function extractBriefIntoGraph({
  filePath,
  accountId,
  accountName,
}: ExtractBriefOptions): Promise<ExtractBriefResult> {
  const briefText = readFileSync(filePath, "utf-8");
  const members = await extractMembers(briefText);

  const driver = getDriver();
  const session = driver.session();
  try {
    await session.run(`MERGE (a:Account {id: $accountId}) ON CREATE SET a.name = $accountName`, {
      accountId,
      accountName,
    });

    for (const member of members) {
      const personId = `person-${slugify(member.person_name)}`;
      await session.run(
        `MERGE (p:Person {id: $personId})
         ON CREATE SET p.name = $name, p.is_internal = false, p.created_via = 'brief_extraction'
         WITH p
         MATCH (a:Account {id: $accountId})
         MERGE (p)-[w:works_at]->(a)
         SET w.role = $role, w.confirmation = $confirmation, w.start_date = coalesce(w.start_date, date())`,
        {
          personId,
          name: member.person_name,
          accountId,
          role: member.role,
          confirmation: member.confirmation,
        },
      );
    }
  } finally {
    await session.close();
  }

  return { membersExtracted: members.length };
}
