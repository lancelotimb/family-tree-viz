import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseGedcom } from "../components/family-tree/gedcomParser";
import { extractGedcomHead, serializeGedcom } from "../components/family-tree/gedcomSerialize";
import type { FamilyGraph } from "../components/family-tree/types";
import { loadProjectEnv } from "./loadEnv";
import { readGedcom, writeGedcom } from "../lib/gedcomStore";

loadProjectEnv();

function personLabel(graph: FamilyGraph, id: string): string {
  const p = graph.individuals[id];
  return p ? `${p.name} (${id})` : id;
}

function repairBidirectionalLinks(graph: FamilyGraph): string[] {
  const log: string[] = [];

  for (const union of Object.values(graph.unions)) {
    for (const partnerId of union.partnerIds) {
      const person = graph.individuals[partnerId];
      if (!person) {
        log.push(`WARN: union ${union.id} references missing partner ${partnerId}`);
        continue;
      }
      if (!person.fams.includes(union.id)) {
        person.fams.push(union.id);
        log.push(`Added FAMS ${union.id} to ${personLabel(graph, partnerId)}`);
      }
    }

    for (const childId of union.childIds) {
      const child = graph.individuals[childId];
      if (!child) {
        log.push(`WARN: union ${union.id} references missing child ${childId}`);
        continue;
      }
      if (child.famc && child.famc !== union.id) {
        log.push(
          `WARN: ${personLabel(graph, childId)} FAMC ${child.famc} conflicts with CHIL in ${union.id}`,
        );
        continue;
      }
      if (child.famc !== union.id) {
        child.famc = union.id;
        log.push(`Added FAMC ${union.id} to ${personLabel(graph, childId)}`);
      }
    }
  }

  for (const person of Object.values(graph.individuals)) {
    for (const famsId of person.fams) {
      const union = graph.unions[famsId];
      if (!union) {
        log.push(`WARN: ${personLabel(graph, person.id)} FAMS ${famsId} — union missing`);
        continue;
      }
      if (!union.partnerIds.includes(person.id)) {
        union.partnerIds.push(person.id);
        log.push(`Added ${personLabel(graph, person.id)} as partner in ${famsId}`);
      }
    }

    if (!person.famc) continue;
    const union = graph.unions[person.famc];
    if (!union) {
      log.push(`WARN: ${personLabel(graph, person.id)} FAMC ${person.famc} — union missing`);
      continue;
    }
    if (!union.childIds.includes(person.id)) {
      union.childIds.push(person.id);
      log.push(`Added ${personLabel(graph, person.id)} as child in ${person.famc}`);
    }
  }

  return log;
}

async function main() {
  const gedPath = join(process.cwd(), "data/family-tree.ged");
  let source = "local file";
  let text: string;

  try {
    text = await readGedcom();
    source = "online blob (or local fallback)";
  } catch {
    text = readFileSync(gedPath, "utf8");
  }

  console.log(`Reading GEDCOM from ${source} (${text.split("\n").length} lines)\n`);

  const graph = parseGedcom(text);
  const fixes = repairBidirectionalLinks(graph);

  if (fixes.length === 0) {
    console.log("No inconsistencies found — nothing to fix.");
    return;
  }

  console.log(`Applied ${fixes.length} fix(es):\n`);
  for (const line of fixes) console.log(`  ${line}`);

  const head = extractGedcomHead(text);
  const repaired = serializeGedcom(graph, head);

  writeFileSync(gedPath, repaired, "utf8");
  console.log(`\nWrote ${gedPath}`);

  try {
    await writeGedcom(repaired);
    console.log("Uploaded repaired GEDCOM to online blob.");
  } catch (error) {
    console.log("\nCould not upload to blob (local file was still updated):", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
