import AIService from '../services/chatService.js';

// Response handler utility
const responseHandler = {
  success: (res, data) => res.status(200).json({
    success: true,
    ...data
  }),
  error: (res, error, statusCode = 500) => res.status(statusCode).json({
    success: false,
    message: error.message
  })
};

//  * Handle general AI chat request
export const chat = async (req, res) => {
  try {
    const {
      provider = 'gemini', // Changed default to Gemini
      model = 'gemini-pro', // Changed default model
      systemPrompt,
      userPrompt,
      temperature = 0.7,
      chatHistory = []
    } = req.body;

    // Validate required inputs
    if (!userPrompt) {
      return responseHandler.error(res, new Error('User prompt is required'), 400);
    }

    const response = await AIService.chatWithAI({
      provider,
      model,
      systemPrompt,
      userPrompt,
      temperature,
      chatHistory
    });

    return responseHandler.success(res, {
      message: 'AI response generated successfully',
      response
    });
  } catch (error) {
    console.error('Chat Error:', error);
    return responseHandler.error(res, error);
  }
};

export const generateSpecializedResponse = async (req, res) => {
  try {
    const {
      scenario,
      context = {}
    } = req.body;

    // Validate required inputs
    if (!scenario) {
      return responseHandler.error(res, new Error('Scenario is required'), 400);
    }
    if (!context.userPrompt) {
      return responseHandler.error(res, new Error('User prompt is required'), 400);
    }

    const response = await AIService.generateSpecializedResponse(scenario, context);

    return responseHandler.success(res, {
      message: 'Specialized response generated successfully',
      scenario,
      response
    });
  } catch (error) {
    console.error('Specialized Response Error:', error);
    return responseHandler.error(res, error);
  }
};

// Add endpoint for embeddings
export const getEmbeddings = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return responseHandler.error(res, new Error('Text is required for embeddings'), 400);
    }
    
    const embeddings = await AIService.getGeminiEmbeddings(text);
    
    return responseHandler.success(res, {
      message: 'Embeddings generated successfully',
      embeddings
    });
  } catch (error) {
    console.error('Embeddings Error:', error);
    return responseHandler.error(res, error);
  }
};

export default {
  chat,
  generateSpecializedResponse,
  getEmbeddings
};