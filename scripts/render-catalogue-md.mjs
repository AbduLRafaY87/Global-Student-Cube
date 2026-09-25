import { readFileSync } from "node:fs";

const source = readFileSync("src/domain/catalogue/cases.ts", "utf8");
const callRe = /row\(\s*("T\d{3}")\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*(true|false)\s*,\s*("(?:[^"\\]|\\.)*")\s*,\s*(null|"(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")/g;

const rows = [...source.matchAll(callRe)].map((match) => ({
  id: JSON.parse(match[1]),
  group: JSON.parse(match[2]),
  automated: match[5] === "true",
  layer: JSON.parse(match[6]),
  fixture: JSON.parse(match[8]),
}));

if (rows.length !== 116) {
  console.error(`Expected 116 catalogue rows, parsed ${rows.length}`);
  process.exit(1);
}

const groups = new Map();
for (const row of rows) {
  const list = groups.get(row.group) ?? [];
  list.push(row);
  groups.set(row.group, list);
}

function resultFor(row) {
  if (row.layer === "na") {
    return "n/a (D2)";
  }
  if (!row.automated) {
    return "manual";
  }
  if (row.id === "T026" || row.id === "T089") {
    return "skip without COMMANDS_DATABASE_URL";
  }
  if (row.layer === "e2e") {
    return "see Playwright";
  }
  return "unit this session";
}

for (const [group, list] of groups) {
  console.log(`\n### ${group}\n`);
  console.log("| test id | automated | result | build | fixture |");
  console.log("|---------|-----------|--------|-------|---------|");
  for (const row of list) {
    console.log(
      `| ${row.id} | ${row.automated ? "yes" : "no"} | ${resultFor(row)} | 25 Sep 2026 | ${row.fixture} |`,
    );
  }
}
