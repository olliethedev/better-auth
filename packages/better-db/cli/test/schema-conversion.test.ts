import { describe, it, expect } from "vitest";
import { defineDb, createDbPlugin } from "@better-db/core";

/**
 * Tests for better-db schema definition and conversion
 * (ORM generation is tested in generate-all-orms.test.ts)
 */
describe("better-db schema conversion", () => {
	it("should create better-db schema correctly", () => {
		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				title: t.text().notNull(),
				content: t.text().notNull(),
			})),
		}));

		const schema = db.getSchema();
		expect(schema).toBeDefined();
		expect(schema.Post).toBeDefined();
		// Note: id is not in fields - Better Auth handles it automatically
		expect(schema.Post!!.fields.title).toBeDefined();
	});

	it("should convert better-db schema to Better Auth format", () => {
		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
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

	it("should handle plugins in schema conversion", () => {
		const plugin = createDbPlugin("test", ({ table }) => ({
			Comment: table("comment", (t) => ({
				content: t.text().notNull(),
			})),
		}));

		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				title: t.text().notNull(),
			})),
		})).use(plugin);

		const schema = db.getSchema();
		expect(schema).toBeDefined();

		// Verify both tables exist
		expect(Object.keys(schema)).toContain("Post");
		expect(Object.keys(schema)).toContain("Comment");

		// Verify model names are correct
		expect(schema.Post!!.modelName).toBe("post");
		expect(schema.Comment!!.modelName).toBe("comment");
	});

	it("should preserve field attributes during conversion", () => {
		const db = defineDb(({ table }) => ({
			User: table("user", (t) => ({
				email: t.text().notNull().unique(),
				name: t.text().nullable(),
				age: t.number().defaultValue(0),
			})),
		}));

		const schema = db.toBetterAuthSchema();

		// Verify attributes are preserved
		expect(schema.User.fields.email.required).toBe(true);
		expect(schema.User.fields.email.unique).toBe(true);
		expect(schema.User.fields.name.required).toBe(false);
		expect(schema.User.fields.age.defaultValue).toBe(0);
	});

	it("should handle references correctly", () => {
		const db = defineDb(({ table }) => ({
			Post: table("post", (t) => ({
				authorId: t.text().notNull().references("author"),
				categoryId: t.text().nullable().references("category", "id"),
			})),
		}));

		const schema = db.toBetterAuthSchema();

		// Verify references
		expect(schema.Post.fields.authorId.references).toBeDefined();
		expect(schema.Post.fields.authorId.references?.model).toBe("author");
		expect(schema.Post.fields.authorId.references?.field).toBe("id");
		expect(schema.Post.fields.authorId.references?.onDelete).toBe("cascade");

		expect(schema.Post.fields.categoryId.references).toBeDefined();
		expect(schema.Post.fields.categoryId.references?.model).toBe("category");
		expect(schema.Post.fields.categoryId.references?.field).toBe("id");
	});

	it("should merge multiple plugins correctly", () => {
		const plugin1 = createDbPlugin("plugin1", ({ table }) => ({
			Table1: table("table1", (t) => ({
				name: t.text().notNull(),
			})),
		}));

		const plugin2 = createDbPlugin("plugin2", ({ table }) => ({
			Table2: table("table2", (t) => ({
				value: t.number().defaultValue(0),
			})),
		}));

		const db = defineDb(({ table }) => ({
			Main: table("main", (t) => ({})),
		}))
			.use(plugin1)
			.use(plugin2);

		const schema = db.getSchema();

		expect(Object.keys(schema)).toContain("Main");
		expect(Object.keys(schema)).toContain("Table1");
		expect(Object.keys(schema)).toContain("Table2");
	});

	it("should handle all field types correctly", () => {
		const db = defineDb(({ table }) => ({
			AllTypes: table("all_types", (t) => ({
				textField: t.text(),
				stringField: t.string(),
				numberField: t.number(),
				intField: t.integer(),
				boolField: t.boolean(),
				dateField: t.date(),
				timestampField: t.timestamp(),
				jsonField: t.json(),
			})),
		}));

		const schema = db.getSchema();
		const fields = schema.AllTypes!!.fields;

		expect(fields.textField!.type).toBe("string");
		expect(fields.stringField!.type).toBe("string");
		expect(fields.numberField!.type).toBe("number");
		expect(fields.intField!.type).toBe("number");
		expect(fields.boolField!.type).toBe("boolean");
		expect(fields.dateField!.type).toBe("date");
		expect(fields.timestampField!.type).toBe("date");
		expect(fields.jsonField!.type).toBe("json");
	});
});
