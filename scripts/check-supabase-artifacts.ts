import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createSupabaseSeed } from "./generate-supabase-seed";

const seedPath = fileURLToPath(new URL("../supabase/seed.sql", import.meta.url));
const typesPath = fileURLToPath(
  new URL("../src/infrastructure/supabase/database.types.ts", import.meta.url)
);

const expectedSeed = createSupabaseSeed();
const committedSeed = readFileSync(seedPath, "utf8");
if (committedSeed !== expectedSeed) {
  throw new Error("supabase/seed.sql has drifted; run npm run db:seed:generate.");
}

const generatedTypes = execFileSync(
  "supabase",
  ["gen", "types", "typescript", "--local", "--schema", "public"],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
);
const committedTypes = readFileSync(typesPath, "utf8");
if (committedTypes !== generatedTypes) {
  throw new Error(
    "Generated Supabase types have drifted; run npm run db:types:generate after a clean reset."
  );
}

process.stdout.write("Supabase seed and generated database types are current.\n");
