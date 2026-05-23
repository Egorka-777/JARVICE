module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "react"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "prettier",
  ],
  settings: {
    react: { version: "detect" },
  },
  ignorePatterns: ["dist", "node_modules", "src-tauri/target", "automation"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "react/prop-types": "off",
  },
};
