import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ Remember to get your API Key from Google AI Studio!
const genAI = new GoogleGenerativeAI("AIzaSyD55WvKELPxRDW8sMv-hi-vwwJXBmokTg0");

export async function scanBill(imageFile) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // This part converts the image file so Gemini can "see" it
  const imageData = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const prompt = "Look at this bill. Find the total amount and return it as a number. Only return the number, nothing else.";

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: imageFile.type } }
    ]);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}