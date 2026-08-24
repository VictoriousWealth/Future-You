import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next/**", "coverage/**", "node_modules/**", "playwright-report/**", "test-results/**"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/app/**", "**/application/**", "**/fixtures/**", "**/infrastructure/**", "**/server/**", "**/ui/**"],
              message: "The deterministic domain may only depend on domain modules and the standard library."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/application/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/app/**", "**/fixtures/**", "**/infrastructure/**", "**/server/**", "**/ui/**"],
              message: "Application code may depend on ports and domain code, never concrete adapters or UI."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/domain/**",
                "**/fixtures/**",
                "**/infrastructure/**",
                "**/server/**",
                "**/application/use-cases/**",
                "**/application/mappers/**"
              ],
              message: "Browser UI must render application DTOs and must not import financial domain logic."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["tests/e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off"
    }
  }
);
