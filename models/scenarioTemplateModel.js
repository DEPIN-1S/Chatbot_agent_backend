import { db } from '../db/db.js';


export const ScenarioTemplate = {
    // Get all scenario templates
    getAll: async () => {
      try {
        const [rows] = await db.execute(
          'SELECT * FROM scenario_templates ORDER BY name ASC'
        );
        
        return rows;
      } catch (error) {
        console.error('Error getting scenario templates:', error);
        throw error;
      }
    },
    
    // Get scenario template by name
    getByName: async (name) => {
      try {
        const [rows] = await db.execute(
          'SELECT * FROM scenario_templates WHERE name = ?',
          [name]
        );
        
        return rows[0] || null;
      } catch (error) {
        console.error('Error getting scenario template:', error);
        throw error;
      }
    },
    
    // Create a new scenario template
    create: async (template) => {
      try {
        const [result] = await db.execute(
          `INSERT INTO scenario_templates 
           (name, system_prompt, default_provider, default_model, temperature) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            template.name,
            template.systemPrompt,
            template.defaultProvider,
            template.defaultModel,
            template.temperature || 0.7
          ]
        );
        
        return result.insertId;
      } catch (error) {
        console.error('Error creating scenario template:', error);
        throw error;
      }
    },
    
    // Update an existing scenario template
    update: async (name, template) => {
      try {
        const [result] = await db.execute(
          `UPDATE scenario_templates 
           SET system_prompt = ?, default_provider = ?, default_model = ?, temperature = ?
           WHERE name = ?`,
          [
            template.systemPrompt,
            template.defaultProvider,
            template.defaultModel,
            template.temperature || 0.7,
            name
          ]
        );
        
        return result.affectedRows > 0;
      } catch (error) {
        console.error('Error updating scenario template:', error);
        throw error;
      }
    },
    
    // Delete a scenario template
    delete: async (name) => {
      try {
        const [result] = await db.execute(
          'DELETE FROM scenario_templates WHERE name = ?',
          [name]
        );
        
        return result.affectedRows > 0;
      } catch (error) {
        console.error('Error deleting scenario template:', error);
        throw error;
      }
    }
  };
  
  export default ScenarioTemplate;