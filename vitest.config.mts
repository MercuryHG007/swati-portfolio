import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors the "@/*" path alias from tsconfig.json.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${fileURLToPath(new URL("./src", import.meta.url))}/` }],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
