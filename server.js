import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const COMPANY_WHATSAPP = process.env.COMPANY_WHATSAPP || "+917388442233";
const SALES_EMAIL = process.env.SALES_EMAIL || "";

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const conversations = new Map();
const leads = new Map();
const actionLogs = [];

function generateId(prefix = "sh") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function logAction(type, data = {}) {
  const entry = { id: generateId("log"), time: now(), type, ...data };
  actionLogs.push(entry);
  if (actionLogs.length > 5000) actionLogs.splice(0, 1000);
  console.log("ACTION:", JSON.stringify(entry));
  return entry;
}

const packages = [
  {
    id: "KASHMIR-5N6D-001",
    destination: "Kashmir",
    name: "Kashmir 5 Nights / 6 Days",
    duration: "5N/6D",
    price_from: 11999,
    currency: "INR",
    price_type: "per_person",
    destinations: ["Srinagar", "Gulmarg", "Sonmarg", "Pahalgam"],
    tags: ["family", "honeymoon", "kashmir", "budget"],
    source: "sheet_holidays"
  }
];

async function searchPackages(args) {
  const destination = String(args.destination || "").toLowerCase();
  const budget = Number(args.budget) || null;
  let results = packages.filter(p => p.destination.toLowerCase().includes(destination));
  logAction("PACKAGE_SEARCH", { destination, budget, resultCount: results.length });
  return { success: true, results };
}

async function createOrUpdateLead(args, conversationId) {
  let lead = [...leads.values()].find(x => x.conversationId === conversationId);
  if (!lead) {
    lead = { id: generateId("lead"), conversationId, createdAt: now(), status: "NEW", leadSource: "Website AI" };
  }
  Object.assign(lead, { ...args, updatedAt: now() });
  leads.set(lead.id, lead);
  logAction("LEAD_UPDATED", { leadId: lead.id, status: lead.status });
  return { success: true, lead };
}

async function handoverToHuman(args, conversationId) {
  const leadResult = await createOrUpdateLead({ ...args }, conversationId);
  const lead = leadResult.lead;
  lead.status = "HUMAN_HANDOVER";
  leads.set(lead.id, lead);
  logAction("HUMAN_HANDOVER_STARTED", { conversationId, leadId: lead.id });
  return { success: true, leadId: lead.id, status: "HUMAN_HANDOVER" };
}

const tools = [
  {
    functionDeclarations: [
      {
        name: "search_packages",
        description: "Search Sheet Holidays package database.",
        parameters: {
          type: Type.OBJECT,
          properties: { destination: { type: Type.STRING }, budget: { type: Type.NUMBER } },
          required: ["destination"]
        }
      },
      {
        name: "create_or_update_lead",
        description: "Create or update customer enquiry.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            mobile: { type: Type.STRING },
            destination: { type: Type.STRING },
            travelDate: { type: Type.STRING },
            adults: { type: Type.NUMBER }
          }
        }
      },
      {
        name: "handover_to_human",
        description: "Hand over to human team.",
        parameters: {
          type: Type.OBJECT,
          properties: { customerName: { type: Type.STRING }, mobile: { type: Type.STRING }, destination: { type: Type.STRING } }
        }
      }
    ]
  }
];

async function executeTool(name, args, conversationId) {
  switch (name) {
    case "search_packages": return await searchPackages(args);
    case "create_or_update_lead": return await createOrUpdateLead(args, conversationId);
    case "handover_to_human": return await handoverToHuman(args, conversationId);
    default: return { success: false, error: `Unknown tool: ${name}` };
  }
}

async function runTravelAgent(conversationId, messages, agentConfig) {
  let contents = messages.slice(-30).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "") }]
  }));

  const systemPrompt = `
You are ${agentConfig.name}, a professional ${agentConfig.gender === 'female' ? 'female' : 'male'} travel consultant and sales executive at Sheet Holidays.
Website: https://www.sheetholidays.com, WhatsApp: ${COMPANY_WHATSAPP}.
Speak naturally, maintain your specific persona, match the language of the user (Hindi/Hinglish/English), and never break character.
`;

  contents.unshift({ role: "user", parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${systemPrompt}` }] });

  for (let round = 0; round < 3; round++) {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: { temperature: 0.35, tools }
    });

    const functionCalls = response.functionCalls || [];
    if (!functionCalls.length) {
      return { reply: response.text || "Ji batayein, main aapki kya sahayta kar sakti hoon?", toolActions: [] };
    }

    if (response.candidates?.[0]?.content) {
      contents.push(response.candidates[0].content);
    }

    const toolResponses = [];
    for (const call of functionCalls) {
      const result = await executeTool(call.name, call.args || {}, conversationId);
      toolResponses.push({ name: call.name, id: call.id, response: { result } });
    }

    contents.push({
      role: "user",
      parts: toolResponses.map(tr => ({ functionResponse: { name: tr.name, id: tr.id, response: tr.response } }))
    });
  }

  return { reply: "Aapki details note kar li hain, team aapse jald sampark karegi.", toolActions: [] };
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], customer = {}, agent = {} } = req.body;
    const conversationId = customer.conversationId || generateId("conv");

    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, { id: conversationId, customer, messages: [] });
    }

    const conversation = conversations.get(conversationId);
    conversation.messages = messages;

    const result = await runTravelAgent(conversationId, messages, agent);

    conversation.messages.push({ role: "assistant", content: result.reply, createdAt: now() });

    return res.json({ success: true, conversationId, reply: result.reply });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    return res.status(500).json({ success: false, reply: "Technical error aagayi hai. WhatsApp karein: +91 73884 42233" });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "10-AI Employee Multi-Agent System Active" });
});

app.listen(PORT, () => {
  console.log(`🚀 Multi-Agent AI System running on port ${PORT}`);
});
