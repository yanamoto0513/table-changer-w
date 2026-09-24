import type { Column, SchemaDocument, TableDefinition } from "@/types/schema";

function columnTypeSql(col: Column): string {
  switch (col.type) {
    case "varchar":
      return `varchar(${col.length ?? 255})`;
    case "serial":
      return "serial";
    case "bigserial":
      return "bigserial";
    case "uuid":
      return "uuid";
    case "json":
      return "json";
    case "jsonb":
      return "jsonb";
    case "timestamp":
      return "timestamp";
    case "timestamptz":
      return "timestamptz";
    default:
      return col.type;
  }
}

function quoteDefault(col: Column): string {
  const d = col.default;
  if (d === undefined) return "";
  return `DEFAULT ${d}`;
}

function columnLine(col: Column): string {
  const parts: string[] = [`  ${col.name} ${columnTypeSql(col)}`];
  if (col.primaryKey) parts.push("PRIMARY KEY");
  if (col.unique) parts.push("UNIQUE");
  if (!col.nullable && !col.primaryKey) parts.push("NOT NULL");
  if (col.default) parts.push(quoteDefault(col));
  if (col.foreignKey) {
    const fk = `REFERENCES ${col.foreignKey.table}(${col.foreignKey.column})`;
    const del = col.foreignKey.onDelete ? ` ON DELETE ${col.foreignKey.onDelete}` : "";
    parts.push(fk + del);
  }
  return parts.join(" ");
}

export function generateSQL(doc: SchemaDocument): string {
  const lines: string[] = [];

  if (doc.description) {
    lines.push(`-- ${doc.description}`);
    lines.push("");
  }

  doc.tables.forEach((table: TableDefinition) => {
    if (table.comment) {
      lines.push(`-- Table: ${table.table} — ${table.comment}`);
    } else {
      lines.push(`-- Table: ${table.table}`);
    }
    lines.push(`CREATE TABLE IF NOT EXISTS ${table.table} (`);

    const colLines = table.columns.map(columnLine);
    lines.push(colLines.join(",\n"));

    lines.push(");");

    table.columns.forEach((col) => {
      if (col.comment) {
        lines.push(`COMMENT ON COLUMN ${table.table}.${col.name} IS '${col.comment.replace(/'/g, "''")}';`);
      }
    });

    if (table.indexes && table.indexes.length > 0) {
      table.indexes.forEach((idx) => {
        const unique = idx.unique ? "UNIQUE " : "";
        const cols = idx.columns.join(", ");
        lines.push(`CREATE ${unique}INDEX IF NOT EXISTS ${idx.name} ON ${table.table} (${cols});`);
      });
    }

    lines.push("");
  });

  return lines.join("\n");
}
