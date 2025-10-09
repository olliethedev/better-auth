import { describe, it, expect } from "vitest";
import { defineDb } from "@better-db/core";
import { createMemoryAdapter } from "../src/index";
import { webcrypto } from "node:crypto";
// Mock crypto for tests
if (!globalThis.crypto) {
	globalThis.crypto = webcrypto;
}
describe("createMemoryAdapter helper", () => {
	it("should create a memory adapter from Better DB schema", () => {
		const db = defineDb(({ table }) => ({
			Todo: table("todo", (t) => ({
				title: t.text().notNull(),
				completed: t.boolean().defaultValue(false),
			})),
		}));
		const adapterFactory = createMemoryAdapter(db);
		expect(adapterFactory).toBeDefined();
		expect(typeof adapterFactory).toBe("function");
	});
	it("should allow querying with capitalized model names", async () => {
		const db = defineDb(({ table }) => ({
			Todo: table("todo", (t) => ({
				title: t.text().notNull(),
				completed: t.boolean().defaultValue(false),
			})),
			Message: table("message", (t) => ({
				content: t.text().notNull(),
			})),
		}));
		const adapterFactory = createMemoryAdapter(db);
		const adapter = adapterFactory({});
		// Create a todo
		const todo = await adapter.create({
			model: "Todo",
			data: {
				title: "Test Todo",
				completed: false,
			},
		});
		expect(todo).toBeDefined();
		expect(todo.title).toBe("Test Todo");
		// Query todos
		const todos = await adapter.findMany({
			model: "Todo",
		});
		expect(todos).toBeDefined();
		expect(todos.length).toBe(1);
		expect(todos[0]?.title).toBe("Test Todo");
	});
	it("should support sorting and filtering", async () => {
		const db = defineDb(({ table }) => ({
			Todo: table("todo", (t) => ({
				title: t.text().notNull(),
				completed: t.boolean().defaultValue(false),
				createdAt: t.timestamp().defaultNow(),
			})),
		}));
		const adapterFactory = createMemoryAdapter(db);
		const adapter = adapterFactory({});
		// Create multiple todos
		await adapter.create({
			model: "Todo",
			data: {
				title: "First Todo",
				completed: false,
				createdAt: new Date("2024-01-01"),
			},
		});
		await adapter.create({
			model: "Todo",
			data: {
				title: "Second Todo",
				completed: true,
				createdAt: new Date("2024-01-02"),
			},
		});
		// Query with sorting
		const todos = await adapter.findMany({
			model: "Todo",
			sortBy: {
				field: "createdAt",
				direction: "desc",
			},
		});
		expect(todos).toBeDefined();
		expect(todos.length).toBe(2);
		expect(todos[0]?.title).toBe("Second Todo");
		expect(todos[1]?.title).toBe("First Todo");
	});
	it("should work with multiple tables", async () => {
		const db = defineDb(({ table }) => ({
			Todo: table("todo", (t) => ({
				title: t.text().notNull(),
			})),
			Message: table("message", (t) => ({
				content: t.text().notNull(),
			})),
		}));
		const adapterFactory = createMemoryAdapter(db);
		const adapter = adapterFactory({});
		// Create in both tables
		await adapter.create({
			model: "Todo",
			data: { title: "My Todo" },
		});
		await adapter.create({
			model: "Message",
			data: { content: "My Message" },
		});
		// Query both tables
		const todos = await adapter.findMany({ model: "Todo" });
		const messages = await adapter.findMany({ model: "Message" });
		expect(todos.length).toBe(1);
		expect(messages.length).toBe(1);
		expect(todos[0]?.title).toBe("My Todo");
		expect(messages[0]?.content).toBe("My Message");
	});
});
