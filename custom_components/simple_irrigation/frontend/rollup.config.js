import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read version from VERSION file in project root
const versionPath = resolve("../../../VERSION");
const version = readFileSync(versionPath, "utf-8").trim();

export default {
  input: "src/simple-irrigation-panel.ts",
  output: {
    file: "dist/simple-irrigation-panel.js",
    format: "es",
    sourcemap: true,
  },
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
};
