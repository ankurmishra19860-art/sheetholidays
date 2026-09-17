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
  apiKey: process.env.OPENAI_API_KEY
});


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Sheet Holidays AI Employee",
    message: "AI server is running"
  });
});


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
});


/* =========================
   DIRECT OPENAI TEST
========================= */

app.get("/api/test-openai", async (req, res) => {
  try {

    // Corrected method and standard model
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: "Reply with exactly: SHEET HOLIDAYS AI OK" }
      ]
    });

    res.json({
      status: "success",
      reply: response.choices[0].message.content
    });

  } catch (error) {

    console.error("OPENAI TEST ERROR:", error);

    res.status(500).json({
      status: "failed",
      error: error?.message || "Unknown error",
      code: error?.code || null,
      statusCode: error?.status || null
    });
  }
});


/* =========================
   SHEET HOLIDAYS AI BRAIN
========================= */

const SHEET_HOLIDAYS_BRAIN = `
You are the AI Employee of SHEET HOLIDAYS.

Business:
Sheet Holidays
Travel Agency | Hotels | Holiday Packages | Taxi | B2B Travel

WhatsApp:
+91 73884 42233

Website:
https://www.sheetholidays.com

You are a real travel sales and reservation assistant.

Your responsibilities:
1. Understand customer travel requirements.
2. Ask destination, dates, travellers and budget.
3. Recommend relevant Sheet Holidays packages.
4. Create useful itinerary suggestions.
5. Help with hotels, taxis and holiday packages.
6. Handle B2B travel-agent enquiries.
7. Collect serious leads.
8. Encourage customers to contact Sheet Holidays WhatsApp.
9. Never claim a booking is confirmed unless an actual booking system confirms it.
10. Never invent live hotel availability.
11. Never invent live taxi availability.
12. Never invent prices that are not provided.

KNOWN PACKAGE:
Kashmir 5 Nights / 6 Days
Starting from ₹11,999 per person.

Destinations:
Srinagar
Gulmarg
Sonmarg
Pahalgam

Pahalgam can be planned for 2 days depending on the itinerary.

For final quotation, ask for:
- Travel date
- Number of adults
- Number of children
- Hotel category
- Number of rooms
- Budget
- Pickup location
- Drop location
- Taxi requirement

Final package price can depend on dates, hotel category, travellers, transport and inclusions.

When the customer has a serious enquiry, provide:
WhatsApp:
+91 73884 42233
WhatsApp link:
https://wa.me/917388442233

Keep replies professional, friendly, concise and sales-oriented.
Do not sound like a generic chatbot.
`;


/* =========================
   CHAT
========================= */

app.post("/api/chat", async (req, res) => {

  try {

    const { messages = [], customer = {} } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "messages must be an array"
      });
    }

    const cleanMessages = messages
      .slice(-20)
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content || "")
      }));

    // Pass system instructions inside messages array for chat completions API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

    console.log("========== OPENAI CHAT ERROR ==========");
    console.error(error);
    console.log("========================================");


    res.status(500).json({
      error: error?.message || "AI request failed",
      code: error?.code || null,
      statusCode: error?.status || null
    });

  }

});


/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path
  });
});


/* =========================
   START
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI running on port ${PORT}`);
});
