/**
 * End-to-end test of the quiz join flow.
 * Tests: teacher hosts → student joins → teacher sees student
 */
const http = require("http");
const { io } = require("./frontend/node_modules/socket.io-client");

const BASE = "http://localhost:5000";
const ts = Date.now();

function httpRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers,
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, data: d });
          }
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log("=== STEP 1: Register teacher ===");
  const teacherReg = await httpRequest("POST", "/api/auth/register", {
    name: `Teacher_${ts}`,
    email: `teacher_${ts}@test.com`,
    password: "Test1234!",
    role: "teacher",
  });
  console.log(
    "Teacher register:",
    teacherReg.status,
    teacherReg.data.user?.id || teacherReg.data.error,
  );
  const teacherToken = teacherReg.data.token;
  if (!teacherToken) {
    console.log("FAIL: No teacher token");
    return;
  }

  console.log("\n=== STEP 2: Create quiz ===");
  const quizRes = await httpRequest(
    "POST",
    "/api/quizzes",
    {
      title: `Test Quiz ${ts}`,
      description: "Test",
    },
    teacherToken,
  );
  console.log(
    "Quiz create:",
    quizRes.status,
    "id:",
    quizRes.data.id || quizRes.data.error,
  );
  const quizId = quizRes.data.id;
  if (!quizId) {
    console.log("FAIL: No quiz ID");
    return;
  }

  console.log("\n=== STEP 2b: Add question ===");
  const qRes = await httpRequest(
    "POST",
    `/api/quizzes/${quizId}/questions`,
    {
      question_text: "What is 1+1?",
      time_limit: 30,
      points: 100,
      question_order: 1,
    },
    teacherToken,
  );
  console.log("Question create:", qRes.status, qRes.data);
  const questionId = qRes.data.id;
  if (!questionId) {
    console.log("FAIL: No question ID");
    return;
  }

  console.log("\n=== STEP 2c: Add options ===");
  for (const opt of [
    { option_text: "1", is_correct: false },
    { option_text: "2", is_correct: true },
    { option_text: "3", is_correct: false },
    { option_text: "4", is_correct: false },
  ]) {
    const oRes = await httpRequest(
      "POST",
      `/api/questions/${questionId}/options`,
      opt,
      teacherToken,
    );
    console.log(
      "  Option:",
      oRes.status,
      oRes.data.option_text || oRes.data.error,
    );
  }

  console.log("\n=== STEP 3: Start session ===");
  const sessionRes = await httpRequest(
    "POST",
    "/api/sessions/start",
    { quiz_id: quizId },
    teacherToken,
  );
  console.log("Session start:", sessionRes.status, sessionRes.data);
  const sessionId = sessionRes.data.id;
  const sessionCode = sessionRes.data.session_code;
  if (!sessionId || !sessionCode) {
    console.log("FAIL: No session");
    return;
  }
  console.log("Session ID:", sessionId, "Code:", sessionCode);

  console.log("\n=== STEP 4: Student joins via HTTP ===");
  const joinRes = await httpRequest("POST", "/api/sessions/join", {
    session_code: sessionCode,
    nickname: "TestStudent",
  });
  console.log("Join result:", joinRes.status, joinRes.data);
  const studentToken = joinRes.data.token;
  const studentSessionId = joinRes.data.session_id;
  console.log(
    "Student token?",
    !!studentToken,
    "session_id:",
    studentSessionId,
  );
  if (!studentToken) {
    console.log("FAIL: No student token");
    return;
  }

  console.log("\n=== STEP 5: Teacher connects socket ===");
  const teacherSocket = io(BASE, {
    auth: { token: teacherToken },
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    teacherSocket.on("connect", () => {
      console.log("Teacher socket connected:", teacherSocket.id);
      teacherSocket.emit("authenticate", { token: teacherToken });
    });
    teacherSocket.on("authenticated", () => {
      console.log("Teacher socket authenticated");
      resolve();
    });
    teacherSocket.on("authError", (e) => {
      console.log("Teacher auth error:", e);
      reject(e);
    });
    teacherSocket.on("connect_error", (e) => {
      console.log("Teacher connect error:", e.message);
      reject(e);
    });
    setTimeout(() => reject(new Error("Teacher auth timeout")), 5000);
  });

  console.log("\n=== STEP 6: Teacher joins session room ===");
  teacherSocket.emit("HostJoinSession", { sessionId: String(sessionId) });

  const hostJoinData = await new Promise((resolve, reject) => {
    teacherSocket.on("HostSessionJoined", (data) => {
      console.log("HostSessionJoined received:", JSON.stringify(data));
      resolve(data);
    });
    teacherSocket.on("error", (e) => {
      console.log("Teacher error event:", e);
      reject(e);
    });
    setTimeout(() => reject(new Error("HostJoinSession timeout")), 5000);
  });
  console.log("Existing participants:", hostJoinData.participants?.length || 0);
  if (hostJoinData.participants?.length > 0) {
    console.log(
      "  First participant:",
      JSON.stringify(hostJoinData.participants[0]),
    );
  }

  console.log("\n=== STEP 7: Student connects socket ===");
  const studentSocket = io(BASE, {
    auth: { token: studentToken },
    reconnection: false,
  });

  await new Promise((resolve, reject) => {
    studentSocket.on("connect", () => {
      console.log("Student socket connected:", studentSocket.id);
      studentSocket.emit("authenticate", { token: studentToken });
    });
    studentSocket.on("authenticated", () => {
      console.log("Student socket authenticated");
      resolve();
    });
    studentSocket.on("authError", (e) => {
      console.log("Student auth error:", e);
      reject(e);
    });
    studentSocket.on("connect_error", (e) => {
      console.log("Student connect error:", e.message);
      reject(e);
    });
    setTimeout(() => reject(new Error("Student auth timeout")), 5000);
  });

  console.log("\n=== STEP 8: Listen for ParticipantJoined on teacher ===");
  const participantJoinedPromise = new Promise((resolve) => {
    teacherSocket.on("ParticipantJoined", (data) => {
      console.log(
        "*** TEACHER received ParticipantJoined:",
        JSON.stringify(data),
      );
      resolve(data);
    });
  });

  const sessionJoinedPromise = new Promise((resolve) => {
    studentSocket.on("SessionJoined", (data) => {
      console.log("*** STUDENT received SessionJoined:", JSON.stringify(data));
      resolve(data);
    });
  });

  console.log("Student emitting JoinSession with code:", sessionCode);
  studentSocket.emit("JoinSession", {
    sessionCode: sessionCode,
    nickname: "TestStudent",
  });

  // Wait for both events (or timeout)
  const results = await Promise.allSettled([
    Promise.race([
      participantJoinedPromise,
      new Promise((_, rej) =>
        setTimeout(() => rej("ParticipantJoined timeout"), 5000),
      ),
    ]),
    Promise.race([
      sessionJoinedPromise,
      new Promise((_, rej) =>
        setTimeout(() => rej("SessionJoined timeout"), 5000),
      ),
    ]),
  ]);

  console.log("\n=== RESULTS ===");
  console.log(
    "ParticipantJoined:",
    results[0].status,
    results[0].status === "fulfilled" ? "OK" : results[0].reason,
  );
  console.log(
    "SessionJoined:",
    results[1].status,
    results[1].status === "fulfilled" ? "OK" : results[1].reason,
  );

  // Check if teacher got the student
  if (results[0].status === "fulfilled") {
    console.log("\n✅ SUCCESS: Teacher received ParticipantJoined event");
    console.log("Participant data:", JSON.stringify(results[0].value));
  } else {
    console.log("\n❌ FAIL: Teacher DID NOT receive ParticipantJoined!");

    // Check if student got any error
    const errorPromise = new Promise((resolve) => {
      studentSocket.on("error", (e) => {
        console.log("Student error:", e);
        resolve(e);
      });
      setTimeout(() => resolve(null), 2000);
    });
    const error = await errorPromise;
    if (error) console.log("Student socket error:", error);
  }

  // Cleanup
  teacherSocket.disconnect();
  studentSocket.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
