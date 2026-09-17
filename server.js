import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Sheet Holidays AI Employee"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    openaiKeyConfigured: !!process.env.OPENAI_API_KEY
  });
});

app.post("/api/chat", async (req, res) => {

  try {

    const messages = Array.isArray(req.body.messages)
      ? req.body.messages
      : [];

    const response = await client.responses.create({
      model: "gpt-5",
      instructions: `
You are the AI Employee of Sheet Holidays.

Sheet Holidays is a travel agency providing:
- Kashmir holiday packages
- Hotels
- Taxi
- B2B travel services
- India and international holidays

WhatsApp: +91 73884 42233
Website: https://www.sheetholidays.com

Known Kashmir package:
5 Nights / 6 Days from ₹11,999 per person.
Covers Srinagar, Gulmarg, Sonmarg and Pahalgam.

Be a helpful travel sales executive.
Ask for travel date, number of travellers and budget when needed.
Do not invent live availability or booking confirmation.
`,
      input: messages.slice(-20)
    });

    res.json({
      reply: response.output_text
    });

  } catch (error) {

    console.error("OPENAI ERROR:", error);

    res.status(500).json({
      error: error?.message || "AI service failed",
      code: error?.code || null,
      status: error?.status || null
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI running on port ${PORT}`);
});
