import { execSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DB_NAME = "simplefin-store";
const REMOTE = process.env.SIMPLEFIN_D1_LOCAL ? "" : "--remote";

function wranglerD1(sql: string, json = true): string {
  const jsonFlag = json ? "--json" : "";
  const cmd = `wrangler d1 execute ${DB_NAME} ${REMOTE} ${jsonFlag} --command '${sql.replace(/'/g, "'\\''")}' 2>/dev/null`;
  return execSync(cmd, { encoding: "utf-8", timeout: 30000 });
}

interface D1Row {
  [key: string]: unknown;
}

function queryRows(sql: string): D1Row[] {
  const raw = wranglerD1(sql);
  try {
    const parsed = JSON.parse(raw);
    return parsed?.[0]?.results ?? [];
  } catch {
    return [];
  }
}

function execute(sql: string): void {
  wranglerD1(sql, false);
}

function executeBulk(statements: string[]): void {
  const tmpDir = mkdtempSync(join(tmpdir(), "sfin-axi-"));
  const tmpFile = join(tmpDir, "bulk.sql");
  writeFileSync(tmpFile, statements.join(";\n"));
  try {
    execSync(
      `wrangler d1 execute ${DB_NAME} ${REMOTE} --file ${tmpFile} 2>/dev/null`,
      { encoding: "utf-8", timeout: 60000 }
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export { queryRows, execute, executeBulk, DB_NAME };
