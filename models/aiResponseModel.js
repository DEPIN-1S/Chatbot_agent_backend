import { db } from '../db/db.js';

export const AIResponse = {
    // Create a new AI response record
    create: async (messageId, responseData) => {
      try {
        const [result] = await db.execute(
          `INSERT INTO ai_responses 
           (message_id, provider, model, temperature, prompt_tokens, completion_tokens, total_tokens, response_time_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            messageId,
            responseData.provider,
            responseData.model,
            responseData.temperature || 0.7,
            responseData.promptTokens || null,
            responseData.completionTokens || null,
            responseData.totalTokens || null,
            responseData.responseTimeMs || null
          ]
        );
        
        return result.insertId;
      } catch (error) {
        console.error('Error creating AI response record:', error);
        throw error;
      }
    },
    
    // Get AI response by message ID
    getByMessageId: async (messageId) => {
      try {
        const [rows] = await db.execute(
          'SELECT * FROM ai_responses WHERE message_id = ?',
          [messageId]
        );
        
        return rows[0] || null;
      } catch (error) {
        console.error('Error getting AI response:', error);
        throw error;
      }
    },
    
    // Get AI usage statistics
    getStats: async () => {
      try {
        const [rows] = await db.execute(
          `SELECT 
             COUNT(*) as total_queries,
             SUM(ar.total_tokens) as total_tokens,
             COUNT(DISTINCT m.conversation_id) as conversations_count,
             ar.provider,
             ar.model,
             DATE(ar.created_at) as date
           FROM ai_responses ar
           JOIN messages m ON ar.message_id = m.id
           GROUP BY ar.provider, ar.model, DATE(ar.created_at)
           ORDER BY date DESC`
        );
        
        return rows;
      } catch (error) {
        console.error('Error getting AI stats:', error);
        throw error;
      }
    }
  };
  
  export default AIResponse;