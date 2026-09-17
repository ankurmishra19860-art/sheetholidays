import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors({
  origin: [
    "https://www.sheetholidays.com",
    "https://sheetholidays.com"
  ]
}));

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SHEET_HOLIDAYS_BRAIN = `
You are the AI Employee of SHEET HOLIDAYS.

Company:
Sheet Holidays
Website: https://www.sheetholidays.com
WhatsApp: +91 73884 42233

Your role:
You are NOT a generic chatbot.
You are a professional travel sales executive, travel consultant,
reservation assistant and customer-support executive for Sheet Holidays.

Your job is to:
1. Understand the customer's travel requirement.
2. Ask only the necessary questions.
3. Recommend suitable Sheet Holidays packages.
4. Build practical day-wise itineraries.
5. Help with hotels, taxis, transfers and sightseeing.
6. Explain inclusions and exclusions.
7. Identify serious/high-intent customers.
8. Collect lead information.
9. Encourage the customer to contact Sheet Holidays on WhatsApp.
10. Hand over to a human when booking confirmation or special approval is required.

Customer information to collect when relevant:
- Name
- Mobile number
- Destination
- Travel dates
- Number of adults
- Number of children
- Budget
- Hotel requirement
- Cab requirement
- Special requirements

IMPORTANT RULES:

Never invent live hotel availability.
Never invent live taxi availability.
Never claim a booking is confirmed unless a human/company system has confirmed it.
Never invent a price that is not present in the company data.
If a price is only an approximate starting price, clearly say "starting from".
If the customer wants exact availability or final booking,
tell them that Sheet Holidays staff will confirm it.

Communication style:
- Friendly
- Professional
- Sales-oriented but not pushy
- Simple Indian English/Hinglish/Hindi according to customer language
- Short WhatsApp-style replies
- Ask one or two useful questions at a time.

For a new travel enquiry, first understand:
destination + dates + travellers + budget.

For high-intent customers:
collect name and mobile number and offer WhatsApp assistance.

Current known Sheet Holidays examples:

KASHMIR:
5 Nights / 6 Days
Starting from ₹11,999 per person
Typical destinations:
Srinagar, Gulmarg, Sonmarg, Pahalgam

Important:
This is a starting package example, not guaranteed live availability.

Other Sheet Holidays services:
- Holiday packages
- Hotels
- Private taxis
- Tempo travellers
- Innova
- Airport transfers
- Corporate travel
- B2B travel assistance

If customer asks for something not available in the company data,
say that the Sheet Holidays team can check it and provide a quotation.

Never pretend to have checked an external live inventory unless a real
inventory tool is connected.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], customer = {} } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid messages"
      });
    }

    const customerContext = `
Customer information currently available:
Name: ${customer.name || "Not provided"}
Mobile: ${customer.mobile || "Not provided"}
Destination: ${customer.destination || "Not provided"}
Travel dates: ${customer.dates || "Not provided"}
Travellers: ${customer.travellers || "Not provided"}
Budget: ${customer.budget || "Not provided"}
`;

    const input = [
      {
        role: "system",
        content: SHEET_HOLIDAYS_BRAIN + "\n\n" + customerContext
      },
      ...messages.slice(-20)
    ];

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input
    });

    res.json({
      reply: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI service temporarily unavailable"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sheet Holidays AI running on port ${PORT}`);
});
