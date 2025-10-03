import { createDbPlugin } from "@better-db/core";

/**
 * Comments plugin - adds a comments table to any schema
 * 
 * Usage:
 * ```ts
 * import { defineDb } from "@better-db/core";
 * import { commentsPlugin } from "@better-db/plugins";
 * 
 * const db = defineDb(({ table }) => ({
 *   Post: table("post", (t) => ({ ... })),
 * })).use(commentsPlugin);
 * ```
 */
export const commentsPlugin = createDbPlugin("comments", ({ table }) => ({
  Comment: table("comment", (t) => ({
    id: t.id().primaryKey(),
    content: t.text().notNull(),
    authorName: t.text().nullable(), // Optional author name for anonymous comments
    authorEmail: t.text().nullable(), // Optional email
    
    // Generic polymorphic relationship - can comment on any entity
    entityType: t.text().notNull(), // e.g., "post", "product", etc.
    entityId: t.text().notNull(), // ID of the entity being commented on
    
    // Optional parent comment for replies
    parentId: t.text().nullable().references("comment"),
    
    // Moderation
    isApproved: t.boolean().defaultValue(false),
    isSpam: t.boolean().defaultValue(false),
    
    // Timestamps
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t.timestamp().defaultNow(),
  })),
}));