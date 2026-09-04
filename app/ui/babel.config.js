module.exports = function (api) {
  // Never instrument under Jest — CI must not export CYPRESS_COVERAGE/BABEL_ENV
  // for the whole job or istanbul will inflate/break the Jest coverage gate.
  const isJest = Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === "test";
  const isCypressCoverage =
    !isJest &&
    (process.env.CYPRESS_COVERAGE === "true" ||
      process.env.BABEL_ENV === "cypress");

  // Separate cache entries so Jest is never instrumented with istanbul.
  api.cache.using(() =>
    isJest ? "jest" : isCypressCoverage ? "cypress-coverage" : "default",
  );

  return {
    presets: [
      ["babel-preset-expo", { unstable_transformImportMeta: true }],
      "nativewind/babel",
    ],

    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],

          alias: {
            "@": "./",
            "tailwind.config": "./tailwind.config.js",
          },
        },
      ],
      "react-native-worklets/plugin",
      ...(isCypressCoverage
        ? [
            [
              "istanbul",
              {
                exclude: [
                  "**/cypress/**",
                  "**/__tests__/**",
                  "**/__mocks__/**",
                  "**/node_modules/**",
                  "**/coverage/**",
                  "**/coverage-*/**",
                  "**/scripts/**",
                  "**/.expo/**",
                ],
              },
            ],
          ]
        : []),
    ],
  };
};
