import type { DbSchema, DefineDbFactory, DbPlugin } from "./types";
import { table } from "./table";

export interface DefineDbResult {
  schema: DbSchema;
  use(plugin: DbPlugin): DefineDbResult;
  getSchema(): DbSchema;
  // Convert to Better Auth format for CLI compatibility
  toBetterAuthSchema(): any;
}

class DefineDbResultImpl implements DefineDbResult {
  constructor(public schema: DbSchema) {}

  use(plugin: DbPlugin): DefineDbResult {
    const mergedSchema = { ...this.schema };
    
    // Merge plugin tables into the main schema
    for (const [tableName, table] of Object.entries(plugin.tables)) {
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
    
    return new DefineDbResultImpl(mergedSchema);
  }

  getSchema(): DbSchema {
    return this.schema;
  }

  // Convert to the format that Better Auth CLI expects
  toBetterAuthSchema(): any {
    const betterAuthSchema: any = {};
    
    for (const [tableName, table] of Object.entries(this.schema)) {
      betterAuthSchema[tableName] = {
        fields: table.fields,
        modelName: table.modelName,
        order: table.order,
        disableMigrations: table.disableMigrations,
      };
    }
    
    return betterAuthSchema;
  }
}

export function defineDb(factory: DefineDbFactory): DefineDbResult {
  const schema = factory({ table });
  return new DefineDbResultImpl(schema);
}