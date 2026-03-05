const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const ChatConversationService = require('../services/ChatConversationService');
const ChatMessageService = require('../services/ChatMessageService');
const FriendService = require('../services/FriendService');
const ChatPrivacyService = require('../services/ChatPrivacyService');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const creditService = new CreditService();
const pricingService = ServicePricingService;
const friendService = new FriendService();

// Configure multer for chat file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/chat');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create chat upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allow images, documents, videos
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ==================== Conversation Management ====================

// Create conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { type, name, description, memberIds, associated_token, is_public, require_approval, max_members } = req.body;

    if (!type || !['direct', 'group'].includes(type)) {
      return res.status(400).json({ error: 'type must be "direct" or "group"' });
    }

    // Validate user ID
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const createdBy = parseInt(req.user.id);
    if (!createdBy || isNaN(createdBy)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Ensure creator is in member list
    const allMembers = [...new Set([createdBy, ...(memberIds || []).map(id => parseInt(id))])];

    if (type === 'direct') {
      // Direct chats must have exactly 2 members (creator + one other person)
      if (allMembers.length !== 2) {
        return res.status(400).json({ 
          error: 'direct conversations require exactly 2 members (you and one other person)' 
        });
      }
    }

    if (type === 'group' && !name) {
      return res.status(400).json({ error: 'group conversations require a name' });
    }

    const conversation = await ChatConversationService.createConversation({
      type,
      name,
      description,
      created_by: createdBy,
      memberIds: allMembers,
      associated_token,
      is_public,
      require_approval,
      max_members
    });

    // Deduct credits for group creation
    if (type === 'group') {
      const cost = await pricingService.getPricing('chat_group_creation');
      if (cost > 0) {
        await creditService.deductCredits(req.user.id, 'chat_group_creation', cost);
      }
    }

    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    logger.error('Error creating conversation:', err);
    res.status(500).json({ error: 'Failed to create conversation', details: err.message });
  }
});

// List user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await ChatConversationService.getUserConversations(req.user.id);
    res.json({ success: true, data: conversations });
  } catch (err) {
    logger.error('Error getting conversations:', err);
    res.status(500).json({ error: 'Failed to get conversations', details: err.message });
  }
});

// Get conversation details
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await ChatConversationService.getConversation(req.params.id, req.user.id);
    res.json({ success: true, data: conversation });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ error: err.message });
    }
    logger.error('Error getting conversation:', err);
    res.status(500).json({ error: 'Failed to get conversation', details: err.message });
  }
});

// Update conversation
router.put('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await ChatConversationService.updateConversation(
      req.params.id,
      req.user.id,
      req.body
    );
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or not authorized' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ error: err.message });
    }
    logger.error('Error updating conversation:', err);
    res.status(500).json({ error: 'Failed to update conversation', details: err.message });
  }
});

// Delete/leave conversation
router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    // For now, just remove user from conversation
    // TODO: Implement actual deletion for owners
    const conversation = await ChatConversationService.getConversation(req.params.id, req.user.id);
    await ChatConversationService.removeMember(req.params.id, req.user.id, req.user.id);
    res.json({ success: true, message: 'Left conversation' });
  } catch (err) {
    logger.error('Error leaving conversation:', err);
    res.status(500).json({ error: 'Failed to leave conversation', details: err.message });
  }
});

// Add member
router.post('/conversations/:id/members', authenticateToken, async (req, res) => {
  try {
    const { user_id, role = 'member' } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const member = await ChatConversationService.addMember(req.params.id, user_id, { role });
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    logger.error('Error adding member:', err);
    res.status(500).json({ error: 'Failed to add member', details: err.message });
  }
});

// Remove member
router.delete('/conversations/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    await ChatConversationService.removeMember(req.params.id, req.params.userId, req.user.id);
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ error: err.message });
    }
    logger.error('Error removing member:', err);
    res.status(500).json({ error: 'Failed to remove member', details: err.message });
  }
});

