module.exports = function (api) {
  const isCypressCoverage =
    process.env.CYPRESS_COVERAGE === "true" ||
    process.env.BABEL_ENV === "cypress";

  // Separate cache entries so Jest is never instrumented with istanbul.
  api.cache.using(() => (isCypressCoverage ? "cypress-coverage" : "default"));

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
