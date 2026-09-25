import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), ".next");
const PATTERNS = [
  { name: "SUPABASE_SERVICE_ROLE_KEY", re: /SUPABASE_SERVICE_ROLE_KEY/g },
  { name: "COMMANDS_DATABASE_URL", re: /COMMANDS_DATABASE_URL/g },
  { name: "GSC_CONTACT_ENCRYPTION_KEY", re: /GSC_CONTACT_ENCRYPTION_KEY/g },
  { name: "TWILIO_AUTH_TOKEN", re: /TWILIO_AUTH_TOKEN/g },
  { name: "OPENAI_API_KEY", re: /OPENAI_API_KEY/g },
  { name: "begin_private_key", re: /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/g },
];

function containsServiceRoleJwt(text) {
  const matches = text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? [];
  for (const token of matches) {
    const parts = token.split(".");
    if (parts.length < 2) {
      continue;
    }
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload && payload.role === "service_role") {
        return true;
      }
    } catch {
      // Anon JWTs and truncated chunks are expected in public files.
    }
  }
  return false;
}

const SKIP_DIR = new Set(["cache", "types"]);

async function collect(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR.has(entry.name)) {
        continue;
      }
      files.push(...(await collect(full)));
    } else if (/\.(js|json|html|css|map)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const clientRoots = [path.join(ROOT, "static")];

const hits = [];
for (const root of clientRoots) {
  const files = await collect(root);
  for (const file of files) {
    const info = await stat(file);
    if (info.size > 8 * 1024 * 1024) {
      continue;
    }
    const text = await readFile(file, "utf8");
    if (containsServiceRoleJwt(text)) {
      hits.push(`${path.relative(process.cwd(), file)}:service_role_jwt`);
    }
    for (const pattern of PATTERNS) {
      if (pattern.re.test(text)) {
        hits.push(`${path.relative(process.cwd(), file)}:${pattern.name}`);
      }
    }
  }
}

if (hits.length > 0) {
  console.error("Secret-like identifiers found in Next build output:\n");
  for (const hit of hits) {
    console.error(`  ${hit}`);
  }
  process.exit(1);
}

console.log("Client-bundle secret scan passed.");
