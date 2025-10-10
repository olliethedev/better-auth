# Better DB

**Database utilities without the auth domain—a focused fork of Better Auth's database layer.**

Better DB gives you Better Auth's proven adapter pattern and CLI-driven schema generation, focused purely on database management.

## Features

- 🎯 **Focused** — Database utilities without auth complexity
- 🔄 **Upstream Syncable** — Stays aligned with Better Auth updates
- 🔧 **Battle-tested** — Built on Better Auth's proven architecture
- 🚀 **Multi-ORM** — Prisma, Drizzle, Kysely, MongoDB, and more
- 🔌 **Extensible** — Plugin system for custom tables
- ⚡ **CLI-driven** — Generate schemas with a single command

## Quick Start

```bash
# Install core and your preferred adapter
npm install @better-db/core @better-db/adapter-prisma
npm install -D @better-db/cli
```

Define your schema:

```typescript
// db.ts
import { defineDb } from "@better-db/core";

export const db = defineDb(({ table }) => ({
  post: table("post", (t) => ({
    id: t.id(),
    title: t.text().notNull(),
    content: t.text().notNull(),
    published: t.boolean().defaultValue(false),
    authorId: t.text().notNull(),
    createdAt: t.timestamp().defaultNow(),
  })),

  author: table("author", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
  })),
}));

export default db;
```

Generate and run migrations:

```bash
# Generate Prisma schema
npx better-db generate --config=db.ts --orm=prisma --output=schema.prisma

# Or for Kysely (requires database connection)
DATABASE_URL=sqlite:./dev.db npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql
# Or: npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql --database-url=sqlite:./dev.db

# Run migrations
npx prisma migrate dev
```

Use in your app:

```typescript
import { prismaAdapter } from "@better-db/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const adapter = prismaAdapter(prisma)({});

// Create
await adapter.create({
  model: "post",
  data: { title: "Hello", content: "World", authorId: "1" },
});

// Query
const posts = await adapter.findMany({
  model: "post",
  where: [{ field: "published", value: true }],
});
```

## CLI Commands

### Initialize

```bash
npx better-db init [--output=db.ts]
```

### Generate

```bash
# Prisma
npx better-db generate --config=db.ts --orm=prisma --output=schema.prisma

# Drizzle
npx better-db generate --config=db.ts --orm=drizzle --output=src/db/schema.ts

# Kysely (requires database connection for introspection)
# Using DATABASE_URL environment variable
DATABASE_URL=sqlite:./dev.db npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql

# Or using --database-url flag
npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql --database-url=sqlite:./dev.db
npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql --database-url=postgres://user:pass@localhost:5432/db

# Filter auth tables (User, Session, Account, Verification)
npx better-db generate --config=db.ts --orm=prisma --output=schema.prisma --filter-auth
```

### Migrate

```bash
# Kysely only - for Prisma/Drizzle use their native tools
# Using DATABASE_URL environment variable or --database-url param
DATABASE_URL=sqlite:./dev.db npx better-db migrate --config=db.ts

# Or using --database-url flag
npx better-db migrate --config=db.ts --database-url=sqlite:./dev.db
npx better-db migrate --config=db.ts --database-url=postgres://user:pass@localhost:5432/db

# Generate SQL to file instead of running migrations
npx better-db migrate --config=db.ts --output=migrations.sql --database-url=sqlite:./dev.db

# Filter auth tables (User, Session, Account, Verification)
npx better-db migrate --config=db.ts --output=migrations.sql --filter-auth --database-url=sqlite:./dev.db
```

## Field Types

```typescript
table("example", (t) => ({
  // Basic types
  text: t.text(),
  number: t.number(),
  boolean: t.boolean(),
  date: t.date(),
  json: t.json(),
  
  // ID field (auto primary key)
  id: t.id(),
  
  // Modifiers
  required: t.text().notNull(),
  optional: t.text().nullable(),
  unique: t.text().unique(),
  
  // Defaults
  active: t.boolean().defaultValue(false),
  createdAt: t.timestamp().defaultNow(),
  
  // References
  userId: t.text().references("user"),
}))
```

## Adapter API

