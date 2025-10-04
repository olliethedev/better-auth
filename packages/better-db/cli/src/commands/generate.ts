import { Command } from "commander";
import chalk from "chalk";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

interface GenerateOptions {
	cwd: string;
	config?: string;
	output?: string;
	orm?: "prisma" | "drizzle" | "kysely";
	y?: boolean;
	yes?: boolean;
}

async function generateAction(options: GenerateOptions) {
	try {
		console.log(chalk.blue("🔧 Better DB Generate"));
		console.log(
			chalk.gray("Generating database schema without auth domain models..."),
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

		// Create a temporary Better Auth config that filters out auth models
		const tempConfigPath = await createTempBetterAuthConfig(
			schemaPath,
			options.cwd,
		);

		try {
			// Forward to Better Auth CLI with our filtered config
			const baCommand = buildBetterAuthCommand(tempConfigPath, options);

			console.log(chalk.gray(`Running: ${baCommand}`));

			const { stdout, stderr } = await execAsync(baCommand, {
				cwd: options.cwd,
				env: { ...process.env, NODE_ENV: "development" },
			});

			if (stdout) {
				console.log(stdout);
			}
			if (stderr) {
				console.error(stderr);
			}

			console.log(chalk.green("✅ Schema generation completed!"));
		} finally {
			// Clean up temp file
			await fs.unlink(tempConfigPath).catch(() => {});
		}
	} catch (error: any) {
		console.error(chalk.red("❌ Generation failed:"), error.message);
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

function buildBetterAuthCommand(
	configPath: string,
	options: GenerateOptions,
): string {
	const parts = ["npx", "@better-auth/cli", "generate"];

	parts.push("--config", configPath);
	parts.push("--cwd", options.cwd);

	if (options.output) {
		parts.push("--output", options.output);
	}

	if (options.y || options.yes) {
		parts.push("--yes");
	}

	return parts.join(" ");
}

export const generateCommand = new Command("generate")
	.description("Generate database schema files for your ORM")
	.option("--cwd <dir>", "Current working directory", process.cwd())
	.option("--config <path>", "Path to better-db schema file")
	.option("--output <path>", "Output path for generated files")
	.option("--orm <orm>", "Target ORM (prisma, drizzle, kysely)")
	.option("-y, --yes", "Skip confirmation prompts")
	.action(generateAction);
