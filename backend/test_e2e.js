const io = require("socket.io-client");
const BASE = "http://localhost:5000";

async function testFullFlow() {
  // 1. Login as teacher
  console.log("=== STEP 1: Teacher login ===");
  const loginRes = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "teacher@test.com", password: "test123" }),
  });
  const loginData = await loginRes.json();
  const teacherToken = loginData.token;
  console.log("Teacher token:", teacherToken ? "OK" : "MISSING");
  if (!teacherToken) {
    console.log("Login data:", loginData);
    process.exit(1);
  }

  // 2. Get quiz
  const quizRes = await fetch(BASE + "/api/quizzes", {
    headers: { Authorization: "Bearer " + teacherToken },
  });
  const quizzes = await quizRes.json();
  console.log("Quizzes:", quizzes.length);
  // Use teacher1's quiz (id 8) or the first one
  const quizId = quizzes[0]?.id || 8;
  console.log("Using quiz ID:", quizId);

  // 3. Start session
  console.log("=== STEP 3: Start session ===");
  const startRes = await fetch(BASE + "/api/sessions/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + teacherToken,
    },
    body: JSON.stringify({ quiz_id: quizId }),
  });
  const startData = await startRes.json();
  const session = startData.session || startData;
  if (!session.session_code) {
    console.log("Start failed:", startData);
    process.exit(1);
  }
  const sessionCode = session.session_code;
  const sessionId = session.id;
  console.log("Session code:", sessionCode, "ID:", sessionId);

  // 4. Teacher socket
  console.log("=== STEP 4: Teacher socket ===");
  const teacherSocket = io(BASE, { auth: { token: teacherToken } });

  await new Promise((resolve, reject) => {
    teacherSocket.on("connect", () => {
      console.log("Teacher socket connected:", teacherSocket.id);
      teacherSocket.emit("authenticate", { token: teacherToken });
    });
    teacherSocket.on("authenticated", () => {
      console.log("Teacher authenticated");
      resolve();
    });
    teacherSocket.on("authError", (d) =>
      reject(new Error("Auth error: " + d.error)),
    );
    setTimeout(() => reject(new Error("timeout")), 5000);
  });

  // 5. Teacher joins session room
  console.log("=== STEP 5: Teacher HostJoinSession ===");
  teacherSocket.emit("HostJoinSession", { sessionId: String(sessionId) });

  await new Promise((resolve) => {
    teacherSocket.on("HostSessionJoined", (data) => {
      console.log(
        "HostSessionJoined, participants:",
        data.participants?.length,
      );
      resolve();
    });
  });

  // 6. Student HTTP join (simulating join-quiz page)
  console.log("=== STEP 6: Student HTTP join ===");
  const joinRes = await fetch(BASE + "/api/sessions/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_code: sessionCode,
      nickname: "TestStudent",
    }),
  });
  const joinData = await joinRes.json();
  console.log("Join status:", joinRes.status);
  console.log(
    "Student token:",
    joinData.token ? "OK (len=" + joinData.token.length + ")" : "MISSING",
  );
  console.log("Student session_id:", joinData.session_id);

  // 7. Student API getSession (like quiz-player Effect 1)
  console.log("=== STEP 7: Student getSession API ===");
  const sessRes = await fetch(BASE + "/api/sessions/" + joinData.session_id, {
    headers: { Authorization: "Bearer " + joinData.token },
  });
  console.log("getSession status:", sessRes.status);
  const sessData = await sessRes.json();
  console.log("Session code from API:", sessData.session?.session_code);
  console.log("Participants from API:", sessData.participants?.length);

  // 8. Student socket (like quiz-player Effect 3)
  console.log("=== STEP 8: Student socket ===");

  // Set up teacher listener for ParticipantJoined
  const teacherGotParticipant = new Promise((resolve) => {
    teacherSocket.on("ParticipantJoined", (data) => {
      console.log(
        ">>> TEACHER got ParticipantJoined:",
        data.participant?.nickname,
      );
      resolve(data);
    });
  });

  const studentSocket = io(BASE, { auth: { token: joinData.token } });

  await new Promise((resolve, reject) => {
    studentSocket.on("connect", () => {
      console.log("Student socket connected:", studentSocket.id);
      studentSocket.emit("authenticate", { token: joinData.token });
    });
    studentSocket.on("authenticated", () => {
      console.log("Student authenticated");
      resolve();
    });
    studentSocket.on("authError", (d) =>
      reject(new Error("Auth error: " + d.error)),
    );
    studentSocket.on("connect_error", (e) =>
      console.log("Student connect_error:", e.message),
    );
    setTimeout(() => reject(new Error("Student auth timeout")), 8000);
  });

  // 9. Student JoinSession
  console.log("=== STEP 9: Student JoinSession ===");
  studentSocket.emit("JoinSession", {
    sessionCode: sessData.session.session_code,
    nickname: "TestStudent",
  });

  const sessionJoinedP = new Promise((resolve) => {
    studentSocket.on("SessionJoined", (data) => {
      console.log("Student got SessionJoined:", data);
      resolve(data);
    });
  });

  await Promise.all([sessionJoinedP, teacherGotParticipant]);

  // 10. Final check via API
  console.log("=== STEP 10: Final API check ===");
  const finalRes = await fetch(BASE + "/api/sessions/" + sessionId, {
    headers: { Authorization: "Bearer " + teacherToken },
  });
  const finalData = await finalRes.json();
  console.log("Final participants:", finalData.participants?.length);

  console.log("\n=== ALL 10 STEPS PASSED ===");
  teacherSocket.disconnect();
  studentSocket.disconnect();
  process.exit(0);
}

testFullFlow().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
