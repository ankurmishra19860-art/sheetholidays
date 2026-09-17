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
    message: "AI server is running live with auto-retry logic"
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
- Kashmir Package: 5 Nights / 6 Days (5N/6D) | Starting from ₹11,999 per person. 
  Destinations: Srinagar, Gulmarg, Sonmarg, Pahalgam (Pahalgam can be planned for 2 days).
  Inclusions: Hotel stay, standard transport, MAP meal plan (Breakfast & Dinner), local sightseeing. Excludes flights and entry tickets.

LEAD QUALIFICATION & HANDOVER:
When a customer is ready for booking, quotation, or complex requests, summarize their details professionally and provide the WhatsApp contact (+91 73884 42233) for human handover.
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
    let retries = 4; // 4 baar try karega agar high demand aayi toh
    let delay = 1500; // Har try ke beech 1.5 second ka gap

    while (retries > 0) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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

        // Agar successfully data aa gaya aur error nahi hai, toh loop tod do
        if (!data.error) {
          break;
        }

        // Agar high demand error hai, toh thoda ruk kar fir se try karega (frontend par typing indicator chalta rahega)
        console.log(`Gemini busy/high demand. Retries left: ${retries - 1}`);
      } catch (err) {
        console.log("Fetch attempt failed, retrying...", err.message);
      }

      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay += 1000; // Har baar thoda aur wait time badha do (backoff)
      }
    }

    // Agar saare retries ke baad bhi error ya empty data aaye
    if (!data || data.error || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({
        reply: "Bhai, abhi thoda zyada load hai network par. Aap bataiye, kahan ka plan hai aur kitne log hain? Main turant note kar raha hoon!"
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
      reply: "Namaste ji! Network issue ki wajah se thoda time lag gaya. Aap apni travel dates aur destination batayein, hum turant dekhte hain."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sheet Holidays AI backend running on port ${PORT}`);
});
