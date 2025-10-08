import { describe, expect, it } from "vitest";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { defineDb, createDbPlugin } from "@better-db/core";
import Database from "better-sqlite3";
import type { BetterAuthOptions } from "better-auth";

// Import generators from our local copy
import { generatePrismaSchema } from "../src/generators/prisma";
import { generateDrizzleSchema } from "../src/generators/drizzle";
import { generateMigrations } from "../src/generators/kysely";
import { filterAuthTables } from "../src/utils/filter-auth-tables";

// Test plugin
const testPlugin = createDbPlugin("test-plugin", ({ table }) => ({
	Comment: table("comment", (t) => ({
		content: t.text().notNull(),
		postId: t.text().notNull().references("post"),
	})),
	Tag: table("tag", (t) => ({
		name: t.text().notNull().unique(),
	})),
}));

// Test schema
const testDb = defineDb(({ table }) => ({
	Post: table("post", (t) => ({
		title: t.text().notNull(),
		content: t.text().notNull(),
		published: t.boolean().defaultValue(false),
		createdAt: t.timestamp().notNull(),
	})),
	Author: table("author", (t) => ({
		name: t.text().notNull(),
		email: t.text().notNull().unique(),
	})),
})).use(testPlugin);

describe("Generate Prisma schemas for all databases", () => {
	it("should generate Prisma schema for PostgreSQL", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-pg.prisma",
		});

		const filteredCode = filterAuthTables(result.code || "", "prisma");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/prisma-postgresql.prisma",
		);
	});

	it("should generate Prisma schema for MySQL", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "mysql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "mysql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-mysql.prisma",
		});

		const filteredCode = filterAuthTables(result.code || "", "prisma");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/prisma-mysql.prisma",
		);
	});

	it("should generate Prisma schema for SQLite", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "sqlite" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "sqlite" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-sqlite.prisma",
		});

		const filteredCode = filterAuthTables(result.code || "", "prisma");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/prisma-sqlite.prisma",
		);
	});

	it("should generate Prisma schema for MongoDB", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "mongodb" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "mongodb" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-mongodb.prisma",
		});

		const filteredCode = filterAuthTables(result.code || "", "prisma");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/prisma-mongodb.prisma",
		);
	});

	it("should generate Prisma schema with filter-auth", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-filtered.prisma",
		});

		// Apply filter
		const filteredCode = filterAuthTables(result.code || "", "prisma");

		expect(filteredCode).toBeDefined();
		expect(filteredCode).not.toContain("model User");
		expect(filteredCode).not.toContain("model Session");
		expect(filteredCode).not.toContain("model Account");
		expect(filteredCode).toContain("model Post"); // Our tables kept
		expect(filteredCode).toContain("model Author");
		expect(filteredCode).toContain("model Comment");
	});
});

