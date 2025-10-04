import { Command } from "commander";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

interface InitOptions {
	cwd: string;
	output?: string;
}

async function initAction(options: InitOptions) {
	try {
		console.log(chalk.blue("🚀 Better DB Init"));
		console.log(chalk.gray("Creating a new better-db schema..."));

		const outputPath = options.output || path.join(options.cwd, "db.ts");

		// Check if file already exists
		const exists = await fileExists(outputPath);
		if (exists) {
			console.log(chalk.yellow(`⚠️  Schema file already exists: ${outputPath}`));
			console.log(
				chalk.gray("Use the --output option to specify a different path."),
			);
			return;
		}

		// Create the example schema
		const schemaContent = createExampleSchema();

		await fs.writeFile(outputPath, schemaContent, "utf8");

		console.log(chalk.green(`✅ Created schema file: ${outputPath}`));
		console.log();
		console.log(chalk.blue("Next steps:"));
		console.log(chalk.gray("1. Edit the schema file to define your tables"));
		console.log(
			chalk.gray(
				"2. Run `better-db generate --orm=<prisma|drizzle|kysely>` to generate database files",
			),
		);
		console.log();
		console.log(chalk.yellow("Example usage:"));
		console.log(
			chalk.gray(
				"  better-db generate --orm=prisma --output=prisma/schema.prisma",
			),
		);
	} catch (error: any) {
		console.error(chalk.red("❌ Initialization failed:"), error.message);
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

function createExampleSchema(): string {
	return `import { defineDb } from "@better-db/core";

// Define your database schema
export const db = defineDb(({ table }) => ({
  // Example: Blog post table
  Post: table("post", (t) => ({
    id: t.id().primaryKey(),
    title: t.text().notNull(),
    content: t.text().notNull(),
    published: t.boolean().defaultValue(false),
    authorId: t.text().notNull().index(), // Foreign key to author
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t.timestamp().defaultNow(),
  })),

  // Example: Author table  
  Author: table("author", (t) => ({
    id: t.id().primaryKey(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    bio: t.text().nullable(),
    createdAt: t.timestamp().defaultNow(),
  })),

  // Example: Category table with many-to-many relationship
  Category: table("category", (t) => ({
    id: t.id().primaryKey(),
    name: t.text().notNull().unique(),
    slug: t.text().notNull().unique(),
  })),

  // Junction table for posts-categories relationship
  PostCategory: table("post_category", (t) => ({
    id: t.id().primaryKey(),
    postId: t.text().notNull().references("post"),
    categoryId: t.text().notNull().references("category"),
  })),
}));

export default db;
`;
}

export const initCommand = new Command("init")
	.description("Initialize a new better-db schema file")
	.option("--cwd <dir>", "Current working directory", process.cwd())
	.option("--output <path>", "Output path for schema file", "db.ts")
	.action(initAction);
