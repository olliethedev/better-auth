// Re-export everything from Better Auth's Memory adapter
export * from "better-auth/adapters/memory";

import type { Adapter, DefineDbResult } from "@better-db/core";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { BetterAuthOptions } from "better-auth/types";

/**
 * Helper function to create a memory adapter with Better DB schema
 *
 * This handles the conversion from Better DB schema to the format expected by memoryAdapter
 * and ensures the schema is properly passed through a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@better-db/core";
 * import { createMemoryAdapter } from "@better-db/adapter-memory";
 *
 * const db = defineDb(({ table }) => ({
 *   Todo: table("todo", (t) => ({
 *     title: t.text().notNull(),
 *     completed: t.boolean().defaultValue(false),
 *   })),
 * }));
 *
 * const adapter = createMemoryAdapter(db, {
 *   secret: "your-secret",
 *   // ... other Better Auth options
 * });
 * ```
 */
export function createMemoryAdapter(
	db: DefineDbResult,
	options: BetterAuthOptions = {},
): (options: BetterAuthOptions) => Adapter {
	// Convert Better DB schema to Better Auth format
	const schema = db.toBetterAuthSchema();

	// Initialize MemoryDB with correct model names (lowercase table names)
	const memoryDB: Record<string, any[]> = {};
	for (const [_key, tableConfig] of Object.entries(schema)) {
		const tableName = (tableConfig as any).modelName || _key;
		memoryDB[tableName] = [];
	}

	// Return an adapter factory that includes the schema as a plugin
	return (adapterOptions: BetterAuthOptions = {}) => {
		const mergedOptions = {
			...options,
			...adapterOptions,
			plugins: [
				...(options.plugins || []),
				...(adapterOptions.plugins || []),
				// Add Better DB schema as a plugin so getAuthTables can find it
				{
					id: "better-db-schema",
					schema: schema,
				},
			],
		};

		return memoryAdapter(memoryDB)(mergedOptions);
	};
}
