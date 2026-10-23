import { createRequire } from "node:module";
import nextJest from "next/jest.js";

const require = createRequire(import.meta.url);

const createJestConfig = nextJest({ dir: "./" });

const config = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  moduleNameMapper: {
    "^server-only$": require.resolve("server-only"),
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  clearMocks: true,
};

export default createJestConfig(config);
