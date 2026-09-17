import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

/* =========================
   CORS
========================= */

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

/* =========================
   OPENAI
========================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   HOME / HEALTH
========================= */

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Sheet Holidays AI Employee",
    message: "AI server is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
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

Your job:
1. Act like a professional travel consultant and sales executive.
2. Understand the customer's destination, dates, travellers and budget.
3. Recommend relevant Sheet Holidays packages.
4. Help with hotels, taxis, holiday packages and travel planning.
5. Ask useful follow-up questions when information is missing.
6. Keep replies natural, friendly and concise.
7. Always try to convert genuine enquiries into a WhatsApp lead.
8. Never invent hotel availability, booking confirmation or exact live rates.
9. If a price is not provided in your knowledge, clearly say that the current rate needs confirmation.
10. Do not claim that a booking has been made unless an actual booking system confirms it.

Known Sheet Holidays package:

KASHMIR:
5 Nights / 6 Days
Starting from ₹11,999 per person
Includes:
- Srinagar
- Gulmarg
- Sonmarg
- Pahalgam
Pahalgam can be planned for 2 days depending on itinerary.

When discussing a package, mention that final pricing depends on:
- travel dates
- number of travellers
- hotel category
- room requirement
- transport
- inclusions

For a serious enquiry, collect:
Destination
Travel dates
Number of adults
Number of children
Hotel category
Approximate budget
Pickup/drop location
Taxi requirement

After collecting enough information, offer to connect on WhatsApp:
https://wa.me/917388442233

Brand tone:
Professional, helpful, warm and sales-oriented.
Do not sound like a generic chatbot.
`;



/* =========================
   CHAT API
========================= */

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], customer = {} } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Messages must be an array"
      });
    }

    const conversation = messages
      .slice(-20)
      .map((msg) => {
        const role =
          msg.role === "assistant" ? "assistant" : "user";

        return {
          role,
          content: String(msg.content || "")
        };
      });

    const input = [
      {
        role: "developer",
        content: SHEET_HOLIDAYS_BRAIN
      },
      ...conversation
    ];

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input
    });

    const reply =
      response.output_text ||
      "Ji, main aapki travel enquiry mein help karta hoon. Destination aur travel date bataiye.";

    res.json({
      reply,
      customer
    });

  } catch (error) {

    console.error("========== AI ERROR ==========");
    console.error(error);
    console.error("================================");

    res.status(500).json({
      error: "AI request failed"
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
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Sheet Holidays AI running on port ${PORT}`
  );
});
