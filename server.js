import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Sheet Holidays AI (Gemini Free)",
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

    const cleanMessages = messages
      .slice(-20)
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content || "")
      }));

    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [
        { role: "system", content: SHEET_HOLIDAYS_BRAIN },
        ...cleanMessages
      ]
    });

    const reply =
      response.choices[0]?.message?.content ||
      "Ji, Sheet Holidays mein aapki travel enquiry mein help karte hain. Destination aur travel date bataiye.";

    res.json({
      reply: reply,
      customer: customer
    });

  } catch (error) {
    console.error("GEMINI CHAT ERROR:", error);
    res.status(500).json({
      error: error?.message || "AI request failed"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI running on port ${PORT}`);
});
