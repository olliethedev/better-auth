import { Command } from "commander";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db";
import { createJiti } from "jiti";
import chalk from "chalk";
import yoctoSpinner from "yocto-spinner";
import prompts from "prompts";
import fs from "fs/promises";
import path from "path";

interface MigrateOptions {
	config: string; // REQUIRED
	databaseUrl?: string; // Optional: for Kysely connection
	cwd?: string;
	yes?: boolean;
}

async function migrateAction(options: MigrateOptions) {
	console.log(chalk.blue("🔧 Better DB Migrate"));
	console.log(chalk.yellow("⚠️  Note: This only works with Kysely adapter"));
	console.log(chalk.gray("For Prisma: use `npx prisma migrate dev`"));
	console.log(chalk.gray("For Drizzle: use `npx drizzle-kit push`\n"));

	const cwd = options.cwd || process.cwd();
	const schemaPath = path.resolve(cwd, options.config);

	// 1. Validate schema file exists
	try {
		await fs.access(schemaPath);
	} catch {
		console.error(chalk.red(`❌ Schema file not found: ${schemaPath}`));
		console.log(chalk.yellow("Run `better-db init` to create one."));
		process.exit(1);
	}

	// 2. Load schema (same as generate)
	const jiti = createJiti(import.meta.url, {
		interopDefault: true,
	});

	let dbSchema: any;
	try {
		const schemaModule = jiti(schemaPath);
		dbSchema = schemaModule.default || schemaModule;
	} catch (error: any) {
		console.error(chalk.red("❌ Failed to load schema:"), error.message);
		process.exit(1);
	}

	if (!dbSchema?.toBetterAuthSchema) {
		console.error(chalk.red("❌ Invalid schema"));
		process.exit(1);
	}

	// 3. Convert to Better Auth format
	const betterAuthSchema = dbSchema.toBetterAuthSchema();

	// 4. Get database URL
	const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error(chalk.red("❌ Database connection required"));
		console.log(
			chalk.yellow("Set DATABASE_URL env var or use --database-url flag"),
		);
		process.exit(1);
	}

	// 5. Create betterAuth instance
	// Note: Using Kysely adapter for migrations
	const auth = betterAuth({
		database: {
			provider: databaseUrl.startsWith("postgres")
				? "pg"
				: databaseUrl.startsWith("mysql")
					? "mysql"
					: "sqlite",
			url: databaseUrl,
			type: "kysely",
		} as any, // Type override for Kysely config
		plugins: [
			{
				id: "better-db-schema",
				schema: betterAuthSchema,
			},
		],
	});

	// 6. Get migrations
	const spinner = yoctoSpinner({ text: "Preparing migrations..." });
	spinner.start();
	let toBeAdded: any[];
	let toBeCreated: any[];
	let runMigrations: () => Promise<void>;

	try {
		const migrations = await getMigrations(auth.options);
		toBeAdded = migrations.toBeAdded;
		toBeCreated = migrations.toBeCreated;
		runMigrations = migrations.runMigrations;
		spinner.stop();
	} catch (error: any) {
		spinner.stop();
		console.error(chalk.red("❌ Failed to prepare migrations:"), error.message);
		console.log(chalk.yellow("\nPossible causes:"));
		console.log("• Database connection failed");
		console.log("• Not using Kysely adapter");
		console.log("• Invalid DATABASE_URL");
		process.exit(1);
	}

	// 7. Show pending migrations
	if (toBeCreated.length === 0 && toBeAdded.length === 0) {
		console.log(chalk.gray("✓ Database is up to date."));
		return;
	}

	console.log(chalk.bold("\n📋 Pending migrations:"));
	if (toBeCreated.length > 0) {
		console.log(chalk.green(`  Tables to create: ${toBeCreated.length}`));
		toBeCreated.forEach((t) => console.log(chalk.gray(`    - ${t.table}`)));
	}
	if (toBeAdded.length > 0) {
		console.log(chalk.yellow(`  Columns to add: ${toBeAdded.length}`));
		toBeAdded.forEach((c) =>
			console.log(chalk.gray(`    - ${c.table}.${c.column}`)),
		);
	}

	// 8. Confirm
	if (!options.yes) {
		const response = await prompts({
			type: "confirm",
			name: "continue",
			message: "Run these migrations?",
			initial: true,
		});

		if (!response.continue) {
			console.log(chalk.yellow("Cancelled."));
			return;
		}
	}

	// 9. Run migrations
	const runSpinner = yoctoSpinner({ text: "Running migrations..." });
	runSpinner.start();
	try {
		await runMigrations();
		runSpinner.stop();
		console.log(chalk.green("✅ Migrations completed!"));
	} catch (error: any) {
		runSpinner.stop();
		console.error(chalk.red("❌ Migration failed:"), error.message);
		process.exit(1);
	}
}

// Command definition with REQUIRED options
export const migrateCommand = new Command("migrate")
	.description("Run database migrations (Kysely only)")
	.requiredOption("--config <path>", "Path to better-db schema file")
	.option(
		"--database-url <url>",
		"Database connection URL (or use DATABASE_URL env var)",
	)
	.option("--cwd <dir>", "Working directory", process.cwd())
	.option("-y, --yes", "Skip confirmation prompts")
	.action(migrateAction);
