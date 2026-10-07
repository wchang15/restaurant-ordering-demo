import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  // These verification scripts intentionally use Node's CommonJS module format.
  { files: ["scripts/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  globalIgnores([".next/**", ".test-build/**", "out/**", "build/**", "next-env.d.ts"]),
]);