// Update member role
router.put('/conversations/:id/members/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'role must be owner, admin, or member' });
    }

    const member = await ChatConversationService.updateMemberRole(
      req.params.id,
      req.params.userId,
      role,
      req.user.id
    );
    res.json({ success: true, data: member });
  } catch (err) {
    if (err.message.includes('Not authorized')) {
      return res.status(403).json({ error: err.message });
    }
    logger.error('Error updating member role:', err);
    res.status(500).json({ error: 'Failed to update member role', details: err.message });
  }
});

// ==================== Messaging ====================

// Get messages (paginated)
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, limit = 50, before } = req.query;

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    // Verify membership
    const isMember = await ChatConversationService.isMember(conversation_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized - not a member of this conversation' });
    }

    const messages = await ChatMessageService.getMessages(
      conversation_id,
      parseInt(limit),
      before ? new Date(before) : null
    );

    res.json({ success: true, data: messages });
  } catch (err) {
    logger.error('Error getting messages:', err);
    res.status(500).json({ error: 'Failed to get messages', details: err.message });
  }
});

// Get single message
router.get('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const message = await ChatMessageService.getMessage(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify membership
    const isMember = await ChatConversationService.isMember(message.conversation_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ success: true, data: message });
  } catch (err) {
    logger.error('Error getting message:', err);
    res.status(500).json({ error: 'Failed to get message', details: err.message });
  }
});

// Edit message
router.put('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const message = await ChatMessageService.editMessage(req.params.id, req.user.id, content);
    if (!message) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }

    // Emit socket event
    try {
      const { getChatServerInstance } = require('../websocket/ChatServer');
      const chatServer = getChatServerInstance();
      if (chatServer) {
        chatServer.io.to(`conversation:${message.conversation_id}`).emit('message:updated', message);
      }
    } catch (wsError) {
      logger.warn('Failed to emit message:updated event:', wsError.message);
    }

    res.json({ success: true, data: message });
  } catch (err) {
    logger.error('Error editing message:', err);
    res.status(500).json({ error: 'Failed to edit message', details: err.message });
  }
});

// Delete message
router.delete('/messages/:id', authenticateToken, async (req, res) => {
  try {
    // Get message before deleting to get conversation_id
    const message = await ChatMessageService.getMessage(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const deleted = await ChatMessageService.deleteMessage(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }

    // Emit socket event
    try {
      const { getChatServerInstance } = require('../websocket/ChatServer');
      const chatServer = getChatServerInstance();
      if (chatServer) {
        chatServer.io.to(`conversation:${message.conversation_id}`).emit('message:deleted', {
          message_id: req.params.id,
          conversation_id: message.conversation_id
        });
      }
    } catch (wsError) {
      logger.warn('Failed to emit message:deleted event:', wsError.message);
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    logger.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message', details: err.message });
  }
});

// Add reaction
router.post('/messages/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ error: 'emoji is required' });
    }

    const message = await ChatMessageService.addReaction(req.params.id, req.user.id, emoji);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Emit socket event
    try {
      const { getChatServerInstance } = require('../websocket/ChatServer');
      const chatServer = getChatServerInstance();
      if (chatServer) {
        chatServer.io.to(`conversation:${message.conversation_id}`).emit('message:updated', message);
      }
    } catch (wsError) {
      logger.warn('Failed to emit message:updated event:', wsError.message);
    }

    res.json({ success: true, data: message });
  } catch (err) {
    logger.error('Error adding reaction:', err);
    res.status(500).json({ error: 'Failed to add reaction', details: err.message });
  }
});

// Remove reaction
router.delete('/messages/:id/reactions/:emoji', authenticateToken, async (req, res) => {
  try {
    const message = await ChatMessageService.removeReaction(req.params.id, req.user.id, req.params.emoji);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Emit socket event
    try {
      const { getChatServerInstance } = require('../websocket/ChatServer');
      const chatServer = getChatServerInstance();
      if (chatServer) {
        chatServer.io.to(`conversation:${message.conversation_id}`).emit('message:updated', message);
      }
    } catch (wsError) {
      logger.warn('Failed to emit message:updated event:', wsError.message);
    }

    res.json({ success: true, data: message });
  } catch (err) {
    logger.error('Error removing reaction:', err);
    res.status(500).json({ error: 'Failed to remove reaction', details: err.message });
  }
});

