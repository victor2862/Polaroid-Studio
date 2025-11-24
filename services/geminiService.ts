import { GoogleGenAI } from "@google/genai";

// Ensure API Key is available
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateCaption = async (base64Image: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key missing");
    return "Legenda (API Key Missing)";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Good for fast image analysis
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1], // Remove data:image/xyz;base64, prefix
              mimeType: 'image/jpeg', // Assuming jpeg/png, API handles most standard types
            },
          },
          {
            text: "Escreva uma legenda curta, criativa e nostálgica (máximo 4-5 palavras) para esta foto estilo Polaroid. Responda apenas com a legenda em Português.",
          },
        ],
      },
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Erro ao gerar legenda:", error);
    return "";
  }
};