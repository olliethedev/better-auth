import type { 
  DBFieldAttribute, 
  DBFieldType,
  DBFieldAttributeConfig 
} from "@better-auth/core/db";
import type { FieldBuilder, FieldBuilderFactory } from "./types";

class FieldBuilderImpl implements FieldBuilder {
  private fieldType: DBFieldType = "string";
  private config: DBFieldAttributeConfig = {};

  constructor(type?: DBFieldType) {
    if (type) {
      this.fieldType = type;
    }
  }

  // Basic types
  id(): FieldBuilder {
    this.fieldType = "string";
    this.config.required = true;
    return this;
  }

  text(): FieldBuilder {
    this.fieldType = "string";
    return this;
  }

  string(): FieldBuilder {
    this.fieldType = "string";
    return this;
  }

  number(): FieldBuilder {
    this.fieldType = "number";
    return this;
  }

  integer(): FieldBuilder {
    this.fieldType = "number";
    return this;
  }

  boolean(): FieldBuilder {
    this.fieldType = "boolean";
    return this;
  }

  date(): FieldBuilder {
    this.fieldType = "date";
    return this;
  }

  timestamp(): FieldBuilder {
    this.fieldType = "date";
    return this;
  }

  json(): FieldBuilder {
    this.fieldType = "json";
    return this;
  }

  // Modifiers
  primaryKey(): FieldBuilder {
    this.config.primaryKey = true;
    this.config.required = true;
    return this;
  }

  notNull(): FieldBuilder {
    this.config.required = true;
    return this;
  }

  nullable(): FieldBuilder {
    this.config.required = false;
    return this;
  }

  unique(): FieldBuilder {
    this.config.unique = true;
    return this;
  }

  index(): FieldBuilder {
    this.config.index = true;
    return this;
  }

  defaultValue(value: any): FieldBuilder {
    this.config.defaultValue = value;
    return this;
  }

  defaultNow(): FieldBuilder {
    if (this.fieldType === "date") {
      this.config.defaultValue = () => new Date();
    } else {
      this.config.defaultValue = () => Date.now();
    }
    return this;
  }

  references(model: string, field: string = "id"): FieldBuilder {
    this.config.references = {
      model,
      field,
      onDelete: "cascade"
    };
    return this;
  }

  _build(): DBFieldAttribute {
    return {
      type: this.fieldType,
      ...this.config
    };
  }
}

export const createFieldBuilderFactory = (): FieldBuilderFactory => ({
  id: () => new FieldBuilderImpl("string").id(),
  text: () => new FieldBuilderImpl("string"),
  string: () => new FieldBuilderImpl("string"),
  number: () => new FieldBuilderImpl("number"),
  integer: () => new FieldBuilderImpl("number"),
  boolean: () => new FieldBuilderImpl("boolean"),
  date: () => new FieldBuilderImpl("date"),
  timestamp: () => new FieldBuilderImpl("date"),
  json: () => new FieldBuilderImpl("json"),
});