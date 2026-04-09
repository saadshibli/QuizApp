const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, authorize("teacher"));

/**
 * POST /api/ai/generate-questions
 * Generate quiz questions using Google Gemini API
 * Body: { topic, count, difficulty }
 */
router.post("/generate-questions", async (req, res) => {
  const { topic, count = 5, difficulty = "medium" } = req.body;

  if (!topic || topic.trim().length < 2) {
    return res.status(400).json({ error: "Topic is required (min 2 chars)" });
  }

  const numQuestions = Math.min(Math.max(parseInt(count) || 5, 1), 20);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key not configured. Add GEMINI_API_KEY to your .env file." });
  }

  const prompt = `Generate exactly ${numQuestions} multiple choice quiz questions about "${topic.trim()}".
Difficulty: ${difficulty}.

IMPORTANT: Return ONLY a valid JSON array, no markdown, no explanation.
Each item must have this exact structure:
[
  {
    "question": "The question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

Rules:
- correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)
- Each question must have exactly 4 options
- Questions should be clear and educational
- Options should be plausible but only one correct
- Return ONLY the JSON array, nothing else`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return res.status(502).json({ error: "Failed to generate questions. Check your API key." });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const questions = JSON.parse(jsonStr);

    if (!Array.isArray(questions)) {
      return res.status(502).json({ error: "Invalid response from AI" });
    }

    // Validate and sanitize
    const sanitized = questions
      .filter(q => q.question && Array.isArray(q.options) && q.options.length >= 2)
      .map(q => ({
        question: String(q.question).slice(0, 300),
        options: q.options.slice(0, 6).map(o => String(o).slice(0, 200)),
        correctIndex: Math.min(Math.max(parseInt(q.correctIndex) || 0, 0), q.options.length - 1),
      }));

    res.json({ questions: sanitized });
  } catch (err) {
    console.error("AI generation error:", err);
    res.status(500).json({ error: "Failed to parse AI response. Try again." });
  }
});

module.exports = router;
