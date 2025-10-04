import { createDbPlugin } from "@better-db/core";

/**
 * Timestamps plugin - adds a generic timestamps table for tracking events
 *
 * Usage:
 * ```ts
 * import { defineDb } from "@better-db/core";
 * import { timestampsPlugin } from "@better-db/plugins";
 *
 * const db = defineDb(({ table }) => ({
 *   Post: table("post", (t) => ({ ... })),
 * })).use(timestampsPlugin);
 * ```
 */
export const timestampsPlugin = createDbPlugin("timestamps", ({ table }) => ({
	Timestamp: table("timestamp", (t) => ({
		id: t.id().primaryKey(),

		// What entity this timestamp is for
		entityType: t.text().notNull(), // e.g., "post", "user", etc.
		entityId: t.text().notNull(), // ID of the entity

		// What event happened
		event: t.text().notNull(), // e.g., "created", "updated", "published", "archived"

		// Optional metadata
		metadata: t.json().nullable(), // Additional event data

		// Who performed the action (optional)
		performedBy: t.text().nullable(), // User ID or system identifier

		// When it happened
		timestamp: t.timestamp().defaultNow(),
	})),
}));
