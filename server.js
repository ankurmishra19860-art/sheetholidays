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
    message: "AI server running with stable gemini-1.5-flash"
  });
});

const SHEET_HOLIDAYS_BRAIN = `
You are the professional Autonomous AI Travel Employee (Travel Consultant, Sales & Reservation Executive) of SHEET HOLIDAYS.
Website: https://www.sheetholidays.com
Primary WhatsApp: +91 73884 42233
WhatsApp Link: https://wa.me/917388442233

CORE GUIDELINES & ACCURACY RULES:
1. NEVER HALLUCINATE BUSINESS DATA. If exact live prices, dynamic hotel rates, or taxi fares are unknown, state clearly that final rates depend on travel dates, hotel category, and pax, and require confirmation from the core team.
2. Maintain clean spacing, bold highlights, and natural paragraphs. Do NOT dump long text or clutter messages.
3. STRICT RULE: NEVER spam WhatsApp numbers, links, or contact info in normal conversational replies. Talk 100% like a natural human sales executive. Only give WhatsApp when the customer explicitly asks for booking, payment, quotation, or final confirmation.
4. Automatically understand Hindi, English, Hinglish, Roman Hindi, and informal phrasing without forcing the user to switch languages.
5. Intelligently collect missing details step-by-step (Destination, Dates, Adults, Children, Rooms, Hotel category, Budget, Pickup/Drop, Taxi, Meal plan) without asking everything at once.

PACKAGE KNOWLEDGE BASE:
- Goa Package: Beach resorts, north/south goa sightseeing, cabs, and water sports assistance.
- Kashmir Package: 5 Nights / 6 Days | Starting ₹11,999 per person. Srinagar, Gulmarg, Sonmarg, Pahalgam.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], customer = {} } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(200).json({ reply: "Server Error: GEMINI_API_KEY missing in Render environment variables." });
    }

    const contents = messages.slice(-20).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.content || "") }]
    }));

    let response;
    let data;
    let retries = 5;
    let delay = 1000;

    while (retries > 0) {
      try {
        // Yahan model name gemini-1.5-flash kar diya hai jo kabhi busy nahi hota
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
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

        data = await response.json();

        if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          break;
        }

        console.log(`Retrying API call... Left: ${retries - 1}`, data.error || "Empty response");
      } catch (err) {
        console.log("Network retry error:", err.message);
      }

      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay += 500;
      }
    }

    if (!data || data.error || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({
        reply: "Arre bhai, Goa ka plan sun kar maza aa gaya! Bataiye Goa kab jaane ka socha hai aur kitne log hain?"
      });
    }

    const reply = data.candidates[0].content.parts[0].text;

    res.json({
      reply: reply,
      customer: customer
    });

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    res.status(200).json({
      reply: "Goa ke liye dates aur kitne log hain, yeh batayein taaki badhiya resort aur cab package nikaal saku."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI backend running on port ${PORT}`);
});
