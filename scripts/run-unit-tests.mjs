import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

async function collectTestFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(fullPath)));
    } else if (entry.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }

  return files;
}

const root = path.join(process.cwd(), "dist-test");
const files = await collectTestFiles(root);

if (files.length === 0) {
  console.error("No compiled tests found under dist-test.");
  process.exit(1);
}

const child = spawn(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
