// Re-export everything from Better Auth's MongoDB adapter
export * from "better-auth/adapters/mongodb";

import type { Adapter, DefineDbResult } from "@better-db/core";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import type { BetterAuthOptions } from "better-auth/types";
import type { Db } from "mongodb";

/**
 * Helper function to create a MongoDB adapter with Better DB schema
 *
 * This handles the conversion from Better DB schema to the format expected by mongodbAdapter
 * and ensures the schema is properly passed through a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@better-db/core";
 * import { createMongoDbAdapter } from "@better-db/adapter-mongodb";
 * import { MongoClient } from "mongodb";
 *
 * const db = defineDb(({ table }) => ({
 *   Todo: table("todo", (t) => ({
 *     title: t.text().notNull(),
 *     completed: t.boolean().defaultValue(false),
 *   })),
 * }));
 *
 * const client = new MongoClient(mongoUrl);
 * const mongoDb = client.db("mydb");
 *
 * const adapter = createMongoDbAdapter(mongoDb, db);
 * ```
 */
export function createMongoDbAdapter(
	mongoDb: Db,
	db: DefineDbResult,
	options: BetterAuthOptions = {},
): (options: BetterAuthOptions) => Adapter {
	// Convert Better DB schema to Better Auth format
	const schema = db.toBetterAuthSchema();

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

		return mongodbAdapter(mongoDb)(mergedOptions);
	};
}
