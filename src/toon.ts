export function toonTable(
  name: string,
  cols: string[],
  rows: Record<string, unknown>[]
): string {
  if (rows.length === 0) return `${name}: 0 found`;
  const header = `${name}[${rows.length}]{${cols.join(",")}}:`;
  const dataLines = rows.map((r) =>
    cols.map((c) => formatVal(r[c])).join(",")
  );
  return [header, ...dataLines].join("\n");
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") {
    if (v.includes(",") || v.includes('"') || v.includes("\n"))
      return `"${v.replace(/"/g, '""')}"`;
    return v;
  }
  return String(v);
}

export function toonObject(
  name: string,
  fields: Record<string, unknown>,
  truncate?: { field: string; limit: number }
): string {
  const lines: string[] = [`${name}:`];
  for (const [k, v] of Object.entries(fields)) {
    if (truncate && k === truncate.field && typeof v === "string" && v.length > truncate.limit) {
      const shown = v.slice(0, truncate.limit);
      lines.push(`  ${k}: ${shown}... (truncated, ${v.length} chars total)`);
    } else {
      lines.push(`  ${k}: ${formatVal(v)}`);
    }
  }
  return lines.join("\n");
}

export function toonHelp(hints: string[]): string {
  return hints.map((h, i) => `help[${i + 1}]:\n  ${h}`).join("\n");
}

export function toonError(msg: string, hints: string[]): string {
  return [`error: ${msg}`, toonHelp(hints)].join("\n");
}
