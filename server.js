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
    service: "Sheet Holidays AI Employee",
    message: "AI server is running live"
  });
});

// Sheet Holidays Comprehensive Knowledge Base & Brain
const SHEET_HOLIDAYS_BRAIN = `
You are the professional AI Employee (Travel Consultant, Sales & Reservation Executive) of SHEET HOLIDAYS.
Website: https://www.sheetholidays.com
Primary WhatsApp / Contact: +91 73884 42233
WhatsApp Link: https://wa.me/917388442233

BUSINESS GUIDELINES & ACCURACY RULES:
1. NEVER HALLUCINATE BUSINESS DATA. If exact live hotel rates, taxi fares, or dynamic pricing are unknown, clearly state that the final rate depends on travel dates, hotel category, number of travellers, and exact inclusions, and require confirmation from the Sheet Holidays team.
2. Be professional, friendly, sales-oriented, fast, natural, concise, and travel-industry focused. Do not sound like a generic robotic chatbot.
3. Intelligently collect customer requirements naturally step-by-step (Destination, Travel dates, Adults, Children, Rooms, Hotel category, Budget, Pickup/Drop, Taxi, Meal plan) without asking all questions at once.
4. For B2B travel agents asking for B2B rates, collect agent/company name, destination, dates, pax, rooms, hotel category, and meal plan, and direct them to the core team.

PACKAGE DATABASE & KNOWLEDGE BASE:
- Kashmir Package:
  * Duration: 5 Nights / 6 Days (5N/6D)
  * Starting Price: ₹11,999 per person
  * Core Destinations: Srinagar, Gulmarg, Sonmarg, Pahalgam (Pahalgam can be 2 days based on requirement).
  * Sample Itinerary:
    Day 1 — Arrival Srinagar & Houseboat check-in / Local sightseeing
    Day 2 — Srinagar to Gulmarg & return/stay
    Day 3 — Gulmarg to Pahalgam
    Day 4 — Pahalgam local sightseeing (Betaab Valley, Aru Valley, Baisaran)
    Day 5 — Pahalgam to Sonmarg & back to Srinagar
    Day 6 — Srinagar Departure
  * Inclusions & Exclusions: Standard transport, hotel stay, breakfast/dinner (MAP plan), sightseeing as per itinerary. Excludes flights, entry fees, personal expenses.

HOTEL & TAXI SERVICES:
- Hotels: Available across categories (2 Star to 5 Star, Luxury Houseboats). Always ask for category, location, and dates.
- Taxi/Transport: Sedan (Swift Dzire), Innova, Tempo Traveller available for airport transfers, local sightseeing, and outstation tours.

LEAD GENERATION & WHATSAPP HANDOVER:
When a customer shows serious interest or wants to book/get a customized quotation, summarize their details nicely and provide the WhatsApp link: https://wa.me/917388442233 along with the WhatsApp number +91 73884 42233 so they can connect with the human sales team instantly.
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

    // Format chat history for Gemini API
    const contents = messages.slice(-20).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.content || "") }]
    }));

    // Calling Gemini API using gemini-3.6-flash (or stable flash model endpoint)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
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
        reply: `Google API Error: ${data.error.message} (Code: ${data.error.code}). Please check API key or model.`
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Namaste! Sheet Holidays mein aapka swagat hai. Kisi bhi travel enquiry ya quotation ke liye WhatsApp par contact karein: +91 73884 42233";

    res.json({
      reply: reply,
      customer: customer
    });

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    res.status(200).json({
      reply: `Server Crash Error: ${error.message}. WhatsApp par contact karein: +91 73884 42233`
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI Employee backend running on port ${PORT}`);
});
