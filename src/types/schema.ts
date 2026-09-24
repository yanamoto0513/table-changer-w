export type ColumnType =
  | "uuid"
  | "text"
  | "varchar"
  | "integer"
  | "bigint"
  | "boolean"
  | "timestamp"
  | "timestamptz"
  | "date"
  | "numeric"
  | "json"
  | "jsonb"
  | "serial"
  | "bigserial";

export interface ForeignKey {
  table: string;
  column: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface Column {
  name: string;
  type: ColumnType;
  length?: number;
  nullable?: boolean;
  default?: string;
  primaryKey?: boolean;
  unique?: boolean;
  foreignKey?: ForeignKey;
  comment?: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface TableDefinition {
  table: string;
  comment?: string;
  columns: Column[];
  indexes?: Index[];
}

export interface SchemaDocument {
  version?: string;
  description?: string;
  tables: TableDefinition[];
}

export interface ParseResult {
  schema: SchemaDocument | null;
  errors: string[];
}
