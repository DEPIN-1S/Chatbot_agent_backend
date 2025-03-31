
import { db } from '../db/db.js';

export const Conversation = {
  // Create a new conversation
  create: async (title = 'New Conversation') => {
    try {
      const [result] = await db.execute(
        'INSERT INTO conversations (title) VALUES (?)',
        [title]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },
  
  // Get conversation by ID
  findById: async (id) => {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM conversations WHERE id = ?',
        [id]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding conversation:', error);
      throw error;
    }
  },
  
  // Get all conversations with latest message
  getAll: async () => {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, 
         (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
         FROM conversations c
         ORDER BY c.updated_at DESC`
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  },
  
  // Update conversation title
  updateTitle: async (id, title) => {
    try {
      const [result] = await db.execute(
        'UPDATE conversations SET title = ? WHERE id = ?',
        [title, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  },
  
  // Delete conversation
  delete: async (id) => {
    try {
      const [result] = await db.execute(
        'DELETE FROM conversations WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
};

export default Conversation;