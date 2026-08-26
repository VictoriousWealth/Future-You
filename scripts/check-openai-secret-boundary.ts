import nextEnvironment from "@next/env";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";

nextEnvironment.loadEnvConfig(process.cwd());

const environment = process.env;
const secretName = ["OPENAI", "API", "KEY"].join("_");
const configuredKey = environment[secretName]?.trim() || null;

function trackedFiles(): readonly string[] {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
}

function repositoryFiles(): readonly string[] {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" }
  ).split("\0").filter(Boolean);
}

function filesBelow(root: string): readonly string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = `${directory}/${entry}`;
      if (statSync(path).isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(root);
  return files;
}

function includesConfiguredKey(files: readonly string[]): boolean {
  if (!configuredKey) return false;
  const bytes = Buffer.from(configuredKey);
  return files.some((file) => {
    try {
      return readFileSync(file).includes(bytes);
    } catch {
      return false;
    }
  });
}

const tracked = trackedFiles();
const repository = repositoryFiles();
const generated = filesBelow(".next");
const client = filesBelow(".next/static");
function isLocalEnvironmentIgnored(): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", ".env.local"]);
    return true;
  } catch {
    return false;
  }
}
const localEnvironmentIgnored = isLocalEnvironmentIgnored();
const trackedLeak = includesConfiguredKey(tracked);
const repositoryLeak = includesConfiguredKey(repository);
const generatedLeak = includesConfiguredKey(generated);
const clientLeak = includesConfiguredKey(client);

process.stdout.write([
  `Secret file ignored: ${localEnvironmentIgnored ? "yes" : "no"}`,
  `Configured key in tracked files: ${trackedLeak ? "yes" : "no"}`,
  `Configured key in repository files: ${repositoryLeak ? "yes" : "no"}`,
  `Configured key in generated artifacts: ${generatedLeak ? "yes" : "no"}`,
  `Configured key in client bundle: ${clientLeak ? "yes" : "no"}`
].join("\n") + "\n");

if (!localEnvironmentIgnored || trackedLeak || repositoryLeak || generatedLeak || clientLeak) process.exitCode = 1;
