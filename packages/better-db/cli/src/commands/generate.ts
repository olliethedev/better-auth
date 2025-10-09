import { Command } from "commander";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createJiti } from "jiti";
import chalk from "chalk";
import yoctoSpinner from "yocto-spinner";
import prompts from "prompts";
import fs from "fs/promises";
import path from "path";
import { filterAuthTables } from "../utils/filter-auth-tables";
import type { BetterAuthOptions } from "better-auth";

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
	filterAuth?: boolean; // NEW: Filter out Better Auth default tables
}

async function generateAction(options: GenerateOptions) {
	console.log(chalk.blue("🔧 Better DB Generate"));

	const cwd = options.cwd || process.cwd();
	const schemaPath = path.resolve(cwd, options.config);
	const outputPath = path.resolve(cwd, options.output);

	// 1. Validate schema file exists
	try {
		await fs.access(schemaPath);
	} catch {
		console.error(chalk.red(`❌ Schema file not found: ${schemaPath}`));
		console.log(chalk.yellow("Run `better-db init` to create one."));
		process.exit(1);
	}

	// 2. Load schema with jiti (handles TypeScript)
	const jiti = createJiti(import.meta.url, {
		interopDefault: true,
	});

	let dbSchema: any;
	try {
		const schemaModule = jiti(schemaPath);
		dbSchema = schemaModule.default || schemaModule;
	} catch (error: any) {
		console.error(chalk.red("❌ Failed to load schema:"), error.message);
		console.log(chalk.yellow("\nTroubleshooting:"));
		console.log("• Check for syntax errors in schema file");
		console.log("• Ensure file exports defineDb() result");
		process.exit(1);
	}

	// 3. Validate it's a better-db schema
	if (!dbSchema?.toBetterAuthSchema) {
		console.error(
			chalk.red("❌ Invalid schema: must export defineDb() result"),
		);
		process.exit(1);
	}

	// 4. Convert to Better Auth format
	const betterAuthSchema = dbSchema.toBetterAuthSchema();

	// 5. Create appropriate adapter based on ORM
	// Each generator needs the correct adapter type and provider
	let adapter: any;
	let auth: any; // For Kysely, we need the betterAuth instance
	let connectionPool: any = null; // Track pool for cleanup (MySQL/PostgreSQL)

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
			console.error(
				chalk.red("❌ Kysely generation requires DATABASE_URL env var"),
			);
			console.log(
				chalk.yellow(
					"\nExample:\n  DATABASE_URL=sqlite:./dev.db npx better-db generate ...",
				),
			);
			process.exit(1);
		}

		// Create Kysely database instance based on URL
		let database: any;

		try {
			if (
				databaseUrl.startsWith("postgres://") ||
				databaseUrl.startsWith("postgresql://")
			) {
				// PostgreSQL - create Kysely instance with PostgresDialect
				const { Kysely, PostgresDialect } = await import("kysely");
				const { Pool } = await import("pg");
				const pool = new Pool({ connectionString: databaseUrl });
				connectionPool = pool; // Store for cleanup
				const kysely = new Kysely({
					dialect: new PostgresDialect({
						pool: pool,
					}),
				});
				database = { db: kysely, type: "postgres" };
			} else if (databaseUrl.startsWith("mysql://")) {
				// MySQL - create Kysely instance with MysqlDialect
				const { Kysely, MysqlDialect } = await import("kysely");
				const { createPool } = await import("mysql2/promise");
				const pool = createPool(databaseUrl);
				connectionPool = pool; // Store for cleanup
				const kysely = new Kysely({
					dialect: new MysqlDialect(pool),
				});
				database = { db: kysely, type: "mysql" };
			} else {
				// SQLite - pass raw database, Kysely will wrap it
				const Database = (await import("better-sqlite3")).default;
				// Extract file path from URL (e.g., "sqlite:./dev.db" -> "./dev.db")
				const dbPath = databaseUrl.replace(/^sqlite:/, "");
				database = new Database(dbPath);
			}
		} catch (error: any) {
			if (error.code === "ERR_MODULE_NOT_FOUND") {
				console.error(chalk.red("❌ Missing database driver dependency"));
				if (
					databaseUrl.startsWith("postgres://") ||
					databaseUrl.startsWith("postgresql://")
				) {
					console.log(
						chalk.yellow("\nInstall PostgreSQL driver:\n  npm install pg"),
					);
				} else if (databaseUrl.startsWith("mysql://")) {
					console.log(
						chalk.yellow("\nInstall MySQL driver:\n  npm install mysql2"),
					);
				} else {
					console.log(
						chalk.yellow(
							"\nInstall SQLite driver:\n  npm install better-sqlite3",
						),
					);
				}
				process.exit(1);
			}
			throw error;
		}

		// Create betterAuth instance with real DB for introspection
		auth = betterAuth({
			database,
			plugins: [
				{
					id: "better-db-schema",
					schema: betterAuthSchema,
				},
			],
		});

		// For Kysely, we can use auth.options directly
		// No need to get the adapter separately
		adapter = null; // Will use auth.options directly for Kysely
	}

	// 6. Create options with schema
	const generatorOptions = {
		database: adapter,
		plugins: [
			{
				id: "better-db-schema",
				schema: betterAuthSchema,
			},
		],
	};

	// 6. Generate based on explicit ORM parameter
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
		console.error(chalk.red("❌ Generation failed:"), error.message);
		console.error(error.stack);
		// Cleanup before exiting
		if (connectionPool) {
			await connectionPool.end();
		}
		process.exit(1);
	}

	// 8. Handle output
	if (!result?.code) {
		console.log(chalk.gray("Schema is up to date."));
		// Cleanup before returning
		if (connectionPool) {
			await connectionPool.end();
		}
		return;
	}

	// 9. Filter auth tables if requested
	if (options.filterAuth && result.code) {
		result.code = filterAuthTables(result.code, options.orm);
		console.log(
			chalk.gray(
				"🧹 Filtered out Better Auth default tables (User, Session, etc.)",
			),
		);
	}

	// 10. Prompt if overwriting (unless --yes)
	if (result.overwrite && !options.yes) {
		const response = await prompts({
			type: "confirm",
			name: "continue",
			message: `File ${outputPath} already exists. Overwrite?`,
			initial: false,
		});

		if (!response.continue) {
			console.log(chalk.yellow("Cancelled."));
			// Cleanup before returning
			if (connectionPool) {
				await connectionPool.end();
			}
			return;
		}
	}

	// 11. Write output
	await fs.writeFile(outputPath, result.code, "utf8");
	console.log(chalk.green(`✅ Generated ${options.orm} schema: ${outputPath}`));

	// 12. Show next steps
	console.log(chalk.gray("\nNext steps:"));
	if (options.orm === "prisma") {
		console.log(chalk.gray("  1. Review the generated schema"));
		console.log(chalk.gray("  2. Run: npx prisma migrate dev"));
	} else if (options.orm === "drizzle") {
		console.log(chalk.gray("  1. Review the generated schema"));
		console.log(chalk.gray("  2. Run: npx drizzle-kit push"));
	} else if (options.orm === "kysely") {
		console.log(chalk.gray("  1. Review the generated migrations"));
		console.log(
			chalk.gray("  2. Apply migrations using your migration runner"),
		);
	}

	// 13. Cleanup: Close database connection pool
	if (connectionPool) {
		await connectionPool.end();
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
