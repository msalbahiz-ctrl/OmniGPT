import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many messages right now. Please wait a minute and try again." }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "OmniGPT" });
});

app.post("/api/chat", chatLimiter, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "OmniGPT is not connected yet. The server owner must add an API key to the private .env file."
    });
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return res.status(400).json({ error: "Send between 1 and 20 recent messages." });
  }

  const cleanMessages = [];
  for (const message of messages) {
    const role = message?.role;
    const content = message?.content;
    if (!["user", "assistant"].includes(role) ||
        typeof content !== "string" ||
        !content.trim() ||
        content.length > 6000) {
      return res.status(400).json({ error: "One of the messages is invalid or too long." });
    }
    cleanMessages.push({ role, content: content.trim() });
  }

  if (!cleanMessages.some(message => message.role === "user")) {
    return res.status(400).json({ error: "A user message is required." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6.2-astra",
      instructions: [
        "You are OmniGPT, a helpful, friendly, accurate AI assistant.",
        "Use clear language and adapt to the user's language.",
        "If you are unsure, say so rather than inventing facts.",
        "Keep answers organized and useful."
      ].join(" "),
      input: cleanMessages,
      max_output_tokens: 900,
      store: false
    });

    const answer = result.output_text?.trim();
    if (!answer) {
      return res.status(502).json({ error: "The AI returned an empty response. Please try again." });
    }
    res.json({ answer });
  } catch (error) {
    console.error("OmniGPT API error:", error?.message || error);
    if (error?.status === 401) {
      return res.status(502).json({ error: "The server API key was rejected. The owner should check the private API key." });
    }
    if (error?.status === 429) {
      return res.status(429).json({ error: "The AI service is busy or the API usage limit has been reached. Please try again later." });
    }
    res.status(502).json({ error: "OmniGPT could not reach its AI service. Please try again in a moment." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`OmniGPT is running on port ${PORT}`);
});