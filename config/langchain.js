import "dotenv/config"; // Load environment variables
// import { ChatOpenAI } from "@langchain/openai";
import { ChatHuggingFace } from "@langchain/community/chat_models/huggingface";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";



/**
 * Hugging Face Model (Mistral, DeepSeek, etc.)
 */
export const huggingface = async (prompt, options = {}) => {
  const model = new ChatHuggingFace({
    model: options.model || "mistralai/Mistral-7B",
    temperature: options.temperature ?? 0.7,
    apiKey: process.env.HUGGINGFACE_API_KEY,
  });

  return model.invoke(prompt);
};

/**
 * Google Gemini Model
 */
export const gemini = async (prompt, options = {}) => {
  if (!options.model) {
    console.error("Model name is undefined. Using default: 'gemini-pro'");
    options.model = "gemini-pro";  // Ensure a valid model name
  }

  const model = new ChatGoogleGenerativeAI({
    modelName: options.model,
    temperature: options.temperature ?? 0.7,
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    maxOutputTokens: options.maxTokens ?? 1024,
  });

  return model.invoke(prompt);
};
