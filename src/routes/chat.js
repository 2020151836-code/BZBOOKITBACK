import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { protect } from './authMiddleware.js';

const router = express.Router();

if (!process.env.GEMINI_API_KEY) {
  console.error("CRITICAL: GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// FIX: Updated to a valid Gemini model name
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash-001"
});

router.post("/", protect, async (req, res) => {
  try {
    const { history, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const chatHistory = (history || []).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const firstUserIndex = chatHistory.findIndex(msg => msg.role === 'user');
    const validHistory = firstUserIndex === -1 ? [] : chatHistory.slice(firstUserIndex);

    const chat = model.startChat({
      history: validHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("Error in Gemini chat:", error);
    res.status(500).json({ error: "Failed to get response from AI." });
  }
});

export default router;
