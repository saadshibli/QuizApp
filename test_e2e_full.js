/**
 * Comprehensive E2E Test Suite
 * Tests: auth, quiz creation, session hosting, joining, playing, leaderboard, security, URLs
 */
const http = require("http");

const API = "http://localhost:5000/api";
let teacherToken = "";
let studentToken = "";
let quizId = 0;
let sessionCode = "";
let sessionId = 0;
let questionIds = [];
let guestToken = "";
let guestUserId = 0;
let passed = 0;
let failed = 0;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    const r = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${msg}`);
  }
}

async function run() {
  console.log("\n========================================");
  console.log("  COMPREHENSIVE E2E TEST SUITE");
  console.log("========================================\n");

  // ==================== 1. AUTHENTICATION ====================
  console.log("1. AUTHENTICATION");

  // Login teacher
  const tLogin = await req("POST", "/auth/login", {
    email: "teacher@test.com",
    password: "test123",
  });
  assert(tLogin.status === 200, `Teacher login: ${tLogin.status}`);
  teacherToken = tLogin.data.token;
  assert(!!teacherToken, "Teacher token received");

  // Register & login student
  const studentEmail = `student_e2e_${Date.now()}@test.com`;
  const sReg = await req("POST", "/auth/register", {
    name: "E2E Student",
    email: studentEmail,
    password: "test123",
    role: "student",
  });
  assert(sReg.status === 201, `Student register: ${sReg.status}`);
  studentToken = sReg.data.token;
  assert(!!studentToken, "Student token received");

  // ==================== 2. QUIZ CREATION ====================
  console.log("\n2. QUIZ CREATION");

  const qCreate = await req(
    "POST",
    "/quizzes",
    {
      title: "E2E Full Test Quiz",
      description: "Testing all 8 options",
      theme: "none",
    },
    teacherToken,
  );
  assert(qCreate.status === 201, `Quiz created: ${qCreate.status}`);
  quizId = qCreate.data.id;
  assert(quizId > 0, `Quiz ID: ${quizId}`);

  // Add 3 questions with varying option counts (4, 6, 8)
  const questionConfigs = [
    { text: "Q1: 4 options", optionCount: 4 },
    { text: "Q2: 6 options", optionCount: 6 },
    { text: "Q3: 8 options", optionCount: 8 },
  ];

  for (const qConfig of questionConfigs) {
    const addQ = await req(
      "POST",
      `/quizzes/${quizId}/questions`,
      { question_text: qConfig.text, time_limit: 30, points: 100 },
      teacherToken,
    );
    assert(addQ.status === 201, `Question added: "${qConfig.text}"`);
    const qId = addQ.data.id;
    questionIds.push(qId);

    // Add options
    for (let i = 0; i < qConfig.optionCount; i++) {
      const letter = String.fromCharCode(65 + i);
      const addOpt = await req(
        "POST",
        `/questions/${qId}/options`,
        {
          option_text: `Option ${letter}`,
          is_correct: i === 0, // first option is correct
        },
        teacherToken,
      );
      assert(addOpt.status === 201, `  Option ${letter} added`);
    }
  }

  // Verify quiz
  const qGet = await req("GET", `/quizzes/${quizId}`, null, teacherToken);
  assert(qGet.status === 200, `Quiz retrieved: ${qGet.status}`);
  assert(qGet.data.questions?.length === 3, `Quiz has 3 questions`);
  assert(qGet.data.questions[0].options?.length === 4, `Q1 has 4 options`);
  assert(qGet.data.questions[1].options?.length === 6, `Q2 has 6 options`);
  assert(qGet.data.questions[2].options?.length === 8, `Q3 has 8 options`);

  // ==================== 3. SESSION CREATION & HOSTING ====================
  console.log("\n3. SESSION HOSTING");

  const sCreate = await req(
    "POST",
    "/sessions/start",
    { quiz_id: quizId },
    teacherToken,
  );
  assert(sCreate.status === 201, `Session created: ${sCreate.status}`);
  sessionCode = sCreate.data.code;
  sessionId = sCreate.data.id;
  assert(sessionCode?.length === 6, `Session code: ${sessionCode}`);
  assert(sessionId > 0, `Session ID: ${sessionId}`);

  // ==================== 4. SECURITY - ROLE AUTHORIZATION ====================
  console.log("\n4. SECURITY TESTS");

  // Student should NOT be able to start a quiz
  const studentStartQuiz = await req(
    "POST",
    `/sessions/${sessionId}/start`,
    null,
    studentToken,
  );
  assert(
    studentStartQuiz.status === 403,
    `Student cannot start quiz: ${studentStartQuiz.status} (expected 403)`,
  );

  // Student should NOT be able to advance questions
  const studentNextQ = await req(
    "POST",
    `/sessions/${sessionId}/next-question`,
    null,
    studentToken,
  );
  assert(
    studentNextQ.status === 403,
    `Student cannot advance question: ${studentNextQ.status} (expected 403)`,
  );

  // Unauthenticated user should not access session details
  const unauthSession = await req("GET", `/sessions/${sessionId}`, null, null);
  assert(
    unauthSession.status === 401,
    `Unauth cannot get session: ${unauthSession.status} (expected 401)`,
  );

  // Student should NOT be able to create a session
  const studentCreateSession = await req(
    "POST",
    "/sessions/start",
    { quiz_id: quizId },
    studentToken,
  );
  assert(
    studentCreateSession.status === 403,
    `Student cannot create session: ${studentCreateSession.status} (expected 403)`,
  );

  // ==================== 5. JOIN SESSION ====================
  console.log("\n5. SESSION JOIN");

  // Join as guest (no auth)
  const guestJoin = await req("POST", "/sessions/join", {
    session_code: sessionCode,
    nickname: "GuestPlayer",
  });
  assert(guestJoin.status === 201, `Guest joined: ${guestJoin.status}`);
  assert(
    !!guestJoin.data.session_code,
    `Join response includes session_code: ${guestJoin.data.session_code}`,
  );
  assert(
    guestJoin.data.session_code === sessionCode,
    `session_code matches: ${guestJoin.data.session_code} === ${sessionCode}`,
  );
  guestToken = guestJoin.data.token;
  guestUserId = guestJoin.data.guestUserId;
  assert(!!guestToken, "Guest received auth token");

  // Join as authenticated student
  const studentJoin = await req(
    "POST",
    "/sessions/join",
    { session_code: sessionCode, nickname: "E2E Student" },
    studentToken,
  );
  assert(studentJoin.status === 201, `Student joined: ${studentJoin.status}`);
  assert(
    !!studentJoin.data.session_code,
    `Student join response includes session_code`,
  );

  // Validation: invalid session code
  const badCode = await req("POST", "/sessions/join", {
    session_code: "ZZZZZZ",
    nickname: "BadPlayer",
  });
  assert(badCode.status === 404, `Invalid code rejected: ${badCode.status}`);

  // Validation: too short session code
  const shortCode = await req("POST", "/sessions/join", {
    session_code: "12",
    nickname: "ShortCode",
  });
  assert(shortCode.status === 400, `Short code rejected: ${shortCode.status}`);

  // Validation: missing nickname
  const noNick = await req("POST", "/sessions/join", {
    session_code: sessionCode,
  });
  assert(noNick.status === 400, `Missing nickname rejected: ${noNick.status}`);

  // ==================== 6. START QUIZ & QUESTION FLOW ====================
  console.log("\n6. QUIZ FLOW");

  const startQuiz = await req(
    "POST",
    `/sessions/${sessionId}/start`,
    null,
    teacherToken,
  );
  assert(startQuiz.status === 200, `Quiz started: ${startQuiz.status}`);

  // Get session - should be on Q1 (first question, not skipped!)
  const afterStart = await req(
    "GET",
    `/sessions/${sessionId}`,
    null,
    teacherToken,
  );
  assert(afterStart.status === 200, "Session retrieved after start");
  const currentQ = afterStart.data.session?.current_question;
  assert(
    currentQ === questionIds[0],
    `Current question is Q1 (${currentQ} === ${questionIds[0]})`,
  );

  // Guest answers Q1
  const correctOption = qGet.data.questions[0].options[0].id; // first option is correct
  const guestAnswer = await req(
    "POST",
    `/sessions/${sessionId}/answer`,
    {
      question_id: questionIds[0],
      option_id: correctOption,
      response_time: 5000,
    },
    guestToken,
  );
  assert(
    guestAnswer.status === 200,
    `Guest answered Q1: ${guestAnswer.status}`,
  );
  assert(guestAnswer.data.isCorrect === true, "Guest answer is correct");
  assert(
    guestAnswer.data.pointsAwarded > 0,
    `Points awarded: ${guestAnswer.data.pointsAwarded}`,
  );

  // Advance to Q2
  const nextQ2 = await req(
    "POST",
    `/sessions/${sessionId}/next-question`,
    null,
    teacherToken,
  );
  assert(nextQ2.status === 200, `Advanced to Q2: ${nextQ2.status}`);

  const afterQ2 = await req(
    "GET",
    `/sessions/${sessionId}`,
    null,
    teacherToken,
  );
  assert(
    afterQ2.data.session?.current_question === questionIds[1],
    `Now on Q2 (${afterQ2.data.session?.current_question} === ${questionIds[1]})`,
  );

  // Advance to Q3
  const nextQ3 = await req(
    "POST",
    `/sessions/${sessionId}/next-question`,
    null,
    teacherToken,
  );
  assert(nextQ3.status === 200, `Advanced to Q3: ${nextQ3.status}`);

  const afterQ3 = await req(
    "GET",
    `/sessions/${sessionId}`,
    null,
    teacherToken,
  );
  assert(
    afterQ3.data.session?.current_question === questionIds[2],
    `Now on Q3 (${afterQ3.data.session?.current_question} === ${questionIds[2]})`,
  );

  // Advance past Q3 - quiz should complete
  const endQuiz = await req(
    "POST",
    `/sessions/${sessionId}/next-question`,
    null,
    teacherToken,
  );
  assert(endQuiz.status === 200, `Quiz completed: ${endQuiz.status}`);
  assert(endQuiz.data.status === "Completed", `Status: ${endQuiz.data.status}`);

  // ==================== 7. LEADERBOARD ====================
  console.log("\n7. LEADERBOARD");

  const lb = await req(
    "GET",
    `/sessions/${sessionId}/leaderboard`,
    null,
    teacherToken,
  );
  assert(lb.status === 200, `Leaderboard retrieved: ${lb.status}`);
  assert(Array.isArray(lb.data), "Leaderboard is an array");
  assert(lb.data.length >= 1, `Leaderboard has ${lb.data.length} entries`);

  // ==================== 8. SESSION GETBYCODE ====================
  console.log("\n8. SESSION BY CODE");

  const byCode = await req(
    "GET",
    `/sessions/by-code/${sessionCode}`,
    null,
    teacherToken,
  );
  assert(byCode.status === 200, `Get by code: ${byCode.status}`);
  assert(
    byCode.data.session?.id === sessionId,
    `Correct session found by code`,
  );

  // ==================== 9. QUIZ HISTORY ====================
  console.log("\n9. QUIZ HISTORY");

  const history = await req("GET", "/sessions/history", null, studentToken);
  assert(history.status === 200, `Quiz history: ${history.status}`);

  // ==================== 10. INPUT VALIDATION ====================
  console.log("\n10. INPUT VALIDATION");

  // Empty quiz title
  const badQuiz = await req(
    "POST",
    "/quizzes",
    { title: "", description: "" },
    teacherToken,
  );
  assert(
    badQuiz.status === 400,
    `Empty quiz title rejected: ${badQuiz.status}`,
  );

  // Invalid email register
  const badReg = await req("POST", "/auth/register", {
    name: "Test",
    email: "not-an-email",
    password: "test123",
    role: "student",
  });
  assert(badReg.status === 400, `Invalid email rejected: ${badReg.status}`);

  // Short password
  const shortPwd = await req("POST", "/auth/register", {
    name: "Test",
    email: "short@test.com",
    password: "12",
    role: "student",
  });
  assert(
    shortPwd.status === 400,
    `Short password rejected: ${shortPwd.status}`,
  );

  // Invalid role
  const badRole = await req("POST", "/auth/register", {
    name: "Test",
    email: "role@test.com",
    password: "test123",
    role: "admin",
  });
  assert(badRole.status === 400, `Invalid role rejected: ${badRole.status}`);

  // ==================== 11. CLEANUP QUIZ ====================
  console.log("\n11. CLEANUP");

  const delQuiz = await req("DELETE", `/quizzes/${quizId}`, null, teacherToken);
  assert(
    delQuiz.status === 200 || delQuiz.status === 204,
    `Quiz deleted: ${delQuiz.status}`,
  );

  // ==================== SUMMARY ====================
  console.log("\n========================================");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