// Mark as read
router.post('/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    await ChatMessageService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Message marked as read' });
  } catch (err) {
    logger.error('Error marking message as read:', err);
    res.status(500).json({ error: 'Failed to mark message as read', details: err.message });
  }
});

// Mark all as read
router.post('/conversations/:id/read-all', authenticateToken, async (req, res) => {
  try {
    await ChatConversationService.markAllAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'All messages marked as read' });
  } catch (err) {
    logger.error('Error marking all as read:', err);
    res.status(500).json({ error: 'Failed to mark all as read', details: err.message });
  }
});

// ==================== Signal Sharing ====================

// Share signal
router.post('/signals/share', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, signal } = req.body;

    if (!conversation_id || !signal) {
      return res.status(400).json({ error: 'conversation_id and signal are required' });
    }

    // Verify membership
    const isMember = await ChatConversationService.isMember(conversation_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const message = await ChatMessageService.createMessage({
      conversation_id,
      sender_id: req.user.id,
      content: `Shared ${signal.token} ${signal.type}`,
      content_type: 'signal',
      is_signal: true,
      signal_data: signal
    });

    res.json({ success: true, data: message });
  } catch (err) {
    logger.error('Error sharing signal:', err);
    res.status(500).json({ error: 'Failed to share signal', details: err.message });
  }
});

// Get signals in conversation
router.get('/signals', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, limit = 50 } = req.query;

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    // Verify membership
    const isMember = await ChatConversationService.isMember(conversation_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const signals = await ChatMessageService.getSignals(conversation_id, parseInt(limit));
    res.json({ success: true, data: signals });
  } catch (err) {
    logger.error('Error getting signals:', err);
    res.status(500).json({ error: 'Failed to get signals', details: err.message });
  }
});

// ==================== Search ====================

// Search messages
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, conversation_id, limit = 20 } = req.query;

    if (!q || !conversation_id) {
      return res.status(400).json({ error: 'q and conversation_id are required' });
    }

    // Verify membership
    const isMember = await ChatConversationService.isMember(conversation_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = await ChatMessageService.searchMessages(conversation_id, q, parseInt(limit));
    res.json({ success: true, data: messages });
  } catch (err) {
    logger.error('Error searching messages:', err);
    res.status(500).json({ error: 'Failed to search messages', details: err.message });
  }
});

// ==================== File Management ====================

