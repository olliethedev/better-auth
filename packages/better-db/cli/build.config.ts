import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/index"],
  externals: ["@better-auth/cli", "@better-db/core"],
  declaration: true,
  rollup: {
    emitCJS: false,
  },
});