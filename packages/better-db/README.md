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
    id: t.id().primaryKey(),
    title: t.text().notNull(),
    content: t.text().notNull(),
    published: t.boolean().defaultValue(false),
    authorId: t.text().notNull().index(),
    createdAt: t.timestamp().defaultNow(),
    updatedAt: t.timestamp().defaultNow(),
  })),

  Author: table("author", (t) => ({
    id: t.id().primaryKey(),
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

```typescript
import { createPrismaAdapter } from "@better-db/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const adapter = createPrismaAdapter(prisma);

// Use the adapter with your database operations
const posts = await adapter.findMany({
  model: "Post",
  where: { published: true }
});
```

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
  // Primary key
  id: t.id().primaryKey(),
  
  // Constraints
  title: t.text().notNull(),
  subtitle: t.text().nullable(),
  email: t.text().unique(),
  
  // Indexes
  userId: t.text().index(),
  
  // Default values
  isPublished: t.boolean().defaultValue(false),
  createdAt: t.timestamp().defaultNow(),
  
  // Foreign keys
  authorId: t.text().references("author"),
  categoryId: t.text().references("category", "id"),
}))
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
    id: t.id().primaryKey(),
    name: t.text().notNull().unique(),
    color: t.text().nullable(),
  })),
  
  PostTag: table("post_tag", (t) => ({
    id: t.id().primaryKey(),
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
npx better-db init
npx better-db init --output=src/database.ts
```

### Generate

Generate ORM schema files:

```bash
# Prisma
npx better-db generate --orm=prisma --output=prisma/schema.prisma

# Drizzle  
npx better-db generate --orm=drizzle --output=src/db/schema.ts

# Kysely
npx better-db generate --orm=kysely --output=src/db/types.ts

# Auto-detect ORM and use default paths
npx better-db generate

# Skip confirmation prompts
npx better-db generate --yes
```

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

## Examples

### Blog Platform

```typescript
import { defineDb } from "@better-db/core";
import { commentsPlugin } from "@better-db/plugins";

export const blogDb = defineDb(({ table }) => ({
  Post: table("post", (t) => ({
    id: t.id().primaryKey(),
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
    id: t.id().primaryKey(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    bio: t.text().nullable(),
    avatar: t.text().nullable(),
    website: t.text().nullable(),
  })),

  Category: table("category", (t) => ({
    id: t.id().primaryKey(),
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
    id: t.id().primaryKey(),
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
    id: t.id().primaryKey(),
    name: t.text().notNull(),
    slug: t.text().notNull().unique(),
    parentId: t.text().nullable().references("category"),
  })),

  Order: table("order", (t) => ({
    id: t.id().primaryKey(),
    orderNumber: t.text().notNull().unique(),
    customerId: t.text().notNull().references("customer"),
    status: t.text().notNull().defaultValue("pending"),
    total: t.number().notNull(),
    shippingAddress: t.json().nullable(),
    billingAddress: t.json().nullable(),
    createdAt: t.timestamp().defaultNow(),
  })),

  OrderItem: table("order_item", (t) => ({
    id: t.id().primaryKey(),
    orderId: t.text().notNull().references("order"),
    productId: t.text().notNull().references("product"),
    quantity: t.number().notNull(),
    price: t.number().notNull(),
  })),

  Customer: table("customer", (t) => ({
    id: t.id().primaryKey(),
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