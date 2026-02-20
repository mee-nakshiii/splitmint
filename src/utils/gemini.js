import { GoogleGenerativeAI } from "@google/generative-ai";

// Use the API key you generated today, Feb 20, 2026
// NOTE: prefer setting the key via env var `REACT_APP_GENAI_KEY` and the model via
// `REACT_APP_GENAI_MODEL` in local development. Defaults here are present for
// convenience but may not match the deployed API surface.
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GENAI_KEY || "AIzaSyD55WvKELPxRDW8sMv-hi-vwwJXBmokTg0");

// Quick mock mode to let the UI be exercised without a working GenAI model.
// Enable by setting REACT_APP_GENAI_MOCK=true in your env or .env file.
const MOCK_MODE = process.env.REACT_APP_GENAI_MOCK === 'true';

// Old function (keeps Quick Split working)
function getPreferredModelName() {
  // Try configured model first, then sensible fallbacks.
  return process.env.REACT_APP_GENAI_MODEL || 'models/text-bison-001';
}

export async function scanBill(imageFile) {
  if (MOCK_MODE) {
    console.log('scanBill: MOCK_MODE enabled — returning sample total');
    return '123.45';
  }

  const modelName = getPreferredModelName();
  const model = genAI.getGenerativeModel({ model: modelName });
  const imageData = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });
  const prompt = "Find the total amount on this bill. Return only the number.";
  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: imageFile.type } }
    ]);
    return result.response.text();
  } catch (err) {
    console.error('scanBill: model generateContent error', err);
    // If model not found, try to list available models (if SDK exposes it) to aid debugging
    if (err?.message?.includes('models/') || err?.message?.includes('not found')) {
      try {
        const models = typeof genAI.listModels === 'function' ? await genAI.listModels() : undefined;
        console.warn('Available models (SDK listModels):', models);
      } catch (listErr) {
        console.warn('Could not list models:', listErr);
      }
      throw new Error(`Model ${modelName} appears unavailable. Set REACT_APP_GENAI_MODEL to a supported model and retry.`);
    }
    throw err;
  }
}

// NEW function for the Trip Room lunch scenario
export async function scanItemizedBill(imageFile) {
  if (MOCK_MODE) {
    console.log('scanItemizedBill: MOCK_MODE enabled — returning sample items');
    return [
      { name: 'Chicken Biriyani', price: 180 },
      { name: 'Coke', price: 40 }
    ];
  }

  const modelName = getPreferredModelName();
  const model = genAI.getGenerativeModel({ model: modelName });

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
    console.log("scanItemizedBill: starting scan for file", imageFile && imageFile.name);
    let result;
    try {
      result = await model.generateContent([
        prompt,
        { inlineData: { data: imageData, mimeType: imageFile.type } }
      ]);
    } catch (err) {
      console.error('scanItemizedBill: model generateContent error', err);
      if (err?.message?.includes('models/') || err?.message?.includes('not found')) {
        try {
          const models = typeof genAI.listModels === 'function' ? await genAI.listModels() : undefined;
          console.warn('Available models (SDK listModels):', models);
        } catch (listErr) {
          console.warn('Could not list models:', listErr);
        }
        throw new Error(`Model ${modelName} appears unavailable. Set REACT_APP_GENAI_MODEL to a supported model and retry.`);
      }
      throw err;
    }

    const raw = result.response?.text?.() || '';
    console.log("scanItemizedBill: raw response", raw);
    const text = raw.replace(/```json|```/g, "");
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (parseErr) {
      console.error('scanItemizedBill: JSON parse error', parseErr, 'text:', text);
      throw parseErr;
    }
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    // rethrow so callers can handle and present diagnostics
    throw error;
  }
}