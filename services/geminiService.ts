import { Flashcard, QuizQuestion } from "../types";

let aiInstance: any | null = null;
const getAi = async () => {
  if (!aiInstance) {
    const mod = await eval("import('@google/genai')");
    aiInstance = new mod.GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

const MODEL_NAME = "gemini-2.5-flash";
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

export const generateSummary = async (
  input: string | { data: string; mimeType: string }
): Promise<string> => {
  try {
    const parts = [];
    if (typeof input === "string") {
      parts.push({ text: input });
    } else {
      parts.push({
        inlineData: { data: input.data, mimeType: input.mimeType },
      });
    }

    parts.push({
      text: `
You are an expert academic editor and professional curriculum writer. Given any input (text, lecture transcript, audio, slides or documents), produce an authoritative, concise, and highly-organized study guide in strict Markdown format.

REQUIREMENTS (MUST FOLLOW EXACTLY):

1) Top-level title (H1) — descriptive and professional (no emojis here).

2) One-sentence TL;DR (single line, <= 20 words).

3) Executive summary (1 short paragraph — 2–4 sentences) that explains what the content covers and why it matters.

4) Learning objectives (bullet list of 3–5 measurable objectives; each starts with a verb such as "Explain", "Identify", "Apply").

5) Structured outline (H2) — short table-of-contents style bullets linking to the sections you will cover.

6) Detailed notes (H2) with clear H3 subsections. Follow this pattern for each major section:
   - H3 subsection title
   - Short explanatory paragraph (1–3 sentences)
   - Key points (1–6 bullets) with bolded terms and short supporting sentences
   - If applicable, include an example, formula (in a fenced code block), or a short step-by-step process.

7) Glossary (H2) — 6–10 key terms, each formatted as **Term** — short concise definition (one line).

8) Study plan (H2) — 2–3 short sessions with time estimates and focus areas (e.g., "30 minutes — Read and annotate; 45 minutes — Flashcards & practice").

9) Practice questions (H2) — 5 questions total: 3 conceptual, 1 applied, 1 challenge. After the questions, include an **Answers** section with succinct answers.

10) Key takeaways (H2) — 3–6 short, memorable lines.

FORMAT RULES (MANDATORY):
- Output only the study guide in valid Markdown. Do not include any extra commentary, code fences (except for formulas), or explanation outside the requested sections.
- Use consistent heading hierarchy and spacing. Keep tone professional and clear. Avoid casual slang.
- Keep the executive summary and TL;DR short and sharp. Use bullet points for lists.
- When giving examples, keep them short and directly relevant.
- Avoid producing more than ~1200 words total.

The final guide should read like a concise, polished chapter summary tailored for study and quick review.
      `,
    });

    const ai = await getAi();
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

export const generateFlashcards = async (
  summary: string
): Promise<Flashcard[]> => {
  try {
    const ai = await getAi();
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
        // Use plain JSON Schema values so we don't rely on the runtime enum export.
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: { type: "string" },
              back: { type: "string" },
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
      id: `card-${index}-${Date.now()}`,
    }));
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return [];
  }
};

export const generateQuiz = async (
  summary: string
): Promise<QuizQuestion[]> => {
  try {
    const ai = await getAi();
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
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                items: { type: "string" },
              },
              correctAnswerIndex: { type: "integer" },
              explanation: { type: "string" },
            },
            required: [
              "question",
              "options",
              "correctAnswerIndex",
              "explanation",
            ],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const parsed = JSON.parse(text);
    return parsed.map((q: any, index: number) => ({
      ...q,
      id: `quiz-${index}-${Date.now()}`,
    }));
  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};

export const chatWithContext = async (
  currentMessage: string,
  context: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[]
) => {
  const ai = await getAi();
  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: `You are a dedicated and focused AI study assistant. 
      Your sole purpose is to help the student master the material in the provided notes.
      
      STRICT GUIDELINES:
      1. ONLY answer questions that are related to the provided study notes, academic concepts, or learning strategies.
      2. If the user asks about unrelated topics (e.g., pop culture, sports, general life advice, jokes not related to the content), YOU MUST POLITELY REFUSE. Say something like: "I am focused on helping you study. Let's get back to the notes."
      3. Be concise, encouraging, and clear.
      4. Use formatting (bold, bullet points) to make explanations easy to read.
      
      STUDY NOTES CONTEXT:
      ${context}`,
    },
    history: history,
  });

  const result = await chat.sendMessage({ message: currentMessage });
  return result.text;
};

export const generateStudyImage = async (
  topic: string
): Promise<string | null> => {
  try {
    const ai = await getAi();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [
          {
            text: `Create a clean, aesthetic, educational illustration that clearly explains the concept of: ${topic}

STYLE REQUIREMENTS:

Minimalist vector-art look

Soft pastel color palette (blue, white, grey)

Flat-design shapes and smooth edges

Balanced composition with clean spacing

Modern, academic, student-friendly aesthetic

CONTENT REQUIREMENTS:

Present the core idea of ${topic} visually and accurately

Use simple shapes, icons, labels, or annotation-style callouts

Keep all text minimal, clear, and easy to read

Avoid clutter, noise, or overly complex elements

Maintain strong contrast and visual hierarchy

QUALITY TARGET:

Should resemble a premium study-guide illustration

Should feel professional, calm, and easy to learn from

Clear focus on understanding, not decoration

OUTPUT FORMAT:

One single illustration

Vector-style clarity

No unrelated objects or extra artistic effects`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};
