
import AIService from '../services/chatService.js';
import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import ScenarioTemplate from '../models/scenarioTemplateModel.js';

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

// Handle general AI chat request
export const chat = async (req, res) => {
  try {
    const {
      provider = 'gemini',
      model = 'gemini-pro',
      systemPrompt,
      userPrompt,
      temperature = 0.7,
      chatHistory = [],
      conversationId
    } = req.body;

    // Validate required inputs
    if (!userPrompt) {
      return responseHandler.error(res, new Error('User prompt is required'), 400);
    }

    // Create conversation if needed
    let activeConversationId = conversationId;
    if (!conversationId) {
      // Create a new conversation
      activeConversationId = await Conversation.create();
    }

    const response = await AIService.chatWithAI({
      provider,
      model,
      systemPrompt,
      userPrompt,
      temperature,
      chatHistory,
      conversationId: activeConversationId
    });

    return responseHandler.success(res, {
      message: 'AI response generated successfully',
      response,
      conversationId: activeConversationId
    });
  } catch (error) {
    console.error('Chat Error:', error);
    return responseHandler.error(res, error);
  }
};

// Handle specialized response generation
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

    // Create conversation if needed
    if (!context.conversationId) {
      context.conversationId = await Conversation.create();
    }

    const response = await AIService.generateSpecializedResponse(scenario, context);

    return responseHandler.success(res, {
      message: 'Specialized response generated successfully',
      scenario,
      response,
      conversationId: context.conversationId
    });
  } catch (error) {
    console.error('Specialized Response Error:', error);
    return responseHandler.error(res, error);
  }
};

// Get all conversations
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.getAll();
    
    return responseHandler.success(res, {
      message: 'Conversations retrieved successfully',
      conversations
    });
  } catch (error) {
    console.error('Get Conversations Error:', error);
    return responseHandler.error(res, error);
  }
};

// Get messages for a specific conversation
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return responseHandler.error(res, new Error('Conversation ID is required'), 400);
    }
    
    const messages = await Message.getByConversation(conversationId);
    
    return responseHandler.success(res, {
      message: 'Messages retrieved successfully',
      messages
    });
  } catch (error) {
    console.error('Get Messages Error:', error);
    return responseHandler.error(res, error);
  }
};

// Get all scenario templates
export const getScenarioTemplates = async (req, res) => {
  try {
    const templates = await ScenarioTemplate.getAll();
    
    return responseHandler.success(res, {
      message: 'Scenario templates retrieved successfully',
      templates
    });
  } catch (error) {
    console.error('Get Scenario Templates Error:', error);
    return responseHandler.error(res, error);
  }
};

export default {
  chat,
  generateSpecializedResponse,
  getConversations,
  getConversationMessages,
  getScenarioTemplates
};
