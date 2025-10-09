import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index"],
	externals: ["better-auth", "@better-auth/core", "@better-db/core", "mongodb"],
	declaration: true,
	rollup: {
		emitCJS: true,
	},
});
