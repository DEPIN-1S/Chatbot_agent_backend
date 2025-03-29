import express from 'express';
import { chat,generateSpecializedResponse, } from '../controller/chatController.js';


const router = express.Router();

// General AI Chat Endpoint
router.post(
  '/chat',chat);

// Specialized Response Generation Endpoint
router.post(
  '/generate',generateSpecializedResponse);



export default router;