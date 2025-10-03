import type { 
  BetterAuthDBSchema, 
  DBFieldAttribute, 
  DBFieldType, 
  DBFieldAttributeConfig 
} from "@better-auth/core/db";

// Type for a single table definition
export interface DbTable {
  modelName: string;
  fields: Record<string, DBFieldAttribute>;
  order?: number;
  disableMigrations?: boolean;
}

// Type for the entire database schema
export type DbSchema = Record<string, DbTable>;

// Plugin interface for better-db
export interface DbPlugin {
  name: string;
  tables: DbSchema;
}

// Field builder interface for the fluent API
export interface FieldBuilder {
  // Basic types
  id(): FieldBuilder;
  text(): FieldBuilder;
  string(): FieldBuilder;
  number(): FieldBuilder;
  integer(): FieldBuilder;
  boolean(): FieldBuilder;
  date(): FieldBuilder;
  timestamp(): FieldBuilder;
  json(): FieldBuilder;
  
  // Modifiers
  primaryKey(): FieldBuilder;
  notNull(): FieldBuilder;
  nullable(): FieldBuilder;
  unique(): FieldBuilder;
  index(): FieldBuilder;
  defaultValue(value: any): FieldBuilder;
  defaultNow(): FieldBuilder;
  
  // References
  references(table: string, field?: string): FieldBuilder;
  
  // Internal method to build the field attribute
  _build(): DBFieldAttribute;
}

// Table builder interface 
export interface TableBuilder {
  (fieldBuilder: FieldBuilderFactory): Record<string, FieldBuilder>;
}

// Factory for creating field builders
export interface FieldBuilderFactory {
  id(): FieldBuilder;
  text(): FieldBuilder;
  string(): FieldBuilder;
  number(): FieldBuilder;
  integer(): FieldBuilder;
  boolean(): FieldBuilder;
  date(): FieldBuilder;
  timestamp(): FieldBuilder;
  json(): FieldBuilder;
}

// Plugin definition function interface
export interface DbPluginFactory {
  (tableFactory: { table: (name: string, builder: TableBuilder) => DbTable }): DbSchema;
}

// defineDb function interface
export interface DefineDbOptions {
  plugins?: DbPlugin[];
}

export interface DefineDbFactory {
  (tableFactory: { table: (name: string, builder: TableBuilder) => DbTable }): DbSchema;
}