# Better DB

**A thin, upstream-syncable fork of Better Auth's database layer—database utilities without the auth domain.**

Better DB provides all the power of Better Auth's adapter pattern and CLI-driven schema generation, but focused purely on database management without authentication concerns. It's designed to stay closely aligned with Better Auth for easy upstream syncing while giving you a clean, focused API for database operations.

## Why Better DB?

- **🎯 Focused**: Database utilities without auth domain complexity
- **🔄 Upstream Syncable**: Stays aligned with Better Auth for easy updates  
- **🔧 Battle-tested**: Built on Better Auth's proven adapter architecture
- **🚀 Flexible**: Support for Prisma, Drizzle, Kysely, MongoDB, and more
- **🔌 Extensible**: Plugin system for adding custom tables and functionality
- **⚡ CLI-driven**: Generate schema files with a single command

## Quick Start

### Installation

```bash
# Core package
npm install @better-db/core

# Choose your adapter
npm install @better-db/adapter-prisma
npm install @better-db/adapter-drizzle  
npm install @better-db/adapter-kysely
npm install @better-db/adapter-memory
npm install @better-db/adapter-mongodb

# CLI for schema generation
npm install -D @better-db/cli
```

### Define Your Schema

Create a `db.ts` file with your database schema:

```typescript
import { defineDb } from "@better-db/core";

export const db = defineDb(({ table }) => ({
  Post: table("post", (t) => ({
    id: t.id(),  // Automatically becomes primary key
    title: t.text().notNull(),
    content: t.text().notNull(),
    published: t.boolean().defaultValue(false),
    authorId: t.text().notNull(),
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t.timestamp().defaultNow(),
  })),

  Author: table("author", (t) => ({
    id: t.id(),  // Automatically becomes primary key
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    bio: t.text().nullable(),
    createdAt: t.timestamp().defaultNow(),
  })),
}));

export default db;
```

### Generate Database Schema

Generate schema files for your preferred ORM:

```bash
# Generate Prisma schema
npx better-db generate --orm=prisma --output=prisma/schema.prisma

# Generate Drizzle schema  
npx better-db generate --orm=drizzle --output=src/db/schema.ts

# Generate Kysely types
npx better-db generate --orm=kysely --output=src/db/types.ts
```

### Use the Adapter

Create an adapter instance to interact with your database:

```typescript
import { prismaAdapter } from "@better-db/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create adapter instance
const adapter = prismaAdapter(prisma)(/* betterAuthOptions */);
```

## Database Operations

Better DB uses Better Auth's adapter pattern for database operations. All adapters provide a consistent API regardless of your underlying database.

### Creating Records

```typescript
import { prismaAdapter } from "@better-db/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const adapter = prismaAdapter(prisma)({});

// Create a new post
const newPost = await adapter.create({
  model: "post",
  data: {
    title: "My First Post",
    content: "Hello World!",
    published: true,
    authorId: "user-123",
  },
});
```

### Reading Records

```typescript
// Find a single record
const post = await adapter.findOne({
  model: "post",
  where: [{ field: "id", value: "post-123" }],
});

// Find multiple records
const publishedPosts = await adapter.findMany({
  model: "post",
  where: [{ field: "published", value: true }],
  limit: 10,
  offset: 0,
});

// Find with specific fields
const posts = await adapter.findMany({
  model: "post",
  select: ["id", "title", "createdAt"],
});

// Count records
const count = await adapter.count({
  model: "post",
  where: [{ field: "published", value: true }],
});
```

### Updating Records

```typescript
// Update a single record
const updated = await adapter.update({
  model: "post",
  where: [{ field: "id", value: "post-123" }],
  update: {
    title: "Updated Title",
    published: true,
  },
});

// Update multiple records
const count = await adapter.updateMany({
  model: "post",
  where: [{ field: "authorId", value: "user-123" }],
  update: {
    published: false,
  },
});
```

### Deleting Records

```typescript
// Delete a single record
await adapter.delete({
  model: "post",
  where: [{ field: "id", value: "post-123" }],
});

// Delete multiple records
const deletedCount = await adapter.deleteMany({
  model: "post",
  where: [{ field: "published", value: false }],
});
```

### Complex Queries

