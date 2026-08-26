import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const environment = { ...process.env };
const openAISecretName = ["OPENAI", "API", "KEY"].join("_");

// Next.js loads .env files during compilation. Defining the server credential as
// empty prevents dotenv from copying the runtime-only value into Turbopack caches.
environment[openAISecretName] = "";

const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  { cwd: process.cwd(), env: environment, stdio: "inherit" }
);

if (result.error) {
  process.stderr.write("The production build could not be started.\n");
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
