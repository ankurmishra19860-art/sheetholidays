import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Sheet Holidays AI",
    message: "AI server is running"
  });
});

const SHEET_HOLIDAYS_BRAIN = `
You are the AI Employee of SHEET HOLIDAYS.
Business: Sheet Holidays | Travel Agency | Hotels | Holiday Packages | Taxi | B2B Travel
WhatsApp: +91 73884 42233
Website: https://www.sheetholidays.com

Your responsibilities:
1. Understand customer travel requirements.
2. Ask destination, dates, travellers and budget.
3. Recommend relevant Sheet Holidays packages.
4. Help with hotels, taxis and holiday packages.
5. Never invent live availability or prices not provided.
6. When customer has serious enquiry, give WhatsApp: +91 73884 42233
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], customer = {} } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(200).json({ reply: "Server Error: GEMINI_API_KEY missing in Render." });
    }

    const contents = messages.slice(-20).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.content || "") }]
    }));

    // Updated to use gemini-2.0-flash model to fix the 404 Not Found error
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SHEET_HOLIDAYS_BRAIN }]
          },
          contents: contents
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({
        reply: `Google API Error: ${data.error.message} (Code: ${data.error.code})`
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Ji, Sheet Holidays mein aapki travel enquiry mein help karte hain. WhatsApp: +91 73884 42233 par contact karein.";

    res.json({
      reply: reply,
      customer: customer
    });

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    res.status(200).json({
      reply: `Server Crash Error: ${error.message}`
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI running on port ${PORT}`);
});
