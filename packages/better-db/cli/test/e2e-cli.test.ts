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
				"Kysely generation requires DATABASE_URL",
			);
		}
	}, 10000);

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
});
