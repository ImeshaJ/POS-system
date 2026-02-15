const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function run() {
  const args = new Set(process.argv.slice(2));
  const skipAttachments = args.has("--skip-attachments");
  const onlyAttachments = args.has("--only-attachments");

  if (skipAttachments && onlyAttachments) {
    throw new Error("Cannot use --skip-attachments and --only-attachments together");
  }

  const migrationsDir = path.join(__dirname, "..", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const filteredFiles = files.filter((file) => {
    const isAttachmentMigration = file.toLowerCase().includes("attachment");
    if (skipAttachments && isAttachmentMigration) {
      console.log(`Skipping optional attachments migration: ${file}`);
      return false;
    }
    if (onlyAttachments) {
      return isAttachmentMigration;
    }
    return true;
  });

  const toRun = filteredFiles.length ? filteredFiles : [];
  if (onlyAttachments && toRun.length === 0) {
    console.log("No attachment migrations found to run.");
  }

  for (const file of toRun) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    if (!sql.trim()) continue;
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
