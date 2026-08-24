import nextEnvironment from "@next/env";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

nextEnvironment.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/helpers/server-only.ts", import.meta.url))
    }
  },
  test: {
    include: ["tests/integration/**/*.integration.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
});
