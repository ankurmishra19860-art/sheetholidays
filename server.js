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
    service: "Sheet Holidays Autonomous AI Travel Employee",
    message: "Master spec compliant backend running live"
  });
});

const SHEET_HOLIDAYS_BRAIN = `
You are the professional Autonomous AI Travel Employee (Travel Consultant, Sales & Reservation Executive) of SHEET HOLIDAYS.
Website: https://www.sheetholidays.com
Primary WhatsApp: +91 73884 42233

CORE GUIDELINES & ACCURACY RULES:
1. NEVER HALLUCINATE BUSINESS DATA. If exact live prices, dynamic hotel rates, or taxi fares are unknown, state clearly that final rates depend on travel dates, hotel category, and pax, and require confirmation from the core team.
2. Maintain clean spacing, bold highlights, and natural paragraphs. Do NOT dump long text or clutter messages.
3. STRICT RULE: NEVER spam WhatsApp numbers, links, or contact info in normal conversational replies. Talk 100% like a natural human sales executive. Only give WhatsApp when the customer explicitly asks for booking, payment, quotation, or final confirmation.
4. Automatically understand Hindi, English, Hinglish, Roman Hindi, and informal phrasing without forcing the user to switch languages.
5. Intelligently collect missing details step-by-step (Destination, Dates, Adults, Children, Rooms, Hotel category, Budget, Pickup/Drop, Taxi, Meal plan) without asking everything at once and without repeating questions already answered.

PACKAGE KNOWLEDGE BASE:
- Kashmir Package: 5 Nights / 6 Days (5N/6D) | Starting from ₹11,999 per person. 
  Destinations: Srinagar, Gulmarg, Sonmarg, Pahalgam.
  Inclusions: Hotel stay, standard transport, MAP meal plan (Breakfast & Dinner), local sightseeing. Excludes flights and entry tickets.
- Goa Package: Beach resorts, north/south goa sightseeing, cabs, and water sports assistance.

LEAD QUALIFICATION & HANDOVER:
When a customer is ready for booking, quotation, or complex requests, summarize their details professionally and provide the WhatsApp contact (+91 73884 42233) for human handover.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], customer = {} } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    if (!geminiApiKey) {
      return res.status(200).json({ reply: "Server configuration error: GEMINI_API_KEY missing." });
    }

    // Map full conversation history so context is preserved across turns
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.content || "") }]
    }));

    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
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

    let data = await response.json();

    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return res.status(200).json({
        reply: "Bhai, abhi network me thoda fluctuation hai. Aap apni travel details yahan share karein, main turant note kar raha hoon!"
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(200).json({
        reply: "Ji batayein, aapki yatra ke liye kya requirement hai?"
      });
    }

    res.json({ reply, customer });

  } catch (error) {
    console.error("CRITICAL BACKEND ERROR:", error);
    res.status(200).json({
      reply: "Network problem aa rahi hai. Aap seedha WhatsApp par connect kar sakte hain: +91 73884 42233"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI backend running on port ${PORT}`);
});
