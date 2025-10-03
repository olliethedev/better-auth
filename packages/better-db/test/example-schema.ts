import { defineDb } from "../core/src/index";
import { commentsPlugin } from "../plugins/src/comments";

// Test the defineDb DSL
export const blogDb = defineDb(({ table }) => ({
  Post: table("post", (t) => ({
    id: t.id().primaryKey(),
    title: t.text().notNull(),
    body: t.text().notNull(),
    authorId: t.text().notNull().index(),
    published: t.boolean().defaultValue(false),
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t.timestamp().defaultNow(),
  })),
  
  Author: table("author", (t) => ({
    id: t.id().primaryKey(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    bio: t.text().nullable(),
  })),
}))
// Test plugin system
.use(commentsPlugin);

export default blogDb;