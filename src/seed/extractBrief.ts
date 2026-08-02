import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { writeBuyingGroup } from "./writeBuyingGroup";

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

  const membersExtracted = await writeBuyingGroup(
    accountId,
    accountName,
    members.map((m) => ({
      name: m.person_name,
      role: m.role,
      confirmation: m.confirmation,
      createdVia: "brief_extraction",
    })),
  );

  return { membersExtracted };
}
