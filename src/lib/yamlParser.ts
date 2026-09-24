import * as yaml from "js-yaml";
import type {
  Column,
  ColumnType,
  ForeignKey,
  ParseResult,
  SchemaDocument,
  TableDefinition,
} from "@/types/schema";

const VALID_TYPES: ColumnType[] = [
  "uuid",
  "text",
  "varchar",
  "integer",
  "bigint",
  "boolean",
  "timestamp",
  "timestamptz",
  "date",
  "numeric",
  "json",
  "jsonb",
  "serial",
  "bigserial",
];

const VALID_ON_DELETE = ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"];

export function parseYaml(yamlText: string): ParseResult {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = yaml.load(yamlText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { schema: null, errors: [`YAML syntax error: ${msg}`] };
  }

  if (parsed === null || parsed === undefined) {
    return { schema: null, errors: ["YAML content is empty"] };
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    return { schema: null, errors: ["Root must be an object with a 'tables' array"] };
  }

  const root = parsed as Record<string, unknown>;
  const tablesRaw = root.tables;

  if (!Array.isArray(tablesRaw)) {
    return { schema: null, errors: ["'tables' must be an array"] };
  }

  const tables: TableDefinition[] = [];

  tablesRaw.forEach((t, i) => {
    const prefix = `Table #${i + 1}`;
    if (typeof t !== "object" || t === null || Array.isArray(t)) {
      errors.push(`${prefix}: must be an object`);
      return;
    }

    const tObj = t as Record<string, unknown>;
    const tableName = tObj.table;
    if (typeof tableName !== "string" || !tableName.trim()) {
      errors.push(`${prefix}: missing or invalid 'table' name`);
      return;
    }

    const colsRaw = tObj.columns;
    if (!Array.isArray(colsRaw) || colsRaw.length === 0) {
      errors.push(`Table "${tableName}": must have at least one column`);
      return;
    }

    const columns: Column[] = [];
    colsRaw.forEach((c, ci) => {
      const cPrefix = `Table "${tableName}" column #${ci + 1}`;
      if (typeof c !== "object" || c === null || Array.isArray(c)) {
        errors.push(`${cPrefix}: must be an object`);
        return;
      }
      const cObj = c as Record<string, unknown>;
      const colName = cObj.name;
      if (typeof colName !== "string" || !colName.trim()) {
        errors.push(`${cPrefix}: missing or invalid 'name'`);
        return;
      }
      const colType = cObj.type as unknown;
      if (typeof colType !== "string" || !VALID_TYPES.includes(colType as ColumnType)) {
        errors.push(
          `${cPrefix} ("${colName}"): invalid type "${colType}". Valid: ${VALID_TYPES.join(", ")}`,
        );
        return;
      }
      const column: Column = {
        name: colName,
        type: colType as ColumnType,
      };
      if (typeof cObj.length === "number") column.length = cObj.length;
      if (typeof cObj.nullable === "boolean") column.nullable = cObj.nullable;
      if (typeof cObj.default === "string") column.default = cObj.default;
      if (typeof cObj.primaryKey === "boolean") column.primaryKey = cObj.primaryKey;
      if (typeof cObj.unique === "boolean") column.unique = cObj.unique;
      if (typeof cObj.comment === "string") column.comment = cObj.comment;

      if (cObj.foreignKey && typeof cObj.foreignKey === "object" && !Array.isArray(cObj.foreignKey)) {
        const fk = cObj.foreignKey as Record<string, unknown>;
        if (typeof fk.table !== "string" || typeof fk.column !== "string") {
          errors.push(`${cPrefix} ("${colName}"): foreignKey requires 'table' and 'column'`);
        } else {
          column.foreignKey = {
            table: fk.table,
            column: fk.column,
          };
          if (typeof fk.onDelete === "string") {
            if (VALID_ON_DELETE.includes(fk.onDelete)) {
              column.foreignKey.onDelete = fk.onDelete as ForeignKey["onDelete"];
            } else {
              errors.push(
                `${cPrefix} ("${colName}"): invalid onDelete "${fk.onDelete}". Valid: ${VALID_ON_DELETE.join(", ")}`,
              );
            }
          }
        }
      }
      columns.push(column);
    });

    const table: TableDefinition = { table: tableName, columns };
    if (typeof tObj.comment === "string") table.comment = tObj.comment;

    if (Array.isArray(tObj.indexes)) {
      table.indexes = tObj.indexes
        .filter((idx): idx is Record<string, unknown> => typeof idx === "object" && idx !== null && !Array.isArray(idx))
        .map((idx) => {
          const index = {
            name: String(idx.name ?? ""),
            columns: Array.isArray(idx.columns) ? idx.columns.map(String) : [],
            unique: typeof idx.unique === "boolean" ? idx.unique : undefined,
          };
          return index;
        });
    }

    tables.push(table);
  });

  if (errors.length > 0) {
    return { schema: null, errors };
  }

  const schema: SchemaDocument = { tables };
  if (typeof root.version === "string") schema.version = root.version;
  if (typeof root.description === "string") schema.description = root.description;

  return { schema, errors: [] };
}
