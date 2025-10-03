// Integration test to verify the better-db API works as expected
import { defineDb } from "../core/src/index";
import { commentsPlugin } from "../plugins/src/comments";

console.log("🧪 Testing better-db integration...");

// Test the defineDb DSL
const blogDb = defineDb(({ table }) => ({
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

// Test schema extraction
const schema = blogDb.getSchema();
console.log("✅ Schema generated successfully");
console.log("Tables:", Object.keys(schema));

// Verify the Post table was created correctly
const postTable = schema.Post;
if (!postTable) {
  throw new Error("Post table not found!");
}

console.log("✅ Post table fields:", Object.keys(postTable.fields));

// Verify the plugin added the Comment table
const commentTable = schema.Comment;
if (!commentTable) {
  throw new Error("Comment table from plugin not found!");
}

console.log("✅ Comment table from plugin:", Object.keys(commentTable.fields));

// Test Better Auth schema conversion
const betterAuthSchema = blogDb.toBetterAuthSchema();
console.log("✅ Better Auth schema conversion successful");
console.log("BA Schema tables:", Object.keys(betterAuthSchema));

// Verify field attributes are correct
const postIdField = postTable.fields.id;
if (!postIdField || postIdField.type !== "string") {
  throw new Error("Post id field incorrect!");
}

if (!postIdField.primaryKey) {
  throw new Error("Post id should be primary key!");
}

console.log("✅ All tests passed!");
console.log("🎉 better-db integration working correctly!");