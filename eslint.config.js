import globals from "globals";

export default [
  { ignores: ["node_modules/**", "assets/**", "docs/**", "test-results/**", "playwright-report/**"] },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, Phaser: "readonly" },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none" }],
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },
  {
    files: ["*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
