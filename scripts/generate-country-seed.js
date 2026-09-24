const fs = require("fs");

const source = fs.readFileSync("src/domain/identity/countries.ts", "utf8");
const rows = [...source.matchAll(/\{ code: "([A-Z]{2})", name: "((?:\\.|[^"\\])*)" \}/g)].map(
  (match) => {
    const name = match[2].replace(/'/g, "''");
    return `('${match[1]}', '${name}', true)`;
  },
);

if (rows.length < 200) {
  throw new Error(`Expected 200+ countries, found ${rows.length}`);
}

const sql = `-- ISO 3166-1 alpha-2 reference data (not university catalog facts).
INSERT INTO public.countries (code, name, supported) VALUES
${rows.join(",\n")}
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, supported = EXCLUDED.supported;
`;

fs.writeFileSync("supabase/migrations/0028_countries_seed.sql", sql);
console.log(`seeded ${rows.length} countries`);
