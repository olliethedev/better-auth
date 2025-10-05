import type { DbTable, TableBuilder } from "./types";
import { createFieldBuilderFactory } from "./field-builder";

export function table(name: string, builder: TableBuilder): DbTable {
	const fieldBuilderFactory = createFieldBuilderFactory();
	const fieldBuilders = builder(fieldBuilderFactory);

	// Convert field builders to actual field attributes
	const fields: Record<string, any> = {};

	// Always add an id field if not explicitly defined
	// Note: "id" fields automatically become primary keys by Better Auth convention
	if (!fieldBuilders.id) {
		fieldBuilders.id = fieldBuilderFactory.id();
	}

	for (const [fieldName, fieldBuilder] of Object.entries(fieldBuilders)) {
		fields[fieldName] = fieldBuilder._build();
	}

	return {
		modelName: name,
		fields,
	};
}
