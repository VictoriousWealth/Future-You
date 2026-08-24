import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const clientRoot = resolve(".next/static/chunks");
const forbidden = [
  "simulateOneOffPurchase",
  "generateBaseline",
  "SLICE_1_RULES",
  "allocateGoalPool",
  "SarahV1ContextSource",
  "SupabaseSimulationRunStore"
] as const;

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".js") ? [path] : [];
  });
}

const violations = files(clientRoot).flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return forbidden.filter((identifier) => source.includes(identifier)).map(
    (identifier) => `${file}: ${identifier}`
  );
});

if (violations.length > 0) {
  throw new Error(`Server-only financial identifiers reached client chunks:\n${violations.join("\n")}`);
}

process.stdout.write("Built client chunks contain no server-only simulator/store identifiers.\n");
