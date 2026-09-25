import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["src/app", "src/server"];
const GROWING = [
  "files",
  "education_records",
  "test_results",
  "student_awards",
  "relative_connections",
  "notifications",
  "messages",
  "message_threads",
  "audit_events",
  "universities",
  "programs",
  "scholarships",
  "accommodations",
  "catalog_universities_public",
  "catalog_programs_public",
  "catalog_scholarships_public",
  "catalog_accommodations_public",
  "catalog_rankings_public",
  "catalog_program_intakes_public",
  "catalog_entry_criteria_public",
  "catalog_source_facts_public",
  "taxonomy_terms",
];

const BOUNDED = /\.(limit|range|maybeSingle|single)\s*\(|count:\s*["']exact["']|head:\s*true/;

async function collect(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const offenders = [];
for (const root of ROOTS) {
  const files = await collect(path.join(process.cwd(), root));
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = line.match(/\.from\(\s*["']([^"']+)["']\s*\)/);
      if (!match || !GROWING.includes(match[1])) {
        continue;
      }
      const window = lines.slice(index, index + 16).join("\n");
      if (!window.includes(".select(")) {
        continue;
      }
      if (BOUNDED.test(window)) {
        continue;
      }
      offenders.push(`${path.relative(process.cwd(), file)}:${index + 1} .from("${match[1]}")`);
    }
  }
}

if (offenders.length > 0) {
  console.error("Unbounded growing-list selects (add .limit/.range/.single):\n");
  for (const row of offenders) {
    console.error(`  ${row}`);
  }
  process.exit(1);
}

console.log(`Unbounded-select guard passed for ${GROWING.length} growing tables.`);
