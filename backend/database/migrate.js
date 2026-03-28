/**
 * Migration Runner
 * Run this file to set up the database: node database/migrate.js
 */

require("dotenv").config();
const { runMigrations } = require("./schema");

async function main() {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
