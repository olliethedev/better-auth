import { Command } from "commander";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import yoctoSpinner from "yocto-spinner";
import prompts from "prompts";
import fs from "fs/promises";
import path from "path";
import { filterAuthTables } from "../utils/filter-auth-tables";
import type { BetterAuthOptions } from "better-auth";
import { logger } from "../utils/logger";
import {
	createDatabaseConnection,
	createBetterAuthInstance,
} from "../utils/database";
import { loadBetterDbSchema } from "../utils/schema-loader";

// Import generators from @better-auth/cli package
import {
	generatePrismaSchema,
	generateDrizzleSchema,
	generateMigrations,
} from "@better-auth/cli/generators";

interface GenerateOptions {
	config: string; // REQUIRED
	output: string; // REQUIRED
	orm: "prisma" | "drizzle" | "kysely"; // REQUIRED
	cwd?: string;
	yes?: boolean;
	filterAuth?: boolean; // Filter out Better Auth default tables
}

async function generateAction(options: GenerateOptions) {
	logger.info("🔧 Better DB Generate");

	const cwd = options.cwd || process.cwd();
	const schemaPath = path.resolve(cwd, options.config);
	const outputPath = path.resolve(cwd, options.output);

	let cleanup: (() => Promise<void>) | null = null;

	try {
		// 1. Load and validate schema
		const dbSchema = await loadBetterDbSchema(schemaPath);

		// 2. Convert to Better Auth format
		const betterAuthSchema = dbSchema.toBetterAuthSchema();

		// 3. Create appropriate adapter based on ORM
		let adapter: any;
		let auth: any; // For Kysely, we need the betterAuth instance

		if (options.orm === "prisma") {
			// Prisma generator needs adapter.id = "prisma" and provider
			adapter = prismaAdapter(
				{},
				{ provider: "postgresql" },
			)({} as BetterAuthOptions);
		} else if (options.orm === "drizzle") {
			// Drizzle generator needs adapter.id = "drizzle" and provider
			adapter = drizzleAdapter(
				{},
				{ provider: "pg", schema: {} },
			)({} as BetterAuthOptions);
		} else if (options.orm === "kysely") {
			// Kysely needs real database connection for introspection
			const databaseUrl = process.env.DATABASE_URL;
			if (!databaseUrl) {
				logger.error("Kysely generation requires DATABASE_URL env var");
				logger.info(
					"\nExample:\n  DATABASE_URL=sqlite:./dev.db npx better-db generate ...",
				);
				process.exit(1);
			}

			// Create database connection
			const { database, cleanup: dbCleanup } =
				await createDatabaseConnection(databaseUrl);
			cleanup = dbCleanup;

			// Create betterAuth instance with real DB for introspection
			auth = createBetterAuthInstance(database, betterAuthSchema);

			// For Kysely, we use auth.options directly (not the adapter)
			adapter = null;
		}

		// 4. Create options with schema
		const generatorOptions = {
			database: adapter,
			plugins: [
				{
					id: "better-db-schema",
					schema: betterAuthSchema,
				},
			],
		};

		// 5. Generate based on explicit ORM parameter
		const spinner = yoctoSpinner({
			text: `Generating ${options.orm} schema...`,
		}).start();

		let result: any;
		try {
			if (options.orm === "prisma") {
				result = await generatePrismaSchema({
					adapter,
					options: generatorOptions,
					file: outputPath,
				});
			} else if (options.orm === "drizzle") {
				result = await generateDrizzleSchema({
					adapter,
					options: generatorOptions,
					file: outputPath,
				});
			} else if (options.orm === "kysely") {
				// For Kysely, pass auth.options directly (not the adapter)
				result = await generateMigrations({
					adapter: null as any,
					options: auth.options,
					file: outputPath,
				});
			}

			spinner.stop();
		} catch (error: any) {
			spinner.stop();
			logger.error("Generation failed:", error.message);
			logger.error(error.stack);
			process.exit(1);
		}

		// 6. Handle output
		if (!result?.code) {
			logger.info("Schema is up to date.");
			return;
		}

		// 7. Filter auth tables if requested
		if (options.filterAuth && result.code) {
			result.code = filterAuthTables(result.code, options.orm);
			logger.info(
				"🧹 Filtered out Better Auth default tables (User, Session, etc.)",
			);
		}

		// 8. Prompt if overwriting (unless --yes)
		if (result.overwrite && !options.yes) {
			const response = await prompts({
				type: "confirm",
				name: "continue",
				message: `File ${outputPath} already exists. Overwrite?`,
				initial: false,
			});

			if (!response.continue) {
				logger.warn("Cancelled.");
				return;
			}
		}

		// 9. Write output
		await fs.writeFile(outputPath, result.code, "utf8");
		logger.success(`✅ Generated ${options.orm} schema: ${outputPath}`);

		// 10. Show next steps
		logger.info("\nNext steps:");
		if (options.orm === "prisma") {
			logger.info("  1. Review the generated schema");
			logger.info("  2. Run: npx prisma migrate dev");
		} else if (options.orm === "drizzle") {
			logger.info("  1. Review the generated schema");
			logger.info("  2. Run: npx drizzle-kit push");
		} else if (options.orm === "kysely") {
			logger.info("  1. Review the generated migrations");
			logger.info("  2. Apply migrations using your migration runner");
		}
	} finally {
		// 11. Cleanup: Close database connection
		if (cleanup) {
			await cleanup();
		}
	}
}

// Command definition with REQUIRED options
export const generateCommand = new Command("generate")
	.description("Generate database schema files for your ORM")
	.requiredOption("--config <path>", "Path to better-db schema file")
	.requiredOption("--output <path>", "Output path for generated schema")
	.requiredOption("--orm <orm>", "Target ORM: prisma, drizzle, or kysely")
	.option("--cwd <dir>", "Working directory", process.cwd())
	.option("-y, --yes", "Skip confirmation prompts")
	.option(
		"--filter-auth",
		"Filter out Better Auth default tables (User, Session, etc.)",
	)
	.action(generateAction);
