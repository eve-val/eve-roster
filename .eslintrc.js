module.exports = {
  root: true,
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    project: "./tsconfig.eslint.json",
    extraFileExtensions: [".vue"],
  },
  plugins: [
    "@typescript-eslint",
    "jest",
    "eslint-plugin-vue",
    "eslint-plugin-prettier-vue",
  ],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:jest/recommended",
    "plugin:vue/vue3-recommended",
    "plugin:prettier/recommended",
    "eslint:recommended",
  ],
  rules: {
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-redeclare": "off",
    "no-dupe-class-members": "off",
  },
  env: {
    browser: true,
    node: true,
  },
};
