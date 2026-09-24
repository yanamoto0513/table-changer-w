import * as XLSX from "xlsx";
import type { SchemaDocument, TableDefinition } from "@/types/schema";

export function generateExcel(doc: SchemaDocument): Blob {
  const wb = XLSX.utils.book_new();

  const summaryData = doc.tables.map((t) => ({
    "テーブル名": t.table,
    "説明": t.comment ?? "",
    "カラム数": t.columns.length,
    "インデックス数": t.indexes?.length ?? 0,
  }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "サマリー");

  doc.tables.forEach((table: TableDefinition) => {
    const data = table.columns.map((col) => ({
      "カラム名": col.name,
      "型": col.type + (col.length ? `(${col.length})` : ""),
      "NULL可": col.nullable ? "YES" : "NO",
      "主キー": col.primaryKey ? "○" : "",
      "ユニーク": col.unique ? "○" : "",
      "デフォルト": col.default ?? "",
      "外部キー": col.foreignKey ? `${col.foreignKey.table}(${col.foreignKey.column})` : "",
      "ON DELETE": col.foreignKey?.onDelete ?? "",
      "コメント": col.comment ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 40 },
    ];
    const safeName = table.table.substring(0, 28);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
