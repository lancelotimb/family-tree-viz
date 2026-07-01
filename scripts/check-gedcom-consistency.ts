import { readFileSync } from "fs";
import { join } from "path";
import { parseGedcom } from "../components/family-tree/gedcomParser";

const gedPath = join(process.cwd(), "data/family-tree.ged");
const text = readFileSync(gedPath, "utf8");
const graph = parseGedcom(text);

function personLabel(id: string): string {
  const p = graph.individuals[id];
  return p ? `${p.name} (${id})` : id;
}

type Issue = {
  kind: string;
  detail: string;
};

const issues: Issue[] = [];

// 1. Person FAMS → union must list them as partner
for (const person of Object.values(graph.individuals)) {
  for (const famsId of person.fams) {
    const union = graph.unions[famsId];
    if (!union) {
      issues.push({
        kind: "missing-union",
        detail: `${personLabel(person.id)} has FAMS ${famsId} but union does not exist`,
      });
      continue;
    }
    if (!union.partnerIds.includes(person.id)) {
      issues.push({
        kind: "fams-not-partner",
        detail: `${personLabel(person.id)} has FAMS ${famsId} but union partners are ${union.partnerIds.map(personLabel).join(", ")}`,
      });
    }
  }
}

// 2. Union partner → person must have FAMS back
for (const union of Object.values(graph.unions)) {
  for (const partnerId of union.partnerIds) {
    const partner = graph.individuals[partnerId];
    if (!partner) {
      issues.push({
        kind: "missing-partner",
        detail: `Union ${union.id} lists missing partner ${partnerId}`,
      });
      continue;
    }
    if (!partner.fams.includes(union.id)) {
      issues.push({
        kind: "partner-missing-fams",
        detail: `Union ${union.id} lists ${personLabel(partnerId)} as partner but they have no FAMS ${union.id} (their FAMS: ${partner.fams.join(", ") || "none"})`,
      });
    }
  }
}

// 3. Union CHIL → child must have FAMC (after parser back-fill)
for (const union of Object.values(graph.unions)) {
  for (const childId of union.childIds) {
    const child = graph.individuals[childId];
    if (!child) {
      issues.push({
        kind: "missing-child",
        detail: `Union ${union.id} lists missing child ${childId}`,
      });
      continue;
    }
    if (child.famc !== union.id) {
      issues.push({
        kind: "child-missing-famc",
        detail: `Union ${union.id} lists ${personLabel(childId)} as child but FAMC is ${child.famc ?? "none"}`,
      });
    }
  }
}

// 4. Person FAMC → union must list them as child
for (const person of Object.values(graph.individuals)) {
  if (!person.famc) continue;
  const union = graph.unions[person.famc];
  if (!union) {
    issues.push({
      kind: "missing-birth-union",
      detail: `${personLabel(person.id)} has FAMC ${person.famc} but union does not exist`,
    });
    continue;
  }
  if (!union.childIds.includes(person.id)) {
    issues.push({
      kind: "famc-not-child",
      detail: `${personLabel(person.id)} has FAMC ${person.famc} but union children are ${union.childIds.map(personLabel).join(", ") || "none"}`,
    });
  }
}

// Group by kind
const byKind = new Map<string, Issue[]>();
for (const issue of issues) {
  const list = byKind.get(issue.kind) ?? [];
  list.push(issue);
  byKind.set(issue.kind, list);
}

console.log(`Found ${issues.length} consistency issue(s):\n`);
for (const [kind, list] of [...byKind.entries()].sort()) {
  console.log(`## ${kind} (${list.length})`);
  for (const issue of list) {
    console.log(`  - ${issue.detail}`);
  }
  console.log();
}

if (issues.length > 0) process.exit(1);
