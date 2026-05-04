import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["electron/**/*.test.js", "src/**/*.test.js"],
    exclude: ["node_modules", "dist", "release"],
  },
});
