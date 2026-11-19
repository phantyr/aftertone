import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const env = { ...process.env };
if (process.platform === "win32") env.UV_THREADPOOL_SIZE ??= "1";
const cli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [cli, "build"], { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
