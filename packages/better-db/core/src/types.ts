import type { BetterAuthDBSchema } from "@better-auth/core/db";

export type { DefineDbResult } from "./define-db";
export type { Adapter } from "better-auth/types";

export interface DbPlugin {
	name: string;
	schema: BetterAuthDBSchema;
}
