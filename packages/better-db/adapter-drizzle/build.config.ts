import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index"],
	externals: [
		"better-auth",
		"@better-auth/core",
		"@better-db/core",
		"drizzle-orm",
	],
	declaration: true,
	rollup: {
		emitCJS: true,
	},
});
