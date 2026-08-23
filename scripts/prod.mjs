// Run a repo script against the PRODUCTION data directory (the live site's DB/media/cache).
//   npm run prod -- photos:scan
//   npm run prod -- photos:cluster --no-geocode
//   npm run prod -- import:facebook C:\path\to\export
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const DATA = process.env.TRAVEL_BLOG_PROD_DATA ?? "C:\\websites\\_data\\travel-blog";
if (!fs.existsSync(DATA)) {
  console.error(`Production data dir not found: ${DATA} (is the service installed?)`);
  process.exit(1);
}
const [script, ...rest] = process.argv.slice(2);
if (!script) {
  console.error("Usage: npm run prod -- <npm-script> [args]");
  process.exit(1);
}
const env = {
  ...process.env,
  DATABASE_PATH: `${DATA}\\travel-blog.db`,
  MEDIA_DIR: `${DATA}\\media`,
  CACHE_DIR: `${DATA}\\cache`,
};
console.log(`[prod] DATABASE_PATH=${env.DATABASE_PATH}`);
const r = spawnSync("npm", ["run", "-s", script, "--", ...rest], { stdio: "inherit", env, shell: true });
process.exit(r.status ?? 1);
