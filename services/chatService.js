import { HuggingFaceInference } from "@langchain/community/llms/hf";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// Model Providers
const modelProviders = {
  huggingface: async (userPrompt, options = {}) => {
    const model = new HuggingFaceInference({
      model: options.model || "mistralai/Mistral-7B",
      temperature: options.temperature ?? 0.7,
      apiKey: process.env.HUGGINGFACE_API_KEY,
    });
  
    return await model.invoke(userPrompt);
  },
  gemini: async (userPrompt, options = {}) => {
    // Ensure API key is available
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      throw new Error("GOOGLE_GENAI_API_KEY is not set in environment variables");
    }
    
    // Create prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", options.systemPrompt || "You are a helpful AI assistant."],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
    ]);
    
    // Create the model instance
    const model = new ChatGoogleGenerativeAI({
      modelName: options.model || "gemini-pro",
      temperature: options.temperature ?? 0.7,
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      maxOutputTokens: options.maxTokens ?? 1024,
    });
    
    // Format the messages
    const formattedPrompt = await prompt.formatMessages({
      input: userPrompt,
      chat_history: options.chatHistory || []
    });
    
    // Invoke the model with the formatted messages
    return await model.invoke(formattedPrompt);
  }
};

// Predefined Scenario Configurations
const scenarios = {
  coding: {
    systemPrompt: 'You are an expert programming assistant. Provide clear, concise code solutions.',
    defaultModel: 'gemini-pro',
    defaultProvider: 'gemini'
  },
  writing: {
    systemPrompt: 'You are a professional writing assistant. Help create high-quality, coherent text.',
    defaultModel: 'gemini-pro',
    defaultProvider: 'gemini'
  },
  analysis: {
    systemPrompt: 'You are a detailed analytical assistant. Provide in-depth, structured insights.',
    defaultModel: 'gemini-pro',
    defaultProvider: 'gemini'
  }
};

export const chatWithAI = async (options = {}) => {
  const {
    provider = 'gemini', // Default to Gemini
    model = 'gemini-pro', // Default to gemini-pro
    systemPrompt = 'You are a helpful AI assistant.',
    userPrompt,
    temperature = 0.7,
    chatHistory = []
  } = options;

  if (!userPrompt) {
    throw new Error('User prompt is required.');
  }

  try {
    // Select model provider
    const providerFunction = modelProviders[provider];
    if (!providerFunction) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Invoke AI model with context
    const response = await providerFunction(userPrompt, { 
      model, 
      temperature, 
      systemPrompt, 
      chatHistory 
    });

    // Return the appropriate content based on the response structure
    if (response.content) {
      return response.content;
    } else if (typeof response === 'string') {
      return response;
    } else if (response.text) {
      return response.text;
    } else {
      return JSON.stringify(response);
    }
  } catch (error) {
    console.error('AI Chat Error:', error);
    throw new Error(`Failed to chat with AI: ${error.message}`);
  }
};

export const generateSpecializedResponse = async (scenario, context = {}) => {
  // Validate scenario input
  const scenarioConfig = scenarios[scenario];
  if (!scenarioConfig) {
    throw new Error(`Unsupported scenario: "${scenario}". Available options: ${Object.keys(scenarios).join(', ')}`);
  }

  // Ensure userPrompt is provided
  if (!context.userPrompt) {
    throw new Error('User prompt is required for generating a specialized response');
  }

  try {
    // Prepare AI request data with robust fallback values
    const requestData = {
      provider: context.provider || scenarioConfig.defaultProvider || 'gemini',
      model: context.model || scenarioConfig.defaultModel,
      systemPrompt: context.systemPrompt || scenarioConfig.systemPrompt,
      userPrompt: context.userPrompt,
      temperature: context.temperature ?? 0.7,
      chatHistory: context.chatHistory || []
    };

    // Call AI model
    const response = await chatWithAI(requestData);
    return response;
  } catch (error) {
    console.error('Error generating specialized response:', error);
    throw new Error(`Failed to generate specialized response: ${error.message}`);
  }
};

// Gemini embeddings functionality
export const getGeminiEmbeddings = async (text) => {
  try {
    // Ensure API key is available
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      throw new Error("GOOGLE_GENAI_API_KEY is not set in environment variables");
    }
    
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      modelName: "embedding-001", // Gemini's embedding model
    });
    
    return await embeddings.embedQuery(text);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
};

export default {
  chatWithAI,
  generateSpecializedResponse,
  getGeminiEmbeddings
};