import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(import.meta.dirname, "../../data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db: DatabaseType = new Database(path.join(DATA_DIR, "game.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export default db;
