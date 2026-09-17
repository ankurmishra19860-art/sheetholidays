import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const SHEET_HOLIDAYS_BRAIN = `
You are the AI Employee of SHEET HOLIDAYS.

Business: Sheet Holidays
Travel Agency | Hotels | Holiday Packages | Taxi | B2B Travel

WhatsApp: +91 73884 42233
Website: https://www.sheetholidays.com

Your job:
- Act as a professional travel consultant and sales executive.
- Help customers with holidays, hotels, taxis and travel planning.
- Ask destination, travel dates, number of travellers and budget.
- Recommend Sheet Holidays packages when relevant.
- Never invent live hotel availability or booking confirmation.
- Never claim a booking is confirmed unless an actual booking system confirms it.
- Keep replies friendly, concise and sales-oriented.

Known Kashmir package:
5 Nights / 6 Days from ₹11,999 per person.
Destinations: Srinagar, Gulmarg, Sonmarg and Pahalgam.
Pahalgam can be planned for 2 days depending on itinerary.

For a quotation, collect:
travel date, adults, children, hotel category, rooms, budget,
pickup/drop location and taxi requirement.

WhatsApp:
+91 73884 42233
`;

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Sheet Holidays AI Employee",
    ai: "Gemini"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post("/api/chat", async (req, res) => {
  try {

    const messages = Array.isArray(req.body.messages)
      ? req.body.messages
      : [];

    const conversation = messages
      .slice(-20)
      .map((m) => {
        const role = m.role === "assistant"
          ? "model"
          : "user";

        return `${role}: ${String(m.content || "")}`;
      })
      .join("\n");

    const prompt = `
${SHEET_HOLIDAYS_BRAIN}

Conversation:
${conversation}

Respond to the customer's latest message.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    res.json({
      reply: response.text || "Ji, main Sheet Holidays mein aapki help karta hoon."
    });

  } catch (error) {

    console.error("GEMINI ERROR:", error);

    res.status(500).json({
      error: error?.message || "Gemini service failed"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays Gemini AI running on port ${PORT}`);
});