All adapters provide these methods:

```typescript
// Create
adapter.create({ model: "post", data: {...} })

// Read
adapter.findOne({ model: "post", where: [...] })
adapter.findMany({ model: "post", where: [...], limit: 10 })
adapter.count({ model: "post", where: [...] })

// Update
adapter.update({ model: "post", where: [...], update: {...} })
adapter.updateMany({ model: "post", where: [...], update: {...} })

// Delete
adapter.delete({ model: "post", where: [...] })
adapter.deleteMany({ model: "post", where: [...] })
```

See [Better Auth Adapter Guide](https://www.better-auth.com/docs/guides/create-a-db-adapter) for details.

## Plugins

Extend your schema with reusable plugins:

```typescript
import { defineDb } from "@better-db/core";
import { commentsPlugin } from "@better-db/plugins";

export const db = defineDb(({ table }) => ({
  // your tables
})).use(commentsPlugin);
```

Create custom plugins:

```typescript
import { createDbPlugin } from "@better-db/core";

export const tagsPlugin = createDbPlugin("tags", ({ table }) => ({
  tag: table("tag", (t) => ({
    id: t.id(),
    name: t.text().notNull().unique(),
  })),
}));
```

## Available Adapters

```bash
npm install @better-db/adapter-prisma    # Prisma
npm install @better-db/adapter-drizzle   # Drizzle
npm install @better-db/adapter-kysely    # Kysely
npm install @better-db/adapter-memory    # Memory (testing)
npm install @better-db/adapter-mongodb   # MongoDB
```

## Relationship with Better Auth

Better DB is a thin wrapper around Better Auth's database layer:

**What we keep:**
- ✅ All adapter implementations
- ✅ CLI generation behavior
- ✅ Field type system
- ✅ Plugin architecture

**What we exclude:**
- ❌ Auth tables (user, session, account)
- ❌ OAuth configurations
- ❌ Authentication middleware

**Versioning:** `@better-db/*@1.4.x` tracks `better-auth@1.4.x`

## Migration from Better Auth

Replace imports:

```typescript
// Before
import { prismaAdapter } from "better-auth/adapters/prisma";

// After
import { prismaAdapter } from "@better-db/adapter-prisma";
```

Replace config with schema:

```typescript
// Before
export const auth = betterAuth({
  database: prismaClient,
  plugins: [...]
});

// After
export const db = defineDb(({ table }) => ({
  // your tables
}));
```

Update CLI:

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

export const db = defineDb(({ table }) => ({
  post: table("post", (t) => ({
    id: t.id(),
    title: t.text().notNull(),
    slug: t.text().notNull().unique(),
    content: t.text().notNull(),
    published: t.boolean().defaultValue(false),
    authorId: t.text().notNull().references("author"),
    createdAt: t.timestamp().defaultNow(),
  })),

  author: table("author", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    bio: t.text().nullable(),
  })),

  category: table("category", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    slug: t.text().notNull().unique(),
  })),
}));
```

### E-commerce

```typescript
export const db = defineDb(({ table }) => ({
  product: table("product", (t) => ({
    id: t.id(),
    name: t.text().notNull(),
    slug: t.text().notNull().unique(),
    price: t.number().notNull(),
    inventory: t.number().defaultValue(0),
    categoryId: t.text().nullable().references("category"),
  })),

  order: table("order", (t) => ({
    id: t.id(),
    orderNumber: t.text().notNull().unique(),
    customerId: t.text().notNull().references("customer"),
    status: t.text().notNull().defaultValue("pending"),
    total: t.number().notNull(),
    createdAt: t.timestamp().defaultNow(),
  })),

  orderItem: table("order_item", (t) => ({
    id: t.id(),
    orderId: t.text().notNull().references("order"),
    productId: t.text().notNull().references("product"),
    quantity: t.number().notNull(),
    price: t.number().notNull(),
  })),
}));
```

## Resources

- [Better Auth Docs](https://better-auth.com/docs/concepts/database)
- [GitHub Issues](https://github.com/better-auth/better-auth/issues)
- [Discussions](https://github.com/better-auth/better-auth/discussions)

## License

MIT
