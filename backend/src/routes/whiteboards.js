const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Whiteboard Planning Space Routes
 * Allows users to create and manage planning boards for content ideas
 */

// GET /api/whiteboards - Get user's whiteboards
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await database.query(`
      SELECT 
        id, name, description, canvas_data, created_at, updated_at
      FROM whiteboards
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Failed to get whiteboards:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/whiteboards/:id - Get single whiteboard with elements
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get whiteboard
    const whiteboardResult = await database.query(`
      SELECT * FROM whiteboards
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (whiteboardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    const whiteboard = whiteboardResult.rows[0];

    // Get elements
    const elementsResult = await database.query(`
      SELECT * FROM whiteboard_elements
      WHERE whiteboard_id = $1 AND user_id = $2
      ORDER BY z_index ASC, created_at ASC
    `, [id, userId]);

    res.json({
      success: true,
      data: {
        ...whiteboard,
        elements: elementsResult.rows
      }
    });

  } catch (error) {
    logger.error('Failed to get whiteboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whiteboards - Create new whiteboard
router.post('/', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      canvasData = {}
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Whiteboard name is required' });
    }

    const whiteboardId = uuidv4();

    const result = await database.query(`
      INSERT INTO whiteboards (
        id, user_id, name, description, canvas_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [
      whiteboardId,
      userId,
      name,
      description || null,
      JSON.stringify(canvasData)
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to create whiteboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/whiteboards/:id - Update whiteboard
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name,
      description,
      canvasData
    } = req.body;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM whiteboards WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (canvasData !== undefined) {
      updates.push(`canvas_data = $${paramIndex++}`);
      params.push(JSON.stringify(canvasData));
    }

    updates.push(`updated_at = NOW()`);
    params.push(id, userId);

    const query = `
      UPDATE whiteboards
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await database.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to update whiteboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whiteboards/:id/elements - Add element to whiteboard
router.post('/:id/elements', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: whiteboardId } = req.params;
    const {
      elementType,
      positionX,
      positionY,
      width,
      height,
      content = {},
      style = {},
      zIndex = 0
    } = req.body;

    if (!elementType || positionX === undefined || positionY === undefined) {
      return res.status(400).json({ error: 'Element type and position are required' });
    }

    // Verify whiteboard ownership
    const whiteboard = await database.query(`
      SELECT id FROM whiteboards WHERE id = $1 AND user_id = $2
    `, [whiteboardId, userId]);

    if (whiteboard.rows.length === 0) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    const elementId = uuidv4();

    const result = await database.query(`
      INSERT INTO whiteboard_elements (
        id, whiteboard_id, user_id, element_type, position_x, position_y,
        width, height, content, style, z_index, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      elementId,
      whiteboardId,
      userId,
      elementType,
      positionX,
      positionY,
      width || null,
      height || null,
      JSON.stringify(content),
      JSON.stringify(style),
      zIndex
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to add element to whiteboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/whiteboards/:id/elements/:elementId - Update whiteboard element
router.put('/:id/elements/:elementId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: whiteboardId, elementId } = req.params;
    const {
      positionX,
      positionY,
      width,
      height,
      content,
      style,
      zIndex
    } = req.body;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM whiteboard_elements
      WHERE id = $1 AND whiteboard_id = $2 AND user_id = $3
    `, [elementId, whiteboardId, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (positionX !== undefined) {
      updates.push(`position_x = $${paramIndex++}`);
      params.push(positionX);
    }
    if (positionY !== undefined) {
      updates.push(`position_y = $${paramIndex++}`);
      params.push(positionY);
    }
    if (width !== undefined) {
      updates.push(`width = $${paramIndex++}`);
      params.push(width);
    }
    if (height !== undefined) {
      updates.push(`height = $${paramIndex++}`);
      params.push(height);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(JSON.stringify(content));
    }
    if (style !== undefined) {
      updates.push(`style = $${paramIndex++}`);
      params.push(JSON.stringify(style));
    }
    if (zIndex !== undefined) {
      updates.push(`z_index = $${paramIndex++}`);
      params.push(zIndex);
    }

    updates.push(`updated_at = NOW()`);
    params.push(elementId, whiteboardId, userId);

    const query = `
      UPDATE whiteboard_elements
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND whiteboard_id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await database.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to update whiteboard element:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/whiteboards/:id/elements/:elementId - Delete whiteboard element
router.delete('/:id/elements/:elementId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: whiteboardId, elementId } = req.params;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM whiteboard_elements
      WHERE id = $1 AND whiteboard_id = $2 AND user_id = $3
    `, [elementId, whiteboardId, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    await database.query(`
      DELETE FROM whiteboard_elements
      WHERE id = $1 AND whiteboard_id = $2 AND user_id = $3
    `, [elementId, whiteboardId, userId]);

    res.json({
      success: true,
      message: 'Element deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete whiteboard element:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/whiteboards/:id - Delete whiteboard
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await database.query(`
      SELECT id FROM whiteboards WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Whiteboard not found' });
    }

    // Delete whiteboard (elements will be cascade deleted)
    await database.query(`
      DELETE FROM whiteboards WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Whiteboard deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete whiteboard:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

