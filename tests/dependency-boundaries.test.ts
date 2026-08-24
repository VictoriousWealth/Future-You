import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve("src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx)$/.test(path)
        ? [path]
        : [];
  });
}

function importsIn(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)].map(
    (match) => match[1] ?? ""
  );
}

function resolvedImport(file: string, imported: string): string | null {
  return imported.startsWith(".") ? resolve(file, "..", imported) : null;
}

function isInside(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}${sep}`);
}

describe("automated dependency-direction enforcement", () => {
  it("domain imports stay inside the domain", () => {
    const violations = sourceFiles(join(SOURCE_ROOT, "domain")).flatMap((file) =>
      importsIn(file)
        .map((imported) => resolvedImport(file, imported))
        .filter((imported): imported is string => imported !== null)
        .filter((imported) => !isInside(imported, join(SOURCE_ROOT, "domain")))
        .map((imported) => `${relative(SOURCE_ROOT, file)} -> ${relative(SOURCE_ROOT, imported)}`)
    );
    expect(violations).toEqual([]);
  });

  it("application imports no concrete adapter, server, app, fixture, or UI code", () => {
    const forbidden = ["app", "fixtures", "infrastructure", "server", "ui"].map((part) =>
      join(SOURCE_ROOT, part)
    );
    const violations = sourceFiles(join(SOURCE_ROOT, "application")).flatMap((file) =>
      importsIn(file)
        .map((imported) => resolvedImport(file, imported))
        .filter((imported): imported is string => imported !== null)
        .filter((imported) => forbidden.some((root) => isInside(imported, root)))
        .map((imported) => `${relative(SOURCE_ROOT, file)} -> ${relative(SOURCE_ROOT, imported)}`)
    );
    expect(violations).toEqual([]);
  });

  it("browser UI imports DTO contracts but no simulator, fixture, infrastructure, or server code", () => {
    const uiFiles = sourceFiles(join(SOURCE_ROOT, "ui"));
    const forbidden = ["domain", "fixtures", "infrastructure", "server"].map((part) =>
      join(SOURCE_ROOT, part)
    );
    const violations = uiFiles.flatMap((file) =>
      importsIn(file)
        .map((imported) => resolvedImport(file, imported))
        .filter((imported): imported is string => imported !== null)
        .filter((imported) => forbidden.some((root) => isInside(imported, root)))
        .map((imported) => `${relative(SOURCE_ROOT, file)} -> ${relative(SOURCE_ROOT, imported)}`)
    );
    expect(violations).toEqual([]);
    expect(uiFiles.some((file) => readFileSync(file, "utf8").includes("application/dto/contracts"))).toBe(
      true
    );

    const unsafeApplicationImports = uiFiles.flatMap((file) =>
      importsIn(file)
        .filter((imported) =>
          imported.includes("application/use-cases") || imported.includes("application/mappers")
        )
        .map((imported) => `${relative(SOURCE_ROOT, file)} -> ${imported}`)
    );
    expect(unsafeApplicationImports).toEqual([]);
  });

  it("browser UI contains no bigint or simulator invocation", () => {
    const combined = sourceFiles(join(SOURCE_ROOT, "ui"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(combined).not.toMatch(/\bBigInt\b|\bbigint\b/);
    expect(combined).not.toMatch(/generateBaseline|simulateOneOffPurchase|allocateGoalPool/);
    expect(combined).not.toMatch(/\.minorUnits\b|\.minimumBufferRatio\b|\.delayMonths\b/);
  });

  it("Route Handlers remain thin and do not import domain or fixtures directly", () => {
    const routeFiles = sourceFiles(join(SOURCE_ROOT, "app", "api"));
    const violations = routeFiles.flatMap((file) =>
      importsIn(file)
        .map((imported) => resolvedImport(file, imported))
        .filter((imported): imported is string => imported !== null)
        .filter(
          (imported) =>
            isInside(imported, join(SOURCE_ROOT, "domain")) ||
            isInside(imported, join(SOURCE_ROOT, "fixtures")) ||
            isInside(imported, join(SOURCE_ROOT, "infrastructure"))
        )
        .map((imported) => `${relative(SOURCE_ROOT, file)} -> ${relative(SOURCE_ROOT, imported)}`)
    );
    expect(violations).toEqual([]);
    const rawJsonViolations = routeFiles
      .filter((file) => /(?:Response|NextResponse)\.json\s*\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(SOURCE_ROOT, file));
    expect(rawJsonViolations).toEqual([]);
  });

  it("production request paths use authenticated Supabase adapters and never the Slice 2 stores", () => {
    const routeFiles = sourceFiles(join(SOURCE_ROOT, "app", "api"));
    const routeViolations = routeFiles
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return !source.includes("authenticated-route") || source.includes("slice-2-application");
      })
      .map((file) => relative(SOURCE_ROOT, file));
    expect(routeViolations).toEqual([]);

    const composition = readFileSync(
      join(SOURCE_ROOT, "server", "authenticated-application.ts"),
      "utf8"
    );
    expect(composition).toContain("SupabaseFinancialContextSource");
    expect(composition).toContain("SupabaseSimulationRunStore");
    expect(composition).not.toMatch(/SarahV1ContextSource|InMemorySimulationRunStore/);
  });

  it("ordinary request code has no service-role credential or RLS-bypass path", () => {
    const productionFiles = [
      ...sourceFiles(join(SOURCE_ROOT, "app")),
      ...sourceFiles(join(SOURCE_ROOT, "server")),
      ...sourceFiles(join(SOURCE_ROOT, "infrastructure"))
    ];
    const violations = productionFiles
      .filter((file) =>
        /SUPABASE_SERVICE_ROLE_KEY|service[_-]?role|bypassrls/i.test(readFileSync(file, "utf8"))
      )
      .map((file) => relative(SOURCE_ROOT, file));
    expect(violations).toEqual([]);
  });

  it("server identity is verified from claims and request clients are not global singletons", () => {
    const principalProvider = readFileSync(
      join(SOURCE_ROOT, "infrastructure", "auth", "supabase-principal-provider.ts"),
      "utf8"
    );
    expect(principalProvider).toContain("auth.getClaims()");
    expect(principalProvider).not.toMatch(/auth\.getSession\(|browser.*user.?id/i);

    const authenticatedComposition = readFileSync(
      join(SOURCE_ROOT, "server", "authenticated-application.ts"),
      "utf8"
    );
    expect(authenticatedComposition).toMatch(
      /resolveAuthenticatedApplication[^=]*= async \(\) =>[\s\S]*createRequestSupabaseClient\(\)/
    );
  });
});
