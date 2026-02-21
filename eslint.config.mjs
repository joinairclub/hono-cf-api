import baseConfig from "@hono/eslint-config";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*", "../*"],
              message: "Use @/... absolute imports for internal modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "zod",
              message: "Import feature/shared schemas instead of defining Zod schemas in feature tests.",
            },
          ],
          patterns: [
            {
              group: ["./*", "../*"],
              message: "Use @/... absolute imports for internal modules.",
            },
          ],
        },
      ],
    },
  },
];
