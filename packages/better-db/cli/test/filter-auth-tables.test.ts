import { describe, it, expect } from "vitest";
import {
	filterPrismaAuthTables,
	filterDrizzleAuthTables,
	filterKyselyAuthTables,
} from "../src/utils/filter-auth-tables";

describe("Filter Auth Tables", () => {
	describe("Prisma", () => {
		it("should remove User, Session, Account tables", () => {
			const input = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id      String @id
  email   String @unique
  name    String
  posts   Post[]
  
  @@map("user")
}

model Session {
  id        String @id
  userId    String
  user      User   @relation(fields: [userId], references: [id])
  
  @@map("session")
}

model Post {
  id      String @id
  title   String
  content String
  
  @@map("post")
}
`;

			const output = filterPrismaAuthTables(input);

			expect(output).not.toContain("model User");
			expect(output).not.toContain("model Session");
			expect(output).toContain("model Post");
			expect(output).toContain("title");
		});

		it("should keep custom tables intact", () => {
			const input = `
model User {
  id String @id
}

model Product {
  id    String @id
  name  String
  price Int
}

model Comment {
  id      String @id
  content String
}
`;

			const output = filterPrismaAuthTables(input);

			expect(output).not.toContain("model User");
			expect(output).toContain("model Product");
			expect(output).toContain("model Comment");
			expect(output).toContain("price");
		});
	});

	describe("Drizzle", () => {
		it("should remove User, Session, Account tables", () => {
			const input = `
import { pgTable, text } from "drizzle-orm/pg-core";

export const User = pgTable("user", {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
});

export const Session = pgTable("session", {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
});

export const Post = pgTable("post", {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
});
`;

			const output = filterDrizzleAuthTables(input);

			expect(output).not.toContain("export const User");
			expect(output).not.toContain("export const Session");
			expect(output).toContain("export const Post");
			expect(output).toContain("title");
		});
	});

	describe("Kysely", () => {
		it("should remove CREATE TABLE statements for auth tables", () => {
			const input = `
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL
);

CREATE TABLE post (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL
);
`;

			const output = filterKyselyAuthTables(input);

			expect(output).not.toContain("CREATE TABLE user");
			expect(output).not.toContain("CREATE TABLE session");
			expect(output).toContain("CREATE TABLE post");
			expect(output).toContain("title");
		});

		it("should handle quoted table names", () => {
			const input = `
CREATE TABLE "user" (id TEXT);
CREATE TABLE "post" (id TEXT);
CREATE TABLE "comment" (id TEXT);
`;

			const output = filterKyselyAuthTables(input);

			expect(output).not.toContain('TABLE "user"');
			expect(output).toContain('TABLE "post"');
			expect(output).toContain('TABLE "comment"');
		});
	});
});
