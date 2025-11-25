import express from 'express';
import { protect } from './authMiddleware.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Initialize the Google Generative AI client with the API key from your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/ai/generate-description
// An example route that might take some input and generate text using an AI model.
router.post('/generate-description', protect, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'A prompt is required.' });
    }

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ description: text });
  } catch (error) {
    console.error('Error in AI route:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

export default router;