// Upload file attachment
router.post('/attachments', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { conversation_id, message_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    // Verify membership
    const isMember = await ChatConversationService.isMember(conversation_id, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Determine file type
    const mimeType = req.file.mimetype;
    let fileType = 'document';
    if (mimeType.startsWith('image/')) fileType = 'image';
    else if (mimeType.startsWith('video/')) fileType = 'video';

    const fileUrl = `/uploads/chat/${path.basename(req.file.path)}`;

    // Save attachment record
    const attachmentId = uuidv4();
    const result = await database.query(`
      INSERT INTO message_attachments (
        id, message_id, file_name, file_type, file_size, mime_type,
        file_path, file_url, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      attachmentId,
      message_id || null,
      req.file.originalname,
      fileType,
      req.file.size,
      mimeType,
      req.file.path,
      fileUrl,
      req.user.id
    ]);

    const attachment = result.rows[0];

    // If message_id provided, update message
    // Otherwise, create a new message with the attachment
    if (message_id) {
      await database.query(`
        UPDATE messages
        SET has_attachments = true,
            attachment_count = (SELECT COUNT(*) FROM message_attachments WHERE message_id = $1)
        WHERE id = $1
      `, [message_id]);
    } else {
      // Create a new message for the file
      const fileName = req.file.originalname;
      
      const createdMessage = await ChatMessageService.createMessage({
        conversation_id,
        sender_id: req.user.id,
        content: `📎 ${fileName}`,
        content_type: 'file',
        has_attachments: true,
        attachment_count: 1
      });

      // Update attachment with message_id
      await database.query(
        'UPDATE message_attachments SET message_id = $1 WHERE id = $2',
        [createdMessage.id, attachmentId]
      );

      // Update message attachment count
      await database.query(`
        UPDATE messages
        SET has_attachments = true,
            attachment_count = 1
        WHERE id = $1
      `, [createdMessage.id]);

      // Get the created message with attachments
      const messageWithAttachments = await ChatMessageService.getMessage(createdMessage.id);
      
      // Emit socket event
      try {
        const { getChatServerInstance } = require('../websocket/ChatServer');
        const chatServer = getChatServerInstance();
        if (chatServer) {
          chatServer.io.to(`conversation:${conversation_id}`).emit('message:new', messageWithAttachments);
        }
      } catch (wsError) {
        logger.warn('Failed to emit message:new event:', wsError.message);
      }

      return res.status(201).json({ success: true, data: { ...attachment, message_id: createdMessage.id } });
    }

    // Deduct credits
    const fileSizeMB = req.file.size / (1024 * 1024);
    const costKey = fileSizeMB < 5 ? 'chat_file_upload_small' : 'chat_file_upload_large';
    const cost = await pricingService.getPricing(costKey);
    if (cost > 0) {
      await creditService.deductCredits(req.user.id, costKey, cost);
    }

    res.status(201).json({ success: true, data: attachment });
  } catch (err) {
    logger.error('Error uploading attachment:', err);
    res.status(500).json({ error: 'Failed to upload attachment', details: err.message });
  }
});

// Get attachment
router.get('/attachments/:id', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(
      'SELECT * FROM message_attachments WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // Verify user has access (member of conversation)
    if (attachment.message_id) {
      const message = await ChatMessageService.getMessage(attachment.message_id);
      if (message) {
        const isMember = await ChatConversationService.isMember(message.conversation_id, req.user.id);
        if (!isMember) {
          return res.status(403).json({ error: 'Not authorized' });
        }
      }
    }

    res.json({ success: true, data: attachment });
  } catch (err) {
    logger.error('Error getting attachment:', err);
    res.status(500).json({ error: 'Failed to get attachment', details: err.message });
  }
});

// Delete attachment
router.delete('/attachments/:id', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(
      'SELECT * FROM message_attachments WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // Verify user uploaded it or is admin of conversation
    if (attachment.uploaded_by !== req.user.id) {
      if (attachment.message_id) {
        const message = await ChatMessageService.getMessage(attachment.message_id);
        if (message) {
          const hasPermission = await ChatConversationService.checkAdminPermission(
            message.conversation_id,
            req.user.id
          );
          if (!hasPermission) {
            return res.status(403).json({ error: 'Not authorized' });
          }
        }
      } else {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    // Delete file from disk
    try {
      await fs.unlink(attachment.file_path);
    } catch (fileError) {
      logger.warn('Failed to delete file from disk:', fileError);
    }

    // Delete from database
    await database.query('DELETE FROM message_attachments WHERE id = $1', [req.params.id]);

    // Update message if exists
    if (attachment.message_id) {
      await database.query(`
        UPDATE messages
        SET attachment_count = (SELECT COUNT(*) FROM message_attachments WHERE message_id = $1)
        WHERE id = $1
      `, [attachment.message_id]);
    }

    res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    logger.error('Error deleting attachment:', err);
    res.status(500).json({ error: 'Failed to delete attachment', details: err.message });
  }
});

// ==================== Invitations ====================

// Create invite
router.post('/invites', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, expires_in_hours = 24 } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    // Verify user is admin/owner
    const hasPermission = await ChatConversationService.checkAdminPermission(conversation_id, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Not authorized - must be owner or admin' });
    }

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(expires_in_hours));

    const inviteId = uuidv4();
    const result = await database.query(`
      INSERT INTO conversation_invites (
        id, conversation_id, invite_code, invited_by, expires_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [inviteId, conversation_id, inviteCode, req.user.id, expiresAt]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Error creating invite:', err);
    res.status(500).json({ error: 'Failed to create invite', details: err.message });
  }
});

// Get invite details
router.get('/invites/:code', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(`
      SELECT 
        ci.*,
        c.name as conversation_name,
        c.type as conversation_type,
        c.description as conversation_description
      FROM conversation_invites ci
      INNER JOIN conversations c ON ci.conversation_id = c.id
      WHERE ci.invite_code = $1
    `, [req.params.code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const invite = result.rows[0];

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite expired' });
    }

    res.json({ success: true, data: invite });
  } catch (err) {
    logger.error('Error getting invite:', err);
    res.status(500).json({ error: 'Failed to get invite', details: err.message });
  }
});

// Accept invite
router.post('/invites/:code/accept', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(`
      SELECT * FROM conversation_invites
      WHERE invite_code = $1 AND status = 'pending'
    `, [req.params.code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found or already used' });
    }

    const invite = result.rows[0];

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      await database.query(`
        UPDATE conversation_invites SET status = 'expired' WHERE id = $1
      `, [invite.id]);
      return res.status(400).json({ error: 'Invite expired' });
    }

    // Check if user is already a member
    const isMember = await ChatConversationService.isMember(invite.conversation_id, req.user.id);
    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this conversation' });
    }

    // Add user to conversation
    await ChatConversationService.addMember(invite.conversation_id, req.user.id);

    // Update invite status
    await database.query(`
      UPDATE conversation_invites
      SET status = 'accepted', responded_at = NOW()
      WHERE id = $1
    `, [invite.id]);

    // Get conversation
    const conversation = await ChatConversationService.getConversation(invite.conversation_id, req.user.id);

    res.json({ success: true, data: conversation });
  } catch (err) {
    logger.error('Error accepting invite:', err);
    res.status(500).json({ error: 'Failed to accept invite', details: err.message });
  }
});