```typescript
// Multiple where conditions (AND logic)
const posts = await adapter.findMany({
  model: "post",
  where: [
    { field: "published", value: true },
    { field: "authorId", value: "user-123" },
  ],
  sortBy: {
    field: "createdAt",
    direction: "desc",
  },
  limit: 20,
});

// With relationships (if supported by adapter)
const authors = await adapter.findMany({
  model: "author",
  where: [{ field: "email", value: "user@example.com", operator: "contains" }],
});
```

### Adapter Methods Reference

All adapters provide these methods:

| Method | Description | Returns |
|--------|-------------|---------|
| `create` | Insert new record | Created record |
| `update` | Update single record | Updated record |
| `updateMany` | Update multiple records | Count of updated records |
| `delete` | Delete single record | `void` |
| `deleteMany` | Delete multiple records | Count of deleted records |
| `findOne` | Find single record | Record or `null` |
| `findMany` | Find multiple records | Array of records |
| `count` | Count records | Number |

For detailed adapter documentation, see [Better Auth Adapter Guide](https://www.better-auth.com/docs/guides/create-a-db-adapter).

## Field Types & Modifiers

Better DB provides a fluent API for defining database fields:

### Basic Types

```typescript
table("example", (t) => ({
  // Text fields
  title: t.text(),
  description: t.string(), // alias for text
  
  // Numbers
  count: t.number(),
  amount: t.integer(), // alias for number
  
  // Booleans  
  isActive: t.boolean(),
  
  // Dates
  createdAt: t.date(),
  updatedAt: t.timestamp(), // alias for date
  
  // JSON
  metadata: t.json(),
  
  // ID field (automatically added if not specified)
  id: t.id(),
}))
```

### Modifiers

```typescript
table("example", (t) => ({
  // ID field (automatically becomes primary key by convention)
  id: t.id(),
  
  // Constraints
  title: t.text().notNull(),
  subtitle: t.text().nullable(),
  email: t.text().unique(),
  
  // Default values
  isPublished: t.boolean().defaultValue(false),
  createdAt: t.timestamp().defaultNow(),
  
  // Foreign keys
  authorId: t.text().references("author"),
  categoryId: t.text().references("category", "id"),
}))
```

**Convention:** Fields named `id` are automatically treated as primary keys during migration generation. No explicit `primaryKey()` modifier needed!
```

## Plugin System

Extend your schema with reusable plugins:

### Using Built-in Plugins

```typescript
import { defineDb } from "@better-db/core";
import { commentsPlugin, timestampsPlugin } from "@better-db/plugins";

export const db = defineDb(({ table }) => ({
  Post: table("post", (t) => ({
    id: t.id().primaryKey(),
    title: t.text().notNull(),
    content: t.text().notNull(),
  })),
}))
.use(commentsPlugin)      // Adds Comment table
.use(timestampsPlugin);   // Adds Timestamp table
```

### Creating Custom Plugins

```typescript
import { createDbPlugin } from "@better-db/core";

export const tagsPlugin = createDbPlugin("tags", ({ table }) => ({
  Tag: table("tag", (t) => ({
    id: t.id(),
    name: t.text().notNull().unique(),
    color: t.text().nullable(),
  })),
  
  PostTag: table("post_tag", (t) => ({
    id: t.id(),
    postId: t.text().notNull().references("post"),
    tagId: t.text().notNull().references("tag"),
  })),
}));

// Use in your schema
const db = defineDb(({ table }) => ({
  // ... your tables
})).use(tagsPlugin);
```

## CLI Commands

### Initialize

Create a new schema file:

```bash
# Create db.ts in current directory
npx better-db init

# Create in custom location
npx better-db init --output=src/database/schema.ts
```

**Options:**
- `--output <path>` - Where to create the schema file (default: `db.ts`)
- `--cwd <dir>` - Working directory (default: current directory)

### Generate

Generate ORM schema files:

```bash
# Prisma
npx better-db generate --orm=prisma --output=prisma/schema.prisma

# Drizzle  
npx better-db generate --orm=drizzle --output=src/db/schema.ts

# Kysely
npx better-db generate --orm=kysely --output=src/db/types.ts

# Custom schema file location
npx better-db generate --config=src/database/schema.ts --orm=prisma

# Auto-detect ORM and use default paths (looks for db.ts in current directory)
npx better-db generate

# Skip confirmation prompts
npx better-db generate --yes
```

**Options:**
- `--config <path>` - Path to your better-db schema file (default: `db.ts`)
- `--output <path>` - Where to save generated schema
- `--orm <orm>` - Target ORM: `prisma`, `drizzle`, or `kysely`
- `--cwd <dir>` - Working directory (default: current directory)
- `--yes` / `-y` - Skip confirmation prompts

### Migrate

Run database migrations (Kysely adapter only):

```bash
# Run migrations using default schema (db.ts)
npx better-db migrate

# Run migrations with custom schema
npx better-db migrate --config=src/database/schema.ts

# Skip confirmation prompts
npx better-db migrate --yes
```

**Options:**
- `--config <path>` - Path to your better-db schema file (default: `db.ts`)
- `--cwd <dir>` - Working directory (default: current directory)
- `--yes` / `-y` - Skip confirmation prompts

**Note:** The `migrate` command only works with Kysely's built-in adapter. For Prisma or Drizzle:
- **Prisma:** Use `npx prisma migrate dev` or `npx prisma db push`
- **Drizzle:** Use `npx drizzle-kit push` or `npx drizzle-kit migrate`

## Available Adapters

All adapters are thin wrappers around Better Auth's proven adapter implementations:

### Prisma
```bash
npm install @better-db/adapter-prisma
```
```typescript
import { createPrismaAdapter } from "@better-db/adapter-prisma";
```

### Drizzle
```bash
npm install @better-db/adapter-drizzle
```
```typescript
import { createDrizzleAdapter } from "@better-db/adapter-drizzle";
```

### Kysely
```bash
npm install @better-db/adapter-kysely
```
```typescript
import { createKyselyAdapter } from "@better-db/adapter-kysely";
```

### Memory (for testing)
```bash
npm install @better-db/adapter-memory
```
```typescript
import { createMemoryAdapter } from "@better-db/adapter-memory";
```

### MongoDB
```bash
npm install @better-db/adapter-mongodb
```
```typescript
import { createMongoAdapter } from "@better-db/adapter-mongodb";
```

## Relationship with Better Auth

Better DB is intentionally designed as a thin wrapper around Better Auth's database layer. This approach provides several benefits:

### What We Keep
- ✅ All adapter implementations (Prisma, Drizzle, Kysely, etc.)
- ✅ CLI generation behavior and output formats  
- ✅ Field type system and validation
- ✅ Plugin architecture
- ✅ Database utilities and helpers

### What We Exclude
- ❌ User authentication tables (users, sessions, accounts)
- ❌ Auth-specific commands and models
- ❌ OAuth provider configurations
- ❌ Authentication middleware

### Upstream Sync Strategy

Better DB maintains alignment with Better Auth through:

1. **Wrapper Architecture**: Our packages re-export Better Auth internals rather than forking the logic
2. **Version Pinning**: `@better-db/*` versions track Better Auth minor versions (e.g., `@better-db/*@1.4.x` tracks `better-auth@1.4.x`)  
3. **Minimal Changes**: We only add thin abstraction layers while keeping the core logic intact
4. **Automated Testing**: Our CI ensures compatibility with the latest Better Auth releases

This means when Better Auth ships adapter improvements or new database features, Better DB automatically benefits from those updates.

## Migration from Better Auth

If you're already using Better Auth but only need the database functionality:

1. Replace `better-auth` imports with `@better-db/*` equivalents:
   ```typescript
   // Before
   import { createPrismaAdapter } from "better-auth/adapters/prisma";
   
   // After  
   import { createPrismaAdapter } from "@better-db/adapter-prisma";
   ```

2. Replace Better Auth config with Better DB schema:
   ```typescript
   // Before - Better Auth config
   export const auth = betterAuth({
     database: prismaClient,
     plugins: [/* auth plugins */]
   });
   
   // After - Better DB schema
   export const db = defineDb(({ table }) => ({
     // Your tables here
   }));
   ```

3. Update CLI commands:
   ```bash
   # Before
   npx @better-auth/cli generate
   
   # After
   npx better-db generate
   ```

## Complete Workflow Example

Here's a complete example showing schema definition, generation, and querying:

### 1. Define Your Schema

```typescript
// db.ts
import { defineDb } from "@better-db/core";

