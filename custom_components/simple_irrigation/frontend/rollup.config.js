import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read version from VERSION file in project root
const versionPath = resolve("../../../VERSION");
const version = readFileSync(versionPath, "utf-8").trim();

const makeConfig = (input, file) => ({
  input,
  output: { file, format: "es", sourcemap: true },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        // Replace __VERSION__ placeholder with actual version
        "__VERSION__": `"${version}"`,
      },
    }),
    nodeResolve({ extensions: [".ts", ".js"] }),
    typescript({ tsconfig: "./tsconfig.json" }),
  ],
});

export default [
  makeConfig("src/simple-irrigation-panel.ts", "dist/simple-irrigation-panel.js"),
  makeConfig("src/simple-irrigation-card.ts", "dist/simple-irrigation-card.js"),
];
