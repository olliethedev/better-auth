#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { generateCommand } from "./commands/generate";
import { initCommand } from "./commands/init";

// Handle exit
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
	const program = new Command("better-db");

	program
		.addCommand(generateCommand)
		.addCommand(initCommand)
		.version("1.4.0-beta.6")
		.description("Better DB CLI - Database utilities without auth domain")
		.action(() => program.help());

	program.parse();
}

main().catch((error) => {
	console.error(chalk.red("Error running Better DB CLI:"), error);
	process.exit(1);
});
