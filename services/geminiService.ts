import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePlanMarketing = async (planName: string, duration: string, price: number): Promise<string> => {
  if (!process.env.API_KEY) return "Experience high-speed internet with SaidiNet.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write a short, catchy, 2-sentence marketing tagline for a Wi-Fi plan called "${planName}". 
      Duration: ${duration}. Price: $${price}. Target audience: Cafe users and gamers. 
      Emphasize speed and reliability. Do not use quotes.`,
    });
    return response.text?.trim() || "Fast, reliable, and affordable internet access.";
  } catch (error) {
    console.error("Error generating marketing copy:", error);
    return "Fast, reliable, and affordable internet access.";
  }
};

export const analyzeRevenueData = async (data: any[]): Promise<string> => {
  if (!process.env.API_KEY) return "AI Insights unavailable without API Key.";

  try {
    const dataStr = JSON.stringify(data.slice(-5)); // Analyze last 5 days
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this revenue data for a Wi-Fi hotspot business: ${dataStr}. 
      Provide a brief 30-word strategic advice on how to increase sales based on the trend.`,
    });
    return response.text?.trim() || "Unable to analyze trends at this moment.";
  } catch (error) {
    console.error("Error analyzing revenue:", error);
    return "Unable to analyze trends at this moment.";
  }
};
