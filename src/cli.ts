#!/usr/bin/env node
import { Command } from "commander";
import "dotenv/config";
import { closeDriver } from "./db/client";
import { importLinkedInConnections } from "./seed/importLinkedin";
import { extractBriefIntoGraph } from "./seed/extractBrief";
import { getBuyingGroup } from "./graph/buyingGroup";
import { findShortestPath, findStrongestPath } from "./graph/warmIntro";

const program = new Command();
program.name("yw-intel-graph-v1").description("Seed and query the warm-intro graph.");

program
  .command("import-linkedin")
  .description("Import a LinkedIn Connections.csv export as knows edges off one internal team member.")
  .requiredOption("--file <path>", "path to Connections.csv")
  .requiredOption("--owner-id <id>", "Person.id of the internal team member this export belongs to")
  .action(async (opts) => {
    const result = await importLinkedInConnections({ filePath: opts.file, ownerPersonId: opts.ownerId });
    console.log(`Processed ${result.rowsProcessed}/${result.connectionsSeen} connections.`);
  });

program
  .command("extract-brief")
  .description("AI-extract buying-group members from a Jocelyn account-brief text file into the graph.")
  .requiredOption("--file <path>", "path to the brief text")
  .requiredOption("--account-id <id>", "stable id to use/reuse for this Account node")
  .requiredOption("--account-name <name>", "Account display name")
  .action(async (opts) => {
    const result = await extractBriefIntoGraph({
      filePath: opts.file,
      accountId: opts.accountId,
      accountName: opts.accountName,
    });
    console.log(`Extracted ${result.membersExtracted} buying-group member(s) into account "${opts.accountName}".`);
  });

program
  .command("buying-group")
  .description("List the current buying group at an account.")
  .requiredOption("--account-id <id>")
  .action(async (opts) => {
    const members = await getBuyingGroup(opts.accountId);
    if (members.length === 0) {
      console.log("No buying-group members found for this account.");
      return;
    }
    for (const m of members) {
      console.log(`- ${m.person.name}${m.role ? ` — ${m.role}` : ""}${m.confirmation ? ` [${m.confirmation}]` : ""}`);
    }
  });

program
  .command("warm-intro")
  .description("Find a path from one person to another through the who-do-we-know graph.")
  .requiredOption("--from <personId>")
  .requiredOption("--to <personId>")
  .option("--strongest", "optimize for connection strength instead of fewest hops", false)
  .action(async (opts) => {
    const path = opts.strongest
      ? await findStrongestPath(opts.from, opts.to)
      : await findShortestPath(opts.from, opts.to);
    if (!path) {
      console.log("No path found.");
      return;
    }
    console.log(`Path (${path.length} hop${path.length === 1 ? "" : "s"}):`);
    for (const hop of path.hops) {
      console.log(`  --[${hop.relationship}]--> ${hop.person.name}`);
    }
  });

program
  .hook("postAction", async () => {
    await closeDriver();
  })
  .parseAsync(process.argv)
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
