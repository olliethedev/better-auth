import { Command } from "commander";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { getAdapter } from "better-auth/db";
import { createJiti } from "jiti";
import chalk from "chalk";
import yoctoSpinner from "yocto-spinner";
import prompts from "prompts";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { filterAuthTables } from "../utils/filter-auth-tables";

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

	// 5. Create betterAuth instance with schema
	const auth = betterAuth({
		database: memoryAdapter({}),
		plugins: [
			{
				id: "better-db-schema",
				schema: betterAuthSchema,
			},
		],
	});

	const adapter = await getAdapter(auth.options);

	// 6. Import generators dynamically (to avoid TypeScript rootDir issues)
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const cliGeneratorsPath = path.resolve(
		__dirname,
		"../../../../cli/src/generators",
	);

	// 7. Generate based on explicit ORM parameter
	const spinner = yoctoSpinner({
		text: `Generating ${options.orm} schema...`,
	}).start();

	let result: any;
	try {
		if (options.orm === "prisma") {
			const { generatePrismaSchema } = await import(
				path.join(cliGeneratorsPath, "prisma.js")
			);
			result = await generatePrismaSchema({
				adapter,
				options: auth.options,
				file: outputPath,
			});
		} else if (options.orm === "drizzle") {
			const { generateDrizzleSchema } = await import(
				path.join(cliGeneratorsPath, "drizzle.js")
			);
			result = await generateDrizzleSchema({
				adapter,
				options: auth.options,
				file: outputPath,
			});
		} else if (options.orm === "kysely") {
			const { generateMigrations } = await import(
				path.join(cliGeneratorsPath, "kysely.js")
			);
			result = await generateMigrations({
				adapter,
				options: auth.options,
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
