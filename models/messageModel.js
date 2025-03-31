
import { db } from '../db/db.js';

export const Message = {
  // Add a new message to a conversation
  create: async (conversationId, content, isUser = true) => {
    try {
      // Update the conversation's last updated time
      await db.execute(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );
      
      const [result] = await db.execute(
        'INSERT INTO messages (conversation_id, content, is_user) VALUES (?, ?, ?)',
        [conversationId, content, isUser]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },
  
  // Get messages for a conversation
  getByConversation: async (conversationId) => {
    try {
      const [rows] = await db.execute(
        `SELECT m.*, 
         (SELECT JSON_OBJECT(
           'provider', provider,
           'model', model,
           'temperature', temperature,
           'response_time_ms', response_time_ms
         ) FROM ai_responses WHERE message_id = m.id) as ai_metadata
         FROM messages m
         WHERE m.conversation_id = ?
         ORDER BY m.created_at ASC`,
        [conversationId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  },
  
  // Delete a message
  delete: async (id) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM messages WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
};

export default Message;