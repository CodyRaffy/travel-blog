// Consistent online snapshot of a SQLite DB (safe while the service writes, thanks to WAL).
//   node scripts/db-snapshot.cjs <source.db> <dest.db>
const Database = require("better-sqlite3");
const [src, dest] = process.argv.slice(2);
if (!src || !dest) {
  console.error("usage: node scripts/db-snapshot.cjs <source.db> <dest.db>");
  process.exit(1);
}
const db = new Database(src, { readonly: true });
db.prepare("VACUUM INTO ?").run(dest);
db.close();
console.log("snapshot written:", dest);