// Decline invite
router.post('/invites/:code/decline', authenticateToken, async (req, res) => {
  try {
    const result = await database.query(`
      UPDATE conversation_invites
      SET status = 'declined', responded_at = NOW()
      WHERE invite_code = $1 AND status = 'pending'
      RETURNING *
    `, [req.params.code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found or already processed' });
    }

    res.json({ success: true, message: 'Invite declined' });
  } catch (err) {
    logger.error('Error declining invite:', err);
    res.status(500).json({ error: 'Failed to decline invite', details: err.message });
  }
});

// ==================== User Search ====================

// Search users to add to conversation
// Privacy: Show users you've chatted with OR exact username/email matches (for starting new conversations)
router.get('/users/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Strategy: 
    // 1. Show users who share conversations with you (people you've chatted with)
    // 2. Show exact username/email matches (allows starting new conversations if you know the exact identifier)
    // This balances privacy with usability
    
    const searchPattern = `%${q}%`;
    const exactMatch = q.trim(); // For exact username/email matching
    
    // Use a subquery to wrap the UNION so we can order by expressions
    // Priority: 1. Friends, 2. Existing contacts, 3. Exact matches
    const result = await database.query(`
      SELECT id, username, email, match_type
      FROM (
        (
          -- Friends (highest priority)
          SELECT DISTINCT u.id, u.username, u.email, 'friend' as match_type
          FROM users u
          INNER JOIN friends f ON u.id = f.friend_id
          WHERE f.user_id = $1
            AND f.is_blocked = false
            AND (u.username ILIKE $2 OR u.email ILIKE $2)
        )
        UNION
        (
          -- Users you've chatted with (partial match)
          SELECT DISTINCT u.id, u.username, u.email, 'existing_contact' as match_type
          FROM users u
          INNER JOIN conversation_members cm1 ON u.id = cm1.user_id
          INNER JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
          WHERE cm2.user_id = $1
            AND u.id != $1
            AND (u.username ILIKE $2 OR u.email ILIKE $2)
            AND NOT EXISTS (
              SELECT 1 FROM friends f 
              WHERE f.user_id = $1 AND f.friend_id = u.id AND f.is_blocked = false
            )
        )
        UNION
        (
          -- Exact username/email matches (for starting new conversations)
          SELECT u.id, u.username, u.email, 'exact_match' as match_type
          FROM users u
          WHERE u.id != $1
            AND (u.username = $3 OR u.email = $3)
            AND NOT EXISTS (
              SELECT 1 FROM friends f 
              WHERE f.user_id = $1 AND f.friend_id = u.id AND f.is_blocked = true
            )
        )
      ) AS combined_results
      ORDER BY 
        CASE match_type 
          WHEN 'friend' THEN 1
          WHEN 'existing_contact' THEN 2 
          WHEN 'exact_match' THEN 3 
        END,
        username
      LIMIT $4
    `, [req.user.id, searchPattern, exactMatch, parseInt(limit)]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('Error searching users:', err);
    res.status(500).json({ error: 'Failed to search users', details: err.message });
  }
});

