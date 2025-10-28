// ESLint v9+ flat config for the server (Node.js)
// Docs: https://eslint.org/docs/latest/use/configure/migration-guide

const js = require("@eslint/js");

module.exports = [
  // Ignore generated/output folders
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "logs/**",
      "output/**",
      "public/**",
      "test/**",
    ]
  },

  // Start from eslint:recommended rules
  js.configs.recommended,

  // Project-specific settings and overrides
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        process: "readonly",
        Buffer: "readonly",
        // Node.js timers
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly"
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      // Keep strict undefined variable checking
      "no-undef": "error",
      // Allow prefix _ to intentionally ignore variables/args
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      // Allow console usage in this Node service
      "no-console": "off"
    }
  }
];