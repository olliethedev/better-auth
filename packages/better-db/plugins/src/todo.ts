import { createDbPlugin } from "@better-db/core";

/**
 * Todo plugin - adds a todos table to any schema for testing purposes
 *
 * Usage:
 * ```ts
 * import { defineDb } from "@better-db/core";
 * import { todoPlugin } from "@better-db/plugins";
 *
 * const db = defineDb({
 *   post: {
 *     modelName: "post",
 *     fields: { title: { type: "string", required: true } },
 *   },
 * }).use(todoPlugin);
 * ```
 */
export const todoPlugin = createDbPlugin("todo", {
	todo: {
		modelName: "todo",
		fields: {
			title: {
				type: "string",
				required: true,
			},
			description: {
				type: "string",
				required: false,
			},
			completed: {
				type: "boolean",
				defaultValue: false,
			},
			userId: {
				type: "string",
				required: true,
			},
			createdAt: {
				type: "date",
				defaultValue: () => new Date(),
			},
		},
	},
});
