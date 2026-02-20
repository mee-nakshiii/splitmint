import { GoogleGenerativeAI } from "@google/generative-ai";

// Use the API key you generated today, Feb 20, 2026
const genAI = new GoogleGenerativeAI("AIzaSyD55WvKELPxRDW8sMv-hi-vwwJXBmokTg0");

// Old function (keeps Quick Split working)
export async function scanBill(imageFile) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const imageData = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });
  const prompt = "Find the total amount on this bill. Return only the number.";
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageData, mimeType: imageFile.type } }
  ]);
  return result.response.text();
}

// NEW function for the Trip Room lunch scenario
export async function scanItemizedBill(imageFile) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageData = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const prompt = `Identify all items on this bill. 
  Return a JSON array of objects. Each object must have:
  "name": (the item name), 
  "price": (the price as a number).
  Example: [{"name": "Chicken Biriyani", "price": 180}]
  Return ONLY the JSON array. No extra text.`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: imageFile.type } }
    ]);
    const text = result.response.text().replace(/```json|```/g, "");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    return [];
  }
}