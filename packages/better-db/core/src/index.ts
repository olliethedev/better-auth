// Re-export types and utilities from Better Auth that we need
export type {
	DBFieldAttribute,
	DBFieldAttributeConfig,
	DBFieldType,
	DBPrimitive,
	BetterAuthDBSchema,
} from "@better-auth/core/db";

// Re-export useful utilities from Better Auth
export { createFieldAttribute } from "better-auth/db";

// Export our new DSL and plugin system
export { defineDb } from "./define-db";
export { createDbPlugin } from "./plugin";
export { table } from "./table";

// Export types for better DX
export type {
	DbSchema,
	DbTable,
	DbPlugin,
	TableBuilder,
	FieldBuilder,
	Adapter,
} from "./types";