export const db = defineDb(({ table }) => ({
  Post: table("post", (t) => ({
    id: t.id(),
    title: t.text().notNull(),
    content: t.text().notNull(),
    published: t.boolean().defaultValue(false),
    authorId: t.text().notNull(),
    createdAt: t.timestamp().defaultNow(),
  })),
  
  Author: table("author", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
  })),
}));

export default db;
```

### 2. Generate Database Schema

```bash
# Generate Prisma schema
npx better-db generate --orm=prisma --output=prisma/schema.prisma

# Then run Prisma migrations
npx prisma migrate dev --name init
```

### 3. Query Your Database

```typescript
// app.ts
import { prismaAdapter } from "@better-db/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const adapter = prismaAdapter(prisma)({});

// Create an author
const author = await adapter.create({
  model: "author",
  data: {
    name: "Jane Doe",
    email: "jane@example.com",
  },
});

// Create a post
const post = await adapter.create({
  model: "post",
  data: {
    title: "Getting Started with Better DB",
    content: "Better DB makes database management simple...",
    published: true,
    authorId: author.id,
  },
});

// Query posts
const publishedPosts = await adapter.findMany({
  model: "post",
  where: [{ field: "published", value: true }],
  sortBy: { field: "createdAt", direction: "desc" },
});

// Update a post
await adapter.update({
  model: "post",
  where: [{ field: "id", value: post.id }],
  update: { published: false },
});

