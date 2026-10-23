import { execSync } from "node:child_process";
import path from "node:path";

const portalDir = path.resolve(__dirname, "..");

export function reseed() {
  execSync("pnpm --dir ../.. db:seed", { cwd: portalDir, stdio: "pipe" });
}
