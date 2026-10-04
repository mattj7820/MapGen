import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    passWithNoTests: true,
    // Rendering tests are CPU-heavy; leave room for a busy machine.
    testTimeout: 20000,
  },
});
