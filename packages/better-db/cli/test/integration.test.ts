import { describe, it, expect } from "vitest";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { getAdapter } from "better-auth/db";
import { defineDb, createDbPlugin } from "@better-db/core";
import path from "path";
import { fileURLToPath } from "url";

// Dynamically import generators to avoid export issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliGeneratorsPath = path.resolve(
	__dirname,
	"../../../cli/src/generators",
);

describe("better-db CLI generation", () => {
	it("should generate Prisma schema from better-db schema", async () => {
		const { generatePrismaSchema } = await import(
			path.join(cliGeneratorsPath, "prisma.js")
		);

		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
				content: t.text().notNull(),
			})),
		}));

		const betterAuthSchema = db.toBetterAuthSchema();

		const auth = betterAuth({
			database: memoryAdapter({}),
			plugins: [{ id: "better-db", schema: betterAuthSchema }],
		});

		const adapter = await getAdapter(auth.options);

		const result = await generatePrismaSchema({
			adapter,
			options: auth.options,
			file: "test.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("model Post");
		expect(result.code).toContain("title");
		expect(result.code).toContain("content");
		// Note: Better Auth default tables (User, Session, etc.) are included by default
		// This is expected behavior as Better Auth always includes its core auth tables
	});

	it("should generate Prisma schema with plugins", async () => {
		const { generatePrismaSchema } = await import(
			path.join(cliGeneratorsPath, "prisma.js")
		);

		const plugin = createDbPlugin("test", ({ table }) => ({
			Comment: table("comment", (t) => ({
				id: t.id(),
				content: t.text().notNull(),
			})),
		}));

		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
			})),
		})).use(plugin);

		const betterAuthSchema = db.toBetterAuthSchema();

		const auth = betterAuth({
			database: memoryAdapter({}),
			plugins: [{ id: "better-db", schema: betterAuthSchema }],
		});

		const adapter = await getAdapter(auth.options);

		const result = await generatePrismaSchema({
			adapter,
			options: auth.options,
			file: "test-plugins.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("model Post");
		expect(result.code).toContain("model Comment"); // Plugin table included
	});

	it("should generate Prisma schema with field attributes", async () => {
		const { generatePrismaSchema } = await import(
			path.join(cliGeneratorsPath, "prisma.js")
		);

		const db = defineDb(({ table }) => ({
			Product: table("product", (t) => ({
				id: t.id(),
				email: t.text().notNull().unique(),
				name: t.text().nullable(),
				price: t.number().defaultValue(0),
			})),
		}));

		const betterAuthSchema = db.toBetterAuthSchema();

		const auth = betterAuth({
			database: memoryAdapter({}),
			plugins: [{ id: "better-db", schema: betterAuthSchema }],
		});

		const adapter = await getAdapter(auth.options);

		const result = await generatePrismaSchema({
			adapter,
			options: auth.options,
			file: "test-attributes.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("model Product");
		expect(result.code).toContain("email");
		expect(result.code).toContain("@@unique");
	});

	it("should generate Prisma schema with references", async () => {
		const { generatePrismaSchema } = await import(
			path.join(cliGeneratorsPath, "prisma.js")
		);

		const db = defineDb(({ table }) => ({
			Author: table("author", (t) => ({
				id: t.id(),
				name: t.text().notNull(),
			})),
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
				authorId: t.text().notNull().references("author"),
			})),
		}));

		const betterAuthSchema = db.toBetterAuthSchema();

		const auth = betterAuth({
			database: memoryAdapter({}),
			plugins: [{ id: "better-db", schema: betterAuthSchema }],
		});

		const adapter = await getAdapter(auth.options);

		const result = await generatePrismaSchema({
			adapter,
			options: auth.options,
			file: "test-references.prisma",
		});

		expect(result.code).toBeDefined();
		expect(result.code).toContain("model Author");
		expect(result.code).toContain("model Post");
		expect(result.code).toContain("authorId");
		expect(result.code).toContain("@relation");
	});

	it("should validate that schema conversion works", () => {
		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
				published: t.boolean().defaultValue(false),
			})),
		}));

		const betterAuthSchema = db.toBetterAuthSchema();
		expect(betterAuthSchema).toBeDefined();
		expect(betterAuthSchema.Post).toBeDefined();
		expect(betterAuthSchema.Post.fields).toBeDefined();
		expect(betterAuthSchema.Post.fields.title.required).toBe(true);
		expect(betterAuthSchema.Post.fields.published.defaultValue).toBe(false);
	});
});
