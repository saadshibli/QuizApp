/**
 * Database Schema and Migrations
 * PostgreSQL schema for real-time quiz platform
 */

const { pool } = require("../src/config/database");

const fs = require('fs');
const path = require('path');
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');


/**
 * Run all migrations
 */
async function runMigrations() {
  try {
    console.log("Running database migrations...");

    // Split schema into individual statements
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log("✓ Database migrations completed successfully");
  } catch (error) {
    console.error("✗ Database migration failed:", error);
    throw error;
  }
}

module.exports = {
  runMigrations,
  schema,
};
