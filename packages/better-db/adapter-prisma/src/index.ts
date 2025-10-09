// Re-export everything from Better Auth's Prisma adapter
export * from "better-auth/adapters/prisma";

import type { Adapter, DefineDbResult } from "@better-db/core";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { BetterAuthOptions } from "better-auth/types";

/**
 * Helper function to create a Prisma adapter with Better DB schema
 *
 * This handles the conversion from Better DB schema to the format expected by prismaAdapter
 * and ensures the schema is properly passed through a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@better-db/core";
 * import { createPrismaAdapter } from "@better-db/adapter-prisma";
 * import { PrismaClient } from "@prisma/client";
 *
 * const db = defineDb(({ table }) => ({
 *   Todo: table("todo", (t) => ({
 *     title: t.text().notNull(),
 *     completed: t.boolean().defaultValue(false),
 *   })),
 * }));
 *
 * const prisma = new PrismaClient();
 *
 * const adapter = createPrismaAdapter(prisma, db);
 * ```
 */
export function createPrismaAdapter(
	prisma: any,
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

		return prismaAdapter(prisma)(mergedOptions);
	};
}
