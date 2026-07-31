import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest, per docs/build-pack/spec/16 §6: minimum 80% coverage on business
 * logic, no target on UI components.
 *
 * Deliberately excludes tests/visual — those are Playwright specs and would
 * be collected by Vitest otherwise, since both use .spec.ts.
 */
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: ["tests/visual/**", "node_modules/**"],
    environment: "node",
    coverage: {
      include: ["lib/control/**", "lib/quiz-sift.ts", "lib/lead-brief.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
