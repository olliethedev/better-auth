import { describe, it, expect, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

/**
 * E2E tests that actually run the CLI command
 * These catch issues that unit tests miss (like wrong adapter types)
 */
describe("E2E CLI tests", () => {
	const testDir = path.join(process.cwd(), "test-output");
	const testSchema = path.join(testDir, "test-db.ts");

	afterEach(async () => {
		// Clean up test files
		await fs.rm(testDir, { recursive: true, force: true });
	});

	it("should run generate command for Prisma", async () => {
		// Create test directory and schema
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Product: table("product", (t) => ({
    name: t.text().notNull(),
    price: t.number().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "schema.prisma");

		// Run actual CLI command
		const { stdout, stderr } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=prisma --output=${outputPath} --yes`,
			{ cwd: process.cwd() },
		);

		// Verify output file was created
		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		// Verify content
		const content = await fs.readFile(outputPath, "utf8");
		expect(content).toContain("datasource db");
		expect(content).toContain("model Product");
		expect(content).toContain("name");
		expect(content).toContain("price");
	}, 10000); // 10 second timeout

	it("should run generate command for Drizzle", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Article: table("article", (t) => ({
    title: t.text().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "schema.ts");

		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=drizzle --output=${outputPath} --yes`,
			{ cwd: process.cwd() },
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content).toContain('from "drizzle-orm/');
		expect(content).toContain("export const article");
	}, 10000);

	it("should fail Kysely without DATABASE_URL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Task: table("task", (t) => ({
    title: t.text().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations.sql");

		// Should fail without DATABASE_URL
		try {
			await execAsync(
				`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
				{
					cwd: process.cwd(),
					env: { ...process.env, DATABASE_URL: undefined }, // Remove DATABASE_URL
				},
			);
			expect.fail("Should have thrown error");
		} catch (error: any) {
			expect(error.message).toContain(
				"Kysely generation requires database connection",
			);
		}
	}, 10000);

	it("should generate Kysely migrations with SQLite database connection", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Task: table("task", (t) => ({
    title: t.text().notNull(),
    completed: t.boolean().defaultValue(false),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations.sql");
		const dbPath = path.join(testDir, "test.db");

		// Run with SQLite DATABASE_URL
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: { ...process.env, DATABASE_URL: `sqlite:${dbPath}` },
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("task");
		expect(content).toContain("title");
		expect(content).toContain("completed");
	}, 15000);

	it("should generate Kysely migrations using --database-url flag instead of env var", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Item: table("item", (t) => ({
    name: t.text().notNull(),
    quantity: t.number().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-flag.sql");
		const dbPath = path.join(testDir, "test-flag.db");

		// Run with --database-url flag (no DATABASE_URL env var)
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --database-url=sqlite:${dbPath} --yes`,
			{
				cwd: process.cwd(),
				env: { ...process.env, DATABASE_URL: undefined }, // Remove DATABASE_URL
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("item");
		expect(content).toContain("name");
		expect(content).toContain("quantity");
	}, 15000);

	it("should prioritize --database-url flag over DATABASE_URL env var", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Priority: table("priority", (t) => ({
    level: t.number().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-priority.sql");
		const flagDbPath = path.join(testDir, "flag-db.db");
		const envDbPath = path.join(testDir, "env-db.db");

		// Run with both --database-url flag and DATABASE_URL env var
		// Flag should take priority
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --database-url=sqlite:${flagDbPath} --yes`,
			{
				cwd: process.cwd(),
				env: { ...process.env, DATABASE_URL: `sqlite:${envDbPath}` },
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		// The flag db should be created, not the env db
		const flagDbExists = await fs
			.access(flagDbPath)
			.then(() => true)
			.catch(() => false);
		expect(flagDbExists).toBe(true);
	}, 15000);

	it("should generate Kysely migrations with PostgreSQL (postgres:// prefix)", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Product: table("product", (t) => ({
    name: t.text().notNull(),
    price: t.number().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations.sql");

		// Test with postgres:// prefix (both formats should work)
		// Using postgres-kysely container on port 5433
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("product");
		expect(content).toContain("name");
		expect(content).toContain("price");
	}, 20000);

	it("should generate Kysely migrations with PostgreSQL (postgresql:// prefix)", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Order: table("orders", (t) => ({
    total: t.number().notNull(),
    status: t.text().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-pg.sql");

		// Test with postgresql:// prefix (the issue we fixed)
		// Using postgres-kysely container on port 5433
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgresql://user:password@localhost:5433/better_auth",
				},
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("orders");
		expect(content).toContain("total");
		expect(content).toContain("status");
	}, 20000);

	it("should generate Kysely migrations with MySQL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Customer: table("customer", (t) => ({
    email: t.text().notNull(),
    name: t.text().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-mysql.sql");

		// Test MySQL connection using mysql-kysely container on port 3307
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "mysql://user:password@localhost:3307/better_auth",
				},
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("customer");
		expect(content).toContain("email");
		expect(content).toContain("name");
	}, 20000);

	it("should run migrate command with PostgreSQL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Invoice: table("invoice", (t) => ({
    amount: t.number().notNull(),
    paid: t.boolean().defaultValue(false),
  })),
}));
`,
			"utf8",
		);

		// Test migrate command with postgres-kysely container
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Verify output mentions migration success or up to date
		expect(
			stdout.includes("Migrations completed") || stdout.includes("up to date"),
		).toBe(true);
	}, 30000);

	it("should run migrate command with MySQL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Receipt: table("receipt", (t) => ({
    total: t.number().notNull(),
    date: t.timestamp().notNull(),
  })),
}));
`,
			"utf8",
		);

		// Test migrate command with mysql-kysely container
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "mysql://user:password@localhost:3307/better_auth",
				},
			},
		);

		// Verify output mentions migration success or up to date
		expect(
			stdout.includes("Migrations completed") || stdout.includes("up to date"),
		).toBe(true);
	}, 30000);

	it("should filter auth tables with --filter-auth flag", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  Custom: table("custom", (t) => ({
    data: t.text().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "schema.prisma");

		await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=prisma --output=${outputPath} --filter-auth --yes`,
			{ cwd: process.cwd() },
		);

		const content = await fs.readFile(outputPath, "utf8");

		// Should NOT have auth tables
		expect(content).not.toContain("model User");
		expect(content).not.toContain("model Session");

		// Should have custom table
		expect(content).toContain("model Custom");
	}, 10000);

	it("should not create empty file when filtering removes all content (Kysely)", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
  EmptyCheckTable: table("empty_check_table", (t) => ({
    data: t.text().notNull(),
  })),
}));
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "empty-check.sql");
		const initialMigrationPath = path.join(testDir, "initial.sql");

		// Clean database first to ensure we're starting fresh
		const { Pool } = await import("pg");
		let pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		await pool.query(
			'DROP TABLE IF EXISTS empty_check_table, verification, account, session, "user" CASCADE',
		);
		await pool.end();

		// Generate initial migration (includes both auth tables and custom table)
		await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${initialMigrationPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Apply the migration to create all tables
		pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		const initialMigration = await fs.readFile(initialMigrationPath, "utf8");
		for (const statement of initialMigration
			.split(";")
			.filter((s) => s.trim())) {
			await pool.query(statement);
		}
		await pool.end();

		// Now run with --filter-auth when only auth tables would need to be created (but they're already there)
		// This simulates the user's scenario where custom tables exist and they run generate with --filter-auth
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --filter-auth --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Should say schema is up to date
		expect(stdout).toContain("Schema is up to date");

		// File should not exist
		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(false);
	}, 20000);
});
