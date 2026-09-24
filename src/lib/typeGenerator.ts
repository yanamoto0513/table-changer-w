import type { Column, SchemaDocument, TableDefinition } from "@/types/schema";

function toPascalCase(s: string): string {
  return s
    .replace(/(^|_)(.)/g, (_m, _sep, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_m, c: string) => c.toUpperCase());
}

function tsType(col: Column): string {
  switch (col.type) {
    case "uuid":
      return "string";
    case "text":
    case "varchar":
      return "string";
    case "integer":
    case "bigint":
    case "serial":
    case "bigserial":
    case "numeric":
      return "number";
    case "boolean":
      return "boolean";
    case "timestamp":
    case "timestamptz":
    case "date":
      return "string";
    case "json":
    case "jsonb":
      return "Record<string, unknown>";
    default:
      return "string";
  }
}

function generateInterface(table: TableDefinition): string {
  const name = toPascalCase(table.table);
  const lines: string[] = [];

  if (table.comment) {
    lines.push(`/** ${table.comment} */`);
  }
  lines.push(`export interface ${name} {`);

  table.columns.forEach((col) => {
    const optional = col.nullable ? "?" : "";
    const type = tsType(col);
    const commentParts: string[] = [col.type];
    if (col.primaryKey) commentParts.push("PK");
    if (col.unique) commentParts.push("unique");
    if (col.foreignKey) commentParts.push(`FK→${col.foreignKey.table}.${col.foreignKey.column}`);
    if (col.comment) commentParts.push(col.comment);
    lines.push(`  ${col.name}${optional}: ${type}; // ${commentParts.join(" | ")}`);
  });

  lines.push("}");
  return lines.join("\n");
}

export function generateTypes(doc: SchemaDocument): string {
  const lines: string[] = [];

  if (doc.description) {
    lines.push(`// ${doc.description}`);
    lines.push("");
  }

  lines.push(`// Auto-generated from YAML schema — do not edit manually`);
  lines.push("");

  doc.tables.forEach((table, i) => {
    if (i > 0) lines.push("");
    lines.push(generateInterface(table));
  });

  lines.push("");
  lines.push(`export interface Database {`);
  doc.tables.forEach((table) => {
    lines.push(`  ${table.table}: ${toPascalCase(table.table)};`);
  });
  lines.push(`}`);

  return lines.join("\n");
}