// ==================== Friend Management ====================

// Get friend list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const { favorites_only } = req.query;
    const friends = await friendService.getFriends(req.user.id, {
      favoritesOnly: favorites_only === 'true'
    });
    res.json({ success: true, data: friends });
  } catch (err) {
    logger.error('Error getting friends:', err);
    res.status(500).json({ error: 'Failed to get friends', details: err.message });
  }
});

// Send friend request
router.post('/friends/request', authenticateToken, async (req, res) => {
  try {
    const { recipient_id, message } = req.body;
    
    if (!recipient_id) {
      return res.status(400).json({ error: 'recipient_id is required' });
    }

    const request = await friendService.sendFriendRequest(req.user.id, recipient_id, message);
    
    // Get requester username for notification
    const requesterResult = await database.query(
      'SELECT username FROM users WHERE id = $1',
      [req.user.id]
    );
    const requesterUsername = requesterResult.rows[0]?.username || 'Someone';

    // Send WebSocket notification to recipient
    try {
      const { getChatServerInstance } = require('../websocket/ChatServer');
      const chatServer = getChatServerInstance();
      if (chatServer) {
        chatServer.sendNotification(recipient_id, {
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${requesterUsername} sent you a friend request`,
          request_id: request.id,
          requester_id: req.user.id,
          requester_username: requesterUsername,
          timestamp: new Date().toISOString()
        });
      }
    } catch (wsError) {
      logger.warn('Failed to send friend request notification:', wsError.message);
    }

    res.json({ success: true, data: request });
  } catch (err) {
    logger.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Failed to send friend request', details: err.message });
  }
});

// Get friend requests (incoming, outgoing, or all)
router.get('/friends/requests', authenticateToken, async (req, res) => {
  try {
    const { type = 'all' } = req.query; // 'incoming', 'outgoing', or 'all'
    const requests = await friendService.getFriendRequests(req.user.id, type);
    res.json({ success: true, data: requests });
  } catch (err) {
    logger.error('Error getting friend requests:', err);
    res.status(500).json({ error: 'Failed to get friend requests', details: err.message });
  }
});

// Accept friend request
router.post('/friends/requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const result = await friendService.acceptFriendRequest(req.params.requestId, req.user.id);
    
    // Get request details to notify requester
    const requestResult = await database.query(
      'SELECT requester_id FROM friend_requests WHERE id = $1',
      [req.params.requestId]
    );
    
    if (requestResult.rows.length > 0) {
      const requesterId = requestResult.rows[0].requester_id;
      const recipientUsername = req.user.username || 'Someone';

      // Send WebSocket notification to requester
      try {
        const { getChatServerInstance } = require('../websocket/ChatServer');
        const chatServer = getChatServerInstance();
        if (chatServer) {
          chatServer.sendNotification(requesterId, {
            type: 'friend_request_accepted',
            title: 'Friend Request Accepted',
            message: `${recipientUsername} accepted your friend request`,
            friend_id: req.user.id,
            friend_username: recipientUsername,
            timestamp: new Date().toISOString()
          });
        }
      } catch (wsError) {
        logger.warn('Failed to send friend acceptance notification:', wsError.message);
      }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Failed to accept friend request', details: err.message });
  }
});

// Decline friend request
router.post('/friends/requests/:requestId/decline', authenticateToken, async (req, res) => {
  try {
    const request = await friendService.declineFriendRequest(req.params.requestId, req.user.id);
    res.json({ success: true, data: request });
  } catch (err) {
    logger.error('Error declining friend request:', err);
    res.status(500).json({ error: 'Failed to decline friend request', details: err.message });
  }
});

// Cancel friend request (by requester)
router.delete('/friends/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const request = await friendService.cancelFriendRequest(req.params.requestId, req.user.id);
    res.json({ success: true, data: request });
  } catch (err) {
    logger.error('Error canceling friend request:', err);
    res.status(500).json({ error: 'Failed to cancel friend request', details: err.message });
  }
});

// Remove friend
router.delete('/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    await friendService.removeFriend(req.user.id, parseInt(req.params.friendId));
    res.json({ success: true, message: 'Friend removed successfully' });
  } catch (err) {
    logger.error('Error removing friend:', err);
    res.status(500).json({ error: 'Failed to remove friend', details: err.message });
  }
});

// Update friend (nickname, notes, favorite status)
router.patch('/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const { nickname, notes, is_favorite } = req.body;
    const updates = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (notes !== undefined) updates.notes = notes;
    if (is_favorite !== undefined) updates.is_favorite = is_favorite;

    const friend = await friendService.updateFriend(req.user.id, parseInt(req.params.friendId), updates);
    res.json({ success: true, data: friend });
  } catch (err) {
    logger.error('Error updating friend:', err);
    res.status(500).json({ error: 'Failed to update friend', details: err.message });
  }
});

// Block user
router.post('/friends/block/:userId', authenticateToken, async (req, res) => {
  try {
    const blocked = await friendService.blockUser(req.user.id, parseInt(req.params.userId));
    res.json({ success: true, data: blocked });
  } catch (err) {
    logger.error('Error blocking user:', err);
    res.status(500).json({ error: 'Failed to block user', details: err.message });
  }
});

// Unblock user
router.post('/friends/unblock/:userId', authenticateToken, async (req, res) => {
  try {
    await friendService.unblockUser(req.user.id, parseInt(req.params.userId));
    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (err) {
    logger.error('Error unblocking user:', err);
    res.status(500).json({ error: 'Failed to unblock user', details: err.message });
  }
});

// Get blocked users
router.get('/friends/blocked', authenticateToken, async (req, res) => {
  try {
    const blocked = await friendService.getBlockedUsers(req.user.id);
    res.json({ success: true, data: blocked });
  } catch (err) {
    logger.error('Error getting blocked users:', err);
    res.status(500).json({ error: 'Failed to get blocked users', details: err.message });
  }
});

// ==================== Privacy Settings ====================

// Get privacy settings
router.get('/privacy', authenticateToken, async (req, res) => {
  try {
    const settings = await ChatPrivacyService.getPrivacySettings(req.user.id);
    res.json({ success: true, data: settings });
  } catch (err) {
    logger.error('Error getting privacy settings:', err);
    res.status(500).json({ error: 'Failed to get privacy settings', details: err.message });
  }
});

// Update privacy settings
router.put('/privacy', authenticateToken, async (req, res) => {
  try {
    const { chat_message_privacy, chat_show_online_status, chat_allow_friend_requests } = req.body;
    
    const settings = await ChatPrivacyService.updatePrivacySettings(req.user.id, {
      chat_message_privacy,
      chat_show_online_status,
      chat_allow_friend_requests
    });
    
    res.json({ success: true, data: settings });
  } catch (err) {
    logger.error('Error updating privacy settings:', err);
    res.status(500).json({ error: 'Failed to update privacy settings', details: err.message });
  }
});

module.exports = router;

