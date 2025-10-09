import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index"],
	externals: [
		"@better-db/core",
		"better-auth",
		"kysely",
		"drizzle-orm",
		"@prisma/client",
	],
	declaration: true,
	rollup: {
		emitCJS: false,
	},
});
