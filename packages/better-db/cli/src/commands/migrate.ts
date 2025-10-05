import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

interface MigrateOptions {
	cwd: string;
	config?: string;
	y?: boolean;
	yes?: boolean;
}

async function migrateAction(options: MigrateOptions) {
	try {
		console.log(chalk.blue("🔧 Better DB Migrate"));
		console.log(
			chalk.gray(
				"Running migrations for database schema (Kysely adapter only)...",
			),
		);

		// Validate that we have a better-db schema file
		const schemaPath = options.config || path.join(options.cwd, "db.ts");

		if (!(await fileExists(schemaPath))) {
			console.error(chalk.red(`Schema file not found: ${schemaPath}`));
			console.log(
				chalk.yellow("Run `better-db init` to create a schema file first."),
			);
			return;
		}

		// Create a temporary Better Auth config
		const tempConfigPath = await createTempBetterAuthConfig(
			schemaPath,
			options.cwd,
		);

		try {
			// Forward to Better Auth CLI migrate command
			const baArgs = buildBetterAuthArgs(tempConfigPath, options);

			console.log(chalk.gray(`Running: npx ${baArgs.join(" ")}`));

			// Use spawn to properly handle stdin/stdout/stderr
			await new Promise<void>((resolve, reject) => {
				const child = spawn("npx", baArgs, {
					cwd: options.cwd,
					env: { ...process.env, NODE_ENV: "development" },
					stdio: "inherit", // This allows prompts to work!
				});

				child.on("close", (code) => {
					if (code === 0) {
						console.log(chalk.green("\n✅ Migration completed!"));
						resolve();
					} else {
						reject(new Error(`Better Auth CLI exited with code ${code}`));
					}
				});

				child.on("error", (error) => {
					reject(error);
				});
			});
		} finally {
			// Clean up temp file
			await fs.unlink(tempConfigPath).catch(() => {});
		}
	} catch (error: any) {
		console.error(chalk.red("❌ Migration failed:"), error.message);
		process.exit(1);
	}
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function createTempBetterAuthConfig(
	schemaPath: string,
	cwd: string,
): Promise<string> {
	const tempConfigContent = `
import { betterAuth } from "better-auth";
import { defineDb } from "@better-db/core";

// Import the better-db schema
const dbSchema = require("${path.resolve(schemaPath)}");

// Extract the schema and convert to Better Auth format
const schema = dbSchema.default || dbSchema;
let betterAuthSchema = {};

if (schema && typeof schema.getSchema === 'function') {
  betterAuthSchema = schema.getSchema();
} else if (schema && typeof schema.toBetterAuthSchema === 'function') {
  betterAuthSchema = schema.toBetterAuthSchema();
}

// Create a minimal Better Auth config with just the database tables
export const auth = betterAuth({
  // Minimal config - no auth features, just database
  database: {
    type: "sqlite", // This will be overridden by the adapter
  },
  // Convert better-db schema to plugin format
  plugins: [{
    id: "better-db-schema",
    schema: betterAuthSchema
  }]
});

export default auth;
`;

	const tempConfigPath = path.join(cwd, ".better-db-temp-auth.js");
	await fs.writeFile(tempConfigPath, tempConfigContent, "utf8");
	return tempConfigPath;
}

function buildBetterAuthArgs(
	configPath: string,
	options: MigrateOptions,
): string[] {
	const args = ["@better-auth/cli", "migrate"];

	args.push("--config", configPath);
	args.push("--cwd", options.cwd);

	if (options.y || options.yes) {
		args.push("--yes");
	}

	return args;
}

export const migrateCommand = new Command("migrate")
	.description(
		"Run database migrations (Kysely adapter only - for Prisma/Drizzle use their native tools)",
	)
	.option("--cwd <dir>", "Current working directory", process.cwd())
	.option("--config <path>", "Path to better-db schema file")
	.option("-y, --yes", "Skip confirmation prompts")
	.action(migrateAction);