describe("Generate Drizzle schemas for all databases", () => {
	it("should generate Drizzle schema for PostgreSQL", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = drizzleAdapter(
			{},
			{
				provider: "pg",
				schema: {},
			},
		)({} as BetterAuthOptions);

		const result = await generateDrizzleSchema({
			adapter,
			options: {
				database: drizzleAdapter({}, { provider: "pg", schema: {} }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-pg.ts",
		});

		const filteredCode = filterAuthTables(result.code || "", "drizzle");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/drizzle-postgresql.ts",
		);
	});

	it("should generate Drizzle schema for MySQL", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = drizzleAdapter(
			{},
			{
				provider: "mysql",
				schema: {},
			},
		)({} as BetterAuthOptions);

		const result = await generateDrizzleSchema({
			adapter,
			options: {
				database: drizzleAdapter({}, { provider: "mysql", schema: {} }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-mysql.ts",
		});

		const filteredCode = filterAuthTables(result.code || "", "drizzle");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/drizzle-mysql.ts",
		);
	});

	it("should generate Drizzle schema for SQLite", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = drizzleAdapter(
			{},
			{
				provider: "sqlite",
				schema: {},
			},
		)({} as BetterAuthOptions);

		const result = await generateDrizzleSchema({
			adapter,
			options: {
				database: drizzleAdapter({}, { provider: "sqlite", schema: {} }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-sqlite.ts",
		});

		const filteredCode = filterAuthTables(result.code || "", "drizzle");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/drizzle-sqlite.ts",
		);
	});

	it("should generate Drizzle schema with filter-auth", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = drizzleAdapter(
			{},
			{ provider: "pg", schema: {} },
		)({} as BetterAuthOptions);

		const result = await generateDrizzleSchema({
			adapter,
			options: {
				database: drizzleAdapter({}, { provider: "pg", schema: {} }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-filtered.ts",
		});

		// Apply filter
		const filteredCode = filterAuthTables(result.code || "", "drizzle");

		expect(filteredCode).not.toContain("export const user");
		expect(filteredCode).not.toContain("export const session");
		expect(filteredCode).not.toContain("export const account");
		expect(filteredCode).toContain("export const post"); // Drizzle uses lowercase
		expect(filteredCode).toContain("export const author");
	});
});

describe("Generate Kysely migrations with real database", () => {
	it("should generate Kysely migrations for SQLite", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		// Use real SQLite database for introspection
		const sqliteDb = new Database(":memory:");

		const result = await generateMigrations({
			adapter: {} as any,
			options: {
				database: sqliteDb,
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-kysely.sql",
		});

		expect(result.code).toMatchFileSnapshot(
			"./__snapshots__/kysely-sqlite.sql",
		);

		sqliteDb.close();
	});

	it("should generate Kysely migrations with filter-auth", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const sqliteDb = new Database(":memory:");

		const result = await generateMigrations({
			adapter: {} as any,
			options: {
				database: sqliteDb,
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-kysely-filtered.sql",
		});

		sqliteDb.close();

		if (result.code) {
			// Apply filter
			const filteredCode = filterAuthTables(result.code, "kysely");

			// Save filtered snapshot
			expect(filteredCode).toMatchFileSnapshot(
				"./__snapshots__/kysely-filtered.sql",
			);
		}
	});
});

describe("Generate with advanced options", () => {
	it("should generate Prisma schema with number IDs", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
				advanced: {
					database: {
						useNumberId: true,
					},
				},
			},
			file: "test-number-id.prisma",
		});

		const filteredCode = filterAuthTables(result.code || "", "prisma");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/prisma-number-id.prisma",
		);
	});

	it("should generate Drizzle schema with number IDs", async () => {
		const betterAuthSchema = testDb.toBetterAuthSchema();

		const adapter = drizzleAdapter(
			{},
			{ provider: "pg", schema: {} },
		)({} as BetterAuthOptions);

		const result = await generateDrizzleSchema({
			adapter,
			options: {
				database: drizzleAdapter({}, { provider: "pg", schema: {} }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
				advanced: {
					database: {
						useNumberId: true,
					},
				},
			},
			file: "test-number-id.ts",
		});

		const filteredCode = filterAuthTables(result.code || "", "drizzle");
		expect(filteredCode).toMatchFileSnapshot(
			"./__snapshots__/drizzle-number-id.ts",
		);
	});

	it("should handle custom model names", async () => {
		const customDb = defineDb(({ table }) => ({
			BlogPost: table("blog_post", (t) => ({
				title: t.text().notNull(),
			})),
		}));

		const betterAuthSchema = customDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-custom.prisma",
		});

		expect(result.code).toBeDefined();
		// Prisma capitalizes first letter and uses snake_case for mapping
		expect(result.code).toContain("model Blog_post"); // Note: Blog_post not BlogPost
		expect(result.code).toContain('@@map("blog_post")');
	});

	it("should handle all field types", async () => {
		const typesDb = defineDb(({ table }) => ({
			AllTypes: table("all_types", (t) => ({
				textField: t.text().notNull(),
				numberField: t.number().notNull(),
				boolField: t.boolean().defaultValue(false),
				dateField: t.timestamp().notNull(),
				jsonField: t.json().nullable(),
			})),
		}));

		const betterAuthSchema = typesDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-types.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("String"); // text
		expect(result.code).toContain("Int"); // number
		expect(result.code).toContain("Boolean"); // boolean
		expect(result.code).toContain("DateTime"); // timestamp
		expect(result.code).toContain("Json"); // json
	});

	it("should handle foreign key references", async () => {
		const refDb = defineDb(({ table }) => ({
			User: table("user", (t) => ({
				email: t.text().notNull(),
			})),
			Post: table("post", (t) => ({
				userId: t.text().notNull().references("user"),
				title: t.text().notNull(),
			})),
		}));

		const betterAuthSchema = refDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test-refs.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("@relation");
		expect(result.code).toContain("userId");
		expect(result.code).toContain("onDelete: Cascade");
	});
});

describe("Generate with filter-auth for all ORMs", () => {
	const simpleDb = defineDb(({ table }) => ({
		Product: table("product", (t) => ({
			name: t.text().notNull(),
			price: t.number().notNull(),
		})),
	}));

	it("should filter auth tables from Prisma output", async () => {
		const betterAuthSchema = simpleDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test.prisma",
		});

		const filtered = filterAuthTables(result.code || "", "prisma");

		expect(filtered).not.toContain("model User");
		expect(filtered).not.toContain("model Session");
		expect(filtered).toContain("model Product");
		expect(filtered).toContain("price");
		expect(filtered).toContain("name");
	});

	it("should filter auth tables from Drizzle output", async () => {
		const betterAuthSchema = simpleDb.toBetterAuthSchema();

		const adapter = drizzleAdapter(
			{},
			{ provider: "pg", schema: {} },
		)({} as BetterAuthOptions);

		const result = await generateDrizzleSchema({
			adapter,
			options: {
				database: drizzleAdapter({}, { provider: "pg", schema: {} }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test.ts",
		});

		const filtered = filterAuthTables(result.code || "", "drizzle");

		expect(filtered).not.toContain("export const user");
		expect(filtered).not.toContain("export const session");
		expect(filtered).toContain("export const product"); // Drizzle uses lowercase
	});
});

describe("Edge cases and error handling", () => {
	it("should handle empty plugin schema", async () => {
		const emptyDb = defineDb(({ table }) => ({
			Single: table("single", (t) => ({})),
		}));

		const betterAuthSchema = emptyDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("model Single");
	});

	it("should handle nullable and unique constraints", async () => {
		const constraintsDb = defineDb(({ table }) => ({
			Item: table("item", (t) => ({
				required: t.text().notNull(),
				optional: t.text().nullable(),
				uniqueField: t.text().unique(),
				uniqueOptional: t.text().nullable().unique(),
			})),
		}));

		const betterAuthSchema = constraintsDb.toBetterAuthSchema();

		const adapter = prismaAdapter(
			{},
			{ provider: "postgresql" },
		)({} as BetterAuthOptions);

		const result = await generatePrismaSchema({
			adapter,
			options: {
				database: prismaAdapter({}, { provider: "postgresql" }),
				plugins: [{ id: "better-db", schema: betterAuthSchema }],
			},
			file: "test.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("required"); // Field name
		expect(result.code).toContain("optional"); // Field name
		expect(result.code).toContain("String"); // Type
		expect(result.code).toContain("String?"); // Nullable type
		expect(result.code).toContain("@@unique");
	});
});
