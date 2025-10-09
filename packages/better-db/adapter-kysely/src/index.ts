// Kysely adapter for @better-db
// Vendored from better-auth for independent publishing
export * from "./types";
export * from "./kysely-adapter";

import type { Adapter, DefineDbResult } from "@better-db/core";
import type { Kysely } from "kysely";
import type { BetterAuthOptions } from "better-auth/types";
import { kyselyAdapter } from "./kysely-adapter";
import type { KyselyDatabaseType } from "./types";

interface CreateKyselyAdapterConfig {
	/**
	 * Database type.
	 */
	type?: KyselyDatabaseType;
	/**
	 * Use plural for table names.
	 *
	 * @default false
	 */
	usePlural?: boolean;
	/**
	 * Whether to execute multiple operations in a transaction.
	 *
	 * If the database doesn't support transactions,
	 * set this to `false` and operations will be executed sequentially.
	 * @default true
	 */
	transaction?: boolean;
}

/**
 * Helper function to create a Kysely adapter with Better DB schema
 *
 * This handles the conversion from Better DB schema to the format expected by kyselyAdapter
 * and ensures the schema is properly passed through a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@better-db/core";
 * import { createKyselyAdapter } from "@better-db/adapter-kysely";
 * import { Kysely, PostgresDialect } from "kysely";
 *
 * const db = defineDb(({ table }) => ({
 *   Todo: table("todo", (t) => ({
 *     title: t.text().notNull(),
 *     completed: t.boolean().defaultValue(false),
 *   })),
 * }));
 *
 * const kysely = new Kysely({
 *   dialect: new PostgresDialect({ ... })
 * });
 *
 * const adapter = createKyselyAdapter(kysely, db, {
 *   type: "postgres",
 * });
 * ```
 */
export function createKyselyAdapter(
	kysely: Kysely<any>,
	db: DefineDbResult,
	config?: CreateKyselyAdapterConfig,
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

		return kyselyAdapter(kysely, config)(mergedOptions);
	};
}
