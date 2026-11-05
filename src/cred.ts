import { execSync } from "node:child_process";

export function resolveAccessUrl(): string {
  const envUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (envUrl) return envUrl;

  try {
    const result = execSync(
      "bws secret list fe9eea09-9eaf-45e6-a72f-b45e0150b29d 2>/dev/null",
      { encoding: "utf-8", timeout: 10000 }
    );
    const secrets = JSON.parse(result);
    const match = secrets.find(
      (s: { key: string }) => s.key === "SIMPLEFIN_ACCESS_URL"
    );
    if (match?.value) return match.value;
  } catch {}

  return "";
}
