// Builds src/parity.ts alone, for tests/test_frontend_parity.py. Not part of
// `npm run build`: nothing of this reaches the panel or the card.
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/parity.ts",
  output: { file: ".parity/parity.mjs", format: "es" },
  // Left to Node, which picks lit's build that needs no browser.
  external: [/^lit($|\/)/],
  plugins: [nodeResolve({ extensions: [".ts", ".js"] }), typescript({ tsconfig: "./tsconfig.json" })],
  onwarn(warning, warn) {
    if (warning.code !== "CIRCULAR_DEPENDENCY") warn(warning);
  },
};
