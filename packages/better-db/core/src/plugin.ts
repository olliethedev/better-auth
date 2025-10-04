import type { DbPlugin, DbPluginFactory } from "./types";
import { table } from "./table";

export function createDbPlugin(
	name: string,
	factory: DbPluginFactory,
): DbPlugin {
	const tables = factory({ table });

	return {
		name,
		tables,
	};
}
