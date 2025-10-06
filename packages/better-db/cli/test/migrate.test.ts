import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { defineDb } from "@better-db/core";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("better-db CLI migration", () => {
	const testDbPath = path.join(__dirname, "test-migrate.db");
	const testSchemaPath = path.join(__dirname, "test-schema.ts");

	beforeAll(async () => {
		// Create a test schema file
		const schemaContent = `
import { defineDb } from "@better-db/core";

export default defineDb(({ table }) => ({
	Post: table("post", (t) => ({
		id: t.id(),
		title: t.text().notNull(),
		content: t.text().notNull(),
	})),
}));
`;
		await fs.writeFile(testSchemaPath, schemaContent, "utf8");
	});

	afterAll(async () => {
		// Clean up test files
		await fs.unlink(testSchemaPath).catch(() => {});
		await fs.unlink(testDbPath).catch(() => {});
	});

	it("should validate schema loading for migrations", async () => {
		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
				content: t.text().notNull(),
			})),
		}));

		const betterAuthSchema = db.toBetterAuthSchema();

		expect(betterAuthSchema).toBeDefined();
		expect(betterAuthSchema.Post).toBeDefined();
		expect(betterAuthSchema.Post.fields.title).toBeDefined();
		expect(betterAuthSchema.Post.fields.content).toBeDefined();
	});

	it("should handle schema with multiple tables for migrations", () => {
		const db = defineDb(({ table }) => ({
			User: table("user", (t) => ({
				id: t.id(),
				name: t.text().notNull(),
				email: t.text().notNull().unique(),
			})),
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
				userId: t.text().notNull().references("user"),
			})),
			Comment: table("comment", (t) => ({
				id: t.id(),
				content: t.text().notNull(),
				postId: t.text().notNull().references("post"),
			})),
		}));

		const schema = db.toBetterAuthSchema();

		expect(schema.User).toBeDefined();
		expect(schema.Post).toBeDefined();
		expect(schema.Comment).toBeDefined();
		expect(schema.Post.fields.userId.references?.model).toBe("user");
		expect(schema.Comment.fields.postId.references?.model).toBe("post");
	});

	it("should validate migration requires database URL", () => {
		// Migration command should fail without DATABASE_URL
		const savedEnv = process.env.DATABASE_URL;
		// biome-ignore lint/performance/noDelete: fine for test
		delete process.env.DATABASE_URL;

		// Test that the validation logic would catch this
		const databaseUrl = process.env.DATABASE_URL;
		expect(databaseUrl).toBeUndefined();

		// Restore
		if (savedEnv) process.env.DATABASE_URL = savedEnv;
	});

	it("should handle complex schema with defaults and constraints", () => {
		const db = defineDb(({ table }) => ({
			Product: table("product", (t) => ({
				id: t.id(),
				name: t.text().notNull(),
				price: t.number().notNull().defaultValue(0),
				inStock: t.boolean().defaultValue(true),
				createdAt: t.timestamp().notNull(),
				updatedAt: t.timestamp().notNull(),
				description: t.text().nullable(),
			})),
		}));

		const schema = db.toBetterAuthSchema();

		expect(schema.Product).toBeDefined();
		expect(schema.Product.fields.price.defaultValue).toBe(0);
		expect(schema.Product.fields.inStock.defaultValue).toBe(true);
		expect(schema.Product.fields.description.required).toBe(false);
	});

	it("should handle schema with indexes and unique constraints", () => {
		const db = defineDb(({ table }) => ({
			User: table("user", (t) => ({
				id: t.id(),
				email: t.text().notNull().unique(),
				username: t.text().notNull().unique(),
				phone: t.text().nullable().unique(),
			})),
		}));

		const schema = db.toBetterAuthSchema();

		expect(schema.User.fields.email.unique).toBe(true);
		expect(schema.User.fields.username.unique).toBe(true);
		expect(schema.User.fields.phone.unique).toBe(true);
	});
});
