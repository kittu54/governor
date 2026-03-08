import nextConfig from "eslint-config-next";

// eslint-plugin-react@7.x uses getFilename() which was removed in ESLint v10.
// Disable all react/ rules (not react-hooks/) until a compatible version ships.
const reactRuleOverrides = Object.fromEntries(
  [
    "react/display-name",
    "react/jsx-key",
    "react/jsx-no-comment-textnodes",
    "react/jsx-no-duplicate-props",
    "react/jsx-no-target-blank",
    "react/jsx-no-undef",
    "react/jsx-uses-react",
    "react/jsx-uses-vars",
    "react/no-children-prop",
    "react/no-danger-with-children",
    "react/no-deprecated",
    "react/no-direct-mutation-state",
    "react/no-find-dom-node",
    "react/no-is-mounted",
    "react/no-render-return-value",
    "react/no-string-refs",
    "react/no-unescaped-entities",
    "react/no-unknown-property",
    "react/no-unsafe",
    "react/prop-types",
    "react/react-in-jsx-scope",
    "react/require-render-return",
  ].map((rule) => [rule, "off"])
);

export default [
  ...nextConfig,
  {
    rules: reactRuleOverrides,
  },
];
