import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Database,
  FileCode2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Table2,
  Copy,
  Eye,
  Code2,
  ChevronDown,
  ChevronRight,
  Key,
  Link2,
  Hash,
  Type,
  Search,
  Layers,
} from "lucide-react";
import { parseYaml } from "@/lib/yamlParser";
import { generateSQL } from "@/lib/sqlGenerator";
import { generateTypes } from "@/lib/typeGenerator";
import { generateExcel, downloadBlob } from "@/lib/excelGenerator";
import { SAMPLE_YAML } from "@/lib/sampleYaml";
import type { Column, TableDefinition } from "@/types/schema";

type Tab = "preview" | "sql" | "types";

const STORAGE_KEY = "db-schema-yaml";

function typeIcon(col: Column) {
  if (col.primaryKey) return <Key className="w-3.5 h-3.5 text-amber-500" />;
  if (col.foreignKey) return <Link2 className="w-3.5 h-3.5 text-sky-500" />;
  if (col.type === "uuid") return <Hash className="w-3.5 h-3.5 text-violet-400" />;
  return <Type className="w-3.5 h-3.5 text-slate-400" />;
}

function TableCard({ table, index }: { table: TableDefinition; index: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer bg-slate-50/80 border-b border-slate-200"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
        <Table2 className="w-4 h-4 text-emerald-600" />
        <span className="font-mono text-sm font-semibold text-slate-800">{table.table}</span>
        <span className="text-xs text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
          {table.columns.length} cols
        </span>
        {(table.indexes?.length ?? 0) > 0 && (
          <span className="text-xs text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {table.indexes!.length} idx
          </span>
        )}
        {table.comment && (
          <span className="ml-auto text-xs text-slate-400 truncate max-w-[200px] hidden sm:block">
            {table.comment}
          </span>
        )}
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="text-left font-medium px-4 py-2">カラム</th>
                <th className="text-left font-medium px-3 py-2">型</th>
                <th className="text-left font-medium px-3 py-2">NULL</th>
                <th className="text-left font-medium px-3 py-2">デフォルト</th>
                <th className="text-left font-medium px-3 py-2 hidden md:table-cell">FK / 制約</th>
                <th className="text-left font-medium px-3 py-2 hidden lg:table-cell">コメント</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col) => (
                <tr
                  key={col.name}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-4 py-2 font-mono text-slate-700">
                    <div className="flex items-center gap-2">
                      {typeIcon(col)}
                      {col.name}
                      {col.unique && (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">UQ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-500 text-xs">
                    {col.type}
                    {col.length ? `(${col.length})` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {col.nullable ? (
                      <span className="text-slate-400">YES</span>
                    ) : (
                      <span className="text-red-500 font-medium">NO</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-400 max-w-[140px] truncate">
                    {col.default || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs hidden md:table-cell">
                    {col.foreignKey ? (
                      <span className="text-sky-600 font-mono">
                        → {col.foreignKey.table}({col.foreignKey.column})
                        {col.foreignKey.onDelete && (
                          <span className="text-slate-400 ml-1">[{col.foreignKey.onDelete}]</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400 hidden lg:table-cell max-w-[200px] truncate">
                    {col.comment || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {table.indexes && table.indexes.length > 0 && (
            <div className="px-4 py-2.5 bg-sky-50/40 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-xs font-semibold text-sky-700">インデックス</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {table.indexes.map((idx) => (
                  <div
                    key={idx.name}
                    className="text-xs font-mono px-2 py-1 rounded bg-white border border-sky-200 text-sky-700"
                  >
                    {idx.unique && <span className="text-amber-500 mr-1">UNIQUE</span>}
                    {idx.name} ({idx.columns.join(", ")})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
    >
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "コピー済み" : label}
    </button>
  );
}

function App() {
  const [yamlText, setYamlText] = useState(SAMPLE_YAML);
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setYamlText(saved);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem(STORAGE_KEY, yamlText), 500);
    return () => clearTimeout(id);
  }, [yamlText]);

  const parseResult = useMemo(() => parseYaml(yamlText), [yamlText]);
  const sql = useMemo(
    () => (parseResult.schema ? generateSQL(parseResult.schema) : ""),
    [parseResult.schema],
  );
  const types = useMemo(
    () => (parseResult.schema ? generateTypes(parseResult.schema) : ""),
    [parseResult.schema],
  );

  const filteredTables = useMemo(() => {
    if (!parseResult.schema) return [];
    if (!search.trim()) return parseResult.schema.tables;
    const q = search.toLowerCase();
    return parseResult.schema.tables.filter(
      (t) =>
        t.table.toLowerCase().includes(q) ||
        t.comment?.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q)),
    );
  }, [parseResult.schema, search]);

  const handleDownloadExcel = () => {
    if (!parseResult.schema) return;
    const blob = generateExcel(parseResult.schema);
    downloadBlob(blob, "db-schema.xlsx");
  };

  const tableCount = parseResult.schema?.tables.length ?? 0;
  const colCount = parseResult.schema?.tables.reduce((a, t) => a + t.columns.length, 0) ?? 0;
  const fkCount =
    parseResult.schema?.tables.reduce(
      (a, t) => a + t.columns.filter((c) => c.foreignKey).length,
      0,
    ) ?? 0;
  const idxCount = parseResult.schema?.tables.reduce((a, t) => a + (t.indexes?.length ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">DB Schema Manager</h1>
            <p className="text-xs text-slate-400 leading-tight">YAML駆動 テーブル設計・管理</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {parseResult.errors.length === 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              有効なスキーマ
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              {parseResult.errors.length}件のエラー
            </span>
          )}
          <button
            onClick={handleDownloadExcel}
            disabled={parseResult.errors.length > 0}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Excel出力
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left — YAML Editor */}
        <div className="lg:w-[42%] lg:min-w-[380px] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-900">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
            <Code2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">YAML スキーマ定義</span>
            <span className="ml-auto text-[10px] text-slate-500">編集すると自動保存</span>
          </div>
          <textarea
            value={yamlText}
            onChange={(e) => setYamlText(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full bg-slate-900 text-slate-200 font-mono text-[13px] leading-relaxed p-4 resize-none outline-none min-h-[300px] lg:min-h-0"
            placeholder="YAMLをここに入力..."
          />
          {parseResult.errors.length > 0 && (
            <div className="px-4 py-2.5 bg-red-950/50 border-t border-red-900/50 max-h-32 overflow-y-auto">
              {parseResult.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-300 py-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-slate-200">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-slate-100 text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Eye className="w-4 h-4" />
              プレビュー
            </button>
            <button
              onClick={() => setActiveTab("sql")}
              className={`flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "sql"
                  ? "bg-slate-100 text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              SQL (DDL)
            </button>
            <button
              onClick={() => setActiveTab("types")}
              className={`flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "types"
                  ? "bg-slate-100 text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              TypeScript型
            </button>

            {activeTab !== "preview" && (
              <div className="ml-auto">
                <CopyButton text={activeTab === "sql" ? sql : types} label="コピー" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 lg:p-5">
            {parseResult.errors.length > 0 && !parseResult.schema ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">スキーマを解析できません</p>
                <p className="text-xs text-slate-400 mt-1">YAMLのエラーを修正してください</p>
              </div>
            ) : !parseResult.schema ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Database className="w-12 h-12 mb-2 opacity-40" />
                <p className="text-sm">スキーマ定義を入力してください</p>
              </div>
            ) : activeTab === "preview" ? (
              <div>
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "テーブル", value: tableCount, icon: Table2, cls: "text-emerald-500" },
                    { label: "カラム", value: colCount, icon: Type, cls: "text-slate-500" },
                    { label: "外部キー", value: fkCount, icon: Link2, cls: "text-sky-500" },
                    { label: "インデックス", value: idxCount, icon: Hash, cls: "text-violet-400" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl bg-white border border-slate-200 px-4 py-3 flex items-center gap-3"
                    >
                      <s.icon className={`w-5 h-5 ${s.cls}`} />
                      <div>
                        <div className="text-lg font-bold text-slate-800 leading-none">{s.value}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Search */}
                {tableCount > 0 && (
                  <div className="relative mb-4">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="テーブル名・カラム名で検索..."
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                    />
                  </div>
                )}

                {/* Table cards */}
                <div className="space-y-3">
                  {filteredTables.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">該当するテーブルが見つかりません</p>
                  ) : (
                    filteredTables.map((t, i) => <TableCard key={t.table} table={t} index={i} />)
                  )}
                </div>
              </div>
            ) : activeTab === "sql" ? (
              <pre className="text-xs font-mono text-slate-700 bg-white rounded-xl border border-slate-200 p-4 overflow-auto leading-relaxed">
                {sql}
              </pre>
            ) : (
              <pre className="text-xs font-mono text-slate-700 bg-white rounded-xl border border-slate-200 p-4 overflow-auto leading-relaxed">
                {types}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
