import type { DbTable, TableBuilder } from "./types";
import { createFieldBuilderFactory } from "./field-builder";

export function table(name: string, builder: TableBuilder): DbTable {
	const fieldBuilderFactory = createFieldBuilderFactory();
	const fieldBuilders = builder(fieldBuilderFactory);

	// Prohibit users from defining "id" field - Better Auth handles it automatically
	if (fieldBuilders.id) {
		throw new Error(
			`Table "${name}": Do not define "id" field explicitly. Better Auth automatically adds it as the primary key.`,
		);
	}

	// Convert field builders to actual field attributes
	// Add id field for internal schema (getSchema() will include it)
	const fields: Record<string, any> = {
		id: {
			type: "string",
			required: true,
		},
	};

	for (const [fieldName, fieldBuilder] of Object.entries(fieldBuilders)) {
		fields[fieldName] = fieldBuilder._build();
	}

	return {
		modelName: name,
		fields,
	};
}
