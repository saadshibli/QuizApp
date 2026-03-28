const db = require("./src/config/database");
const bcrypt = require("bcrypt");

async function main() {
  // Check teacher users
  const teachers = await db.query(
    "SELECT id, email, name, password_hash FROM users WHERE role = 'teacher'",
  );
  console.log("Teachers:");
  for (const t of teachers.rows) {
    console.log(
      ` ${t.id}: ${t.email} (${t.name}), hash_len: ${t.password_hash ? t.password_hash.length : "null"}`,
    );
    // Try common passwords
    if (t.password_hash) {
      for (const pwd of [
        "password123",
        "Password123",
        "Teacher123!",
        "123456",
        "test123",
      ]) {
        const match = await bcrypt.compare(pwd, t.password_hash);
        if (match) console.log(`   -> Password is: ${pwd}`);
      }
    }
  }

  // Check quizzes
  const quizzes = await db.query(
    "SELECT id, title, teacher_id FROM quizzes LIMIT 5",
  );
  console.log("\nQuizzes:", JSON.stringify(quizzes.rows));

  // Check active sessions
  const sessions = await db.query(
    "SELECT id, session_code, status, quiz_id FROM sessions WHERE status != 'Completed' LIMIT 5",
  );
  console.log("\nActive sessions:", JSON.stringify(sessions.rows));

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
