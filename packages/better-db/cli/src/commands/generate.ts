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

// Import generators from local copy (bundled with our package)
import { generatePrismaSchema } from "../generators/prisma";
import { generateDrizzleSchema } from "../generators/drizzle";
import { generateMigrations } from "../generators/kysely";

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

		// Create betterAuth instance with real DB for introspection
		const auth = betterAuth({
			database: {
				provider: databaseUrl.startsWith("postgres")
					? "pg"
					: databaseUrl.startsWith("mysql")
						? "mysql"
						: "sqlite",
				url: databaseUrl,
				type: "kysely",
			} as any,
			plugins: [
				{
					id: "better-db-schema",
					schema: betterAuthSchema,
				},
			],
		});

		// For Kysely, we need the adapter from getAdapter (has DB connection)
		const { getAdapter } = await import("better-auth/db");
		adapter = await getAdapter(auth.options);
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
			result = await generateMigrations({
				adapter,
				options: generatorOptions,
				file: outputPath,
			});
		}

		spinner.stop();
	} catch (error: any) {
		spinner.stop();
		console.error(chalk.red("❌ Generation failed:"), error.message);
		console.error(error.stack);
		process.exit(1);
	}

	// 8. Handle output
	if (!result?.code) {
		console.log(chalk.gray("Schema is up to date."));
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
