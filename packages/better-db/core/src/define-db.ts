import type { BetterAuthDBSchema } from "@better-auth/core/db";
import type { DbPlugin } from "./types";

export interface DefineDbResult {
	schema: BetterAuthDBSchema;
	plugins: DbPlugin[];
	getSchema(): BetterAuthDBSchema;
	use(plugin: DbPlugin): DefineDbResult;
}

class DefineDbResultImpl implements DefineDbResult {
	constructor(
		public schema: BetterAuthDBSchema,
		public plugins: DbPlugin[] = [],
	) {}

	use(plugin: DbPlugin): DefineDbResult {
		const mergedSchema = { ...this.schema };

		// Merge plugin tables into the main schema
		for (const [tableName, table] of Object.entries(plugin.schema)) {
			if (mergedSchema[tableName]) {
				// Merge fields if table already exists
				mergedSchema[tableName] = {
					...mergedSchema[tableName],
					fields: {
						...mergedSchema[tableName].fields,
						...table.fields,
					},
				};
			} else {
				mergedSchema[tableName] = table;
			}
		}

		return new DefineDbResultImpl(mergedSchema, [...this.plugins, plugin]);
	}

	getSchema(): BetterAuthDBSchema {
		return this.schema;
	}
}

export function defineDb(
	schema: BetterAuthDBSchema,
	options?: { plugins?: DbPlugin[] },
): DefineDbResult {
	let result = new DefineDbResultImpl(schema);

	if (options?.plugins) {
		for (const plugin of options.plugins) {
			result = result.use(plugin);
		}
	}

	return result;
}
