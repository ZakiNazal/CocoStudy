import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard, QuizQuestion } from "../types";

// Initialize Gemini Client
// In a real app, this should be handled more securely, but for this demo environment process.env.API_KEY is standard.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const generateSummary = async (
  input: string | { data: string; mimeType: string }
): Promise<string> => {
  try {
    const parts = [];
    if (typeof input === 'string') {
      parts.push({ text: input });
    } else {
      parts.push({ inlineData: { data: input.data, mimeType: input.mimeType } });
    }

    // Add prompt part
    parts.push({
      text: `
        You are an expert study companion similar to Coconote. 
        Analyze the provided content (text or audio). 
        Create a comprehensive, structured study guide in Markdown format.
        
        The structure must include:
        1. A catchy Title (h1)
        2. Executive Summary (bolded)
        3. Key Concepts (bullet points with emojis)
        4. Detailed Notes (nested bullets, clear headers)
        5. Key Takeaways
        
        Use highlighting (bold) for important terms. Make it visually appealing and easy to read.
      `
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
    });

    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
};

export const generateFlashcards = async (summary: string): Promise<Flashcard[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `
        Based on the following notes, create 8-12 high-quality flashcards for studying.
        Return a JSON array where each object has "front" and "back" properties.
        Keep the front concise (question/term) and the back informative (answer/definition).
        
        Notes:
        ${summary.substring(0, 10000)}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
            },
            required: ["front", "back"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return parsed.map((card: any, index: number) => ({
      ...card,
      id: `card-${index}-${Date.now()}`
    }));
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
};

export const generateQuiz = async (summary: string): Promise<QuizQuestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `
        Based on the following notes, create a multiple-choice quiz with 5 challenging questions.
        Return a JSON array.
        
        Notes:
        ${summary.substring(0, 10000)}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return parsed.map((q: any, index: number) => ({
      ...q,
      id: `quiz-${index}-${Date.now()}`
    }));
  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};

export const chatWithContext = async (
  currentMessage: string,
  context: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
) => {
  const chat = ai.chats.create({
    model: MODEL_NAME,
    history: [
      {
        role: 'user',
        parts: [{ text: `You are a helpful study tutor. Answer questions based on these notes:\n\n${context}` }],
      },
      {
        role: 'model',
        parts: [{ text: "Understood. I am ready to help you study these notes." }],
      },
      ...history
    ],
  });

  const result = await chat.sendMessage({ message: currentMessage });
  return result.text;
};
