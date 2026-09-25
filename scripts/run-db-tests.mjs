import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const testsDir = path.join(process.cwd(), "supabase", "tests");
const files = (await readdir(testsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => path.join(testsDir, name));

if (files.length === 0) {
  console.error("No supabase/tests/*.sql files found.");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  console.log(`\n=== ${relative} ===`);
  const code = await new Promise((resolve) => {
    const child = spawn(
      "npx",
      ["supabase", "db", "query", "--linked", "-f", file],
      { stdio: "inherit", shell: true },
    );
    child.on("exit", (exitCode) => resolve(exitCode ?? 1));
  });
  if (code !== 0) {
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\nDatabase tests: ${failed} file(s) failed.`);
  process.exit(1);
}

console.log(`\nDatabase tests: ${files.length} file(s) ran via db query --linked.`);
