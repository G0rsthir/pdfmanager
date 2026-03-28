import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "http://localhost:5173/api/v1/openapi.json",
  output: {
    path: "./src/api",
    indexFile: false,
    postProcess: ["eslint", "prettier"],
  },
  plugins: [
    "@hey-api/schemas",
    {
      dates: true,
      name: "@hey-api/transformers",
    },
    {
      enums: "javascript",
      name: "@hey-api/typescript",
    },
    "zod",
    {
      name: "@hey-api/sdk",
      transformer: true,
      validator: true,
    },
    "@tanstack/react-query",
  ],
});