// Count posts by author
const postCount = await adapter.count({
  model: "post",
  where: [{ field: "authorId", value: author.id }],
});

console.log(`Author has ${postCount} posts`);
```

## Examples

### Blog Platform

```typescript
import { defineDb } from "@better-db/core";
import { commentsPlugin } from "@better-db/plugins";

export const blogDb = defineDb(({ table }) => ({
  Post: table("post", (t) => ({
    id: t.id(),
    title: t.text().notNull(),
    slug: t.text().notNull().unique(),
    content: t.text().notNull(),
    excerpt: t.text().nullable(),
    published: t.boolean().defaultValue(false),
    publishedAt: t.timestamp().nullable(),
    authorId: t.text().notNull().references("author"),
    categoryId: t.text().nullable().references("category"),
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t.timestamp().defaultNow(),
  })),

  Author: table("author", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    bio: t.text().nullable(),
    avatar: t.text().nullable(),
    website: t.text().nullable(),
  })),

  Category: table("category", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    slug: t.text().notNull().unique(),
    description: t.text().nullable(),
    parentId: t.text().nullable().references("category"),
  })),
})).use(commentsPlugin);
```

### E-commerce Store

```typescript
import { defineDb } from "@better-db/core";

export const storeDb = defineDb(({ table }) => ({
  Product: table("product", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    slug: t.text().notNull().unique(),
    description: t.text().nullable(),
    price: t.number().notNull(),
    compareAtPrice: t.number().nullable(),
    sku: t.text().nullable().unique(),
    inventory: t.number().defaultValue(0),
    isActive: t.boolean().defaultValue(true),
    categoryId: t.text().nullable().references("category"),
  })),

  Category: table("category", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    slug: t.text().notNull().unique(),
    parentId: t.text().nullable().references("category"),
  })),

  Order: table("order", (t) => ({
    id: t.id(),
    orderNumber: t.text().notNull().unique(),
    customerId: t.text().notNull().references("customer"),
    status: t.text().notNull().defaultValue("pending"),
    total: t.number().notNull(),
    shippingAddress: t.json().nullable(),
    billingAddress: t.json().nullable(),
    createdAt: t.timestamp().defaultNow(),
  })),

  OrderItem: table("order_item", (t) => ({
    id: t.id(),
    orderId: t.text().notNull().references("order"),
    productId: t.text().notNull().references("product"),
    quantity: t.number().notNull(),
    price: t.number().notNull(),
  })),

  Customer: table("customer", (t) => ({
    id: t.id(),
    email: t.text().notNull().unique(),
    firstName: t.text().nullable(),
    lastName: t.text().nullable(),
    phone: t.text().nullable(),
  })),
}));
```

## Contributing

Better DB is designed to stay closely aligned with Better Auth. When contributing:

1. **Keep Changes Minimal**: Prefer thin wrappers over logic changes
2. **Test Upstream Compatibility**: Ensure changes work with latest Better Auth
3. **Update Documentation**: Keep examples and guides current
4. **Follow Better Auth Patterns**: Match their conventions and APIs

## License

MIT - Same as Better Auth

## Support

- **Documentation**: [Better Auth Database Docs](https://better-auth.com/docs/concepts/database)
- **Issues**: [GitHub Issues](https://github.com/better-auth/better-auth/issues)
- **Discussions**: [GitHub Discussions](https://github.com/better-auth/better-auth/discussions)

---

**Better DB** - Database utilities powered by Better Auth, without the auth complexity.