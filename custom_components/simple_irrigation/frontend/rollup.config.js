import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/simple-irrigation-panel.ts",
  output: {
    file: "dist/simple-irrigation-panel.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [nodeResolve({ extensions: [".ts", ".js"] }), typescript({ tsconfig: "./tsconfig.json" })],
};
