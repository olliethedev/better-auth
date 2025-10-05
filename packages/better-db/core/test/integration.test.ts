// Integration test to verify the better-db API works as expected
import { describe, it, expect } from "vitest";
import { defineDb, createDbPlugin } from "../src/index";

describe("better-db integration", () => {
	it("should create schema with defineDb DSL", () => {
		const blogDb = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(), // Automatically becomes primary key
				title: t.text().notNull(),
				body: t.text().notNull(),
				authorId: t.text().notNull(),
				published: t.boolean().defaultValue(false),
				createdAt: t.timestamp().defaultNow(),
				updatedAt: t.timestamp().defaultNow(),
			})),

			Author: table("author", (t) => ({
				id: t.id(), // Automatically becomes primary key
				name: t.text().notNull(),
				email: t.text().notNull().unique(),
				bio: t.text().nullable(),
			})),
		}));

		const schema = blogDb.getSchema();
		expect(schema).toBeDefined();
		expect(Object.keys(schema)).toContain("Post");
		expect(Object.keys(schema)).toContain("Author");
	});

	it("should add plugin tables to schema", () => {
		// Create a simple test plugin inline (avoid circular dependency with plugins package)
		const testPlugin = createDbPlugin("test", ({ table }) => ({
			Comment: table("comment", (t) => ({
				id: t.id(),
				content: t.text().notNull(),
			})),
		}));

		const blogDb = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
			})),
		})).use(testPlugin);

		const schema = blogDb.getSchema();
		expect(Object.keys(schema)).toContain("Post");
		expect(Object.keys(schema)).toContain("Comment");
	});

	it("should create correct field attributes", () => {
		const blogDb = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
				email: t.text().unique(),
			})),
		}));

		const schema = blogDb.getSchema();
		const postTable = schema.Post;

		expect(postTable).toBeDefined();
		expect(postTable.fields.id).toBeDefined();
		expect(postTable.fields.id.type).toBe("string");
		expect(postTable.fields.title.required).toBe(true);
		expect(postTable.fields.email.unique).toBe(true);
	});

	it("should convert to Better Auth schema format", () => {
		const blogDb = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				id: t.id(),
				title: t.text().notNull(),
			})),
		}));

		const betterAuthSchema = blogDb.toBetterAuthSchema();
		expect(betterAuthSchema).toBeDefined();
		expect(Object.keys(betterAuthSchema)).toContain("Post");
		expect(betterAuthSchema.Post.fields).toBeDefined();
	});
});
