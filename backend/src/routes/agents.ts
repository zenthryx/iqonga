import express from 'express';
import { PersonalityAgent } from '../services/PersonalityAgent';
import { SolanaService } from '../services/SolanaService';
import { generateAgentAvatar } from '../services/ImageGeneration';
import { uploadToIPFS } from '../services/IPFSStorage';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Create new AI agent
router.post('/create', authenticateUser, async (req, res) => {
  try {
    const {
      name,
      personalityType,
      voiceTone,
      humorStyle,
      intelligenceLevel,
      controversyComfort,
      targetTopics,
      avoidTopics,
      platforms,
      behavioralGuidelines
    } = req.body;

    // Validate required fields
    if (!name || !personalityType || !voiceTone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique avatar
    const avatarUrl = await generateAgentAvatar({
      personalityType,
      voiceTone,
      specialization: targetTopics[0] || 'general'
    });

    // Create agent configuration
    const agentConfig = {
      name,
      personalityType,
      voiceTone,
      humorStyle,
      intelligenceLevel,
      controversyComfort,
      targetTopics,
      avoidTopics,
      platforms,
      behavioralGuidelines
    };

    // Create metadata for NFT
    const metadata = {
      name: name,
      description: `AI Agent with ${personalityType} personality, specialized in ${targetTopics.join(', ')}`,
      image: avatarUrl,
      external_url: `${process.env.FRONTEND_URL}/agents`,
      attributes: [
        { trait_type: "Personality Type", value: personalityType },
        { trait_type: "Voice Tone", value: voiceTone },
        { trait_type: "Humor Style", value: humorStyle },
        { trait_type: "Intelligence Level", value: intelligenceLevel },
        { trait_type: "Controversy Comfort", value: controversyComfort },
        { trait_type: "Platforms", value: platforms.join(", ") },
        { trait_type: "Evolution Stage", value: "Novice" },
        { trait_type: "Total Posts", value: 0, display_type: "number" },
        { trait_type: "Engagement Rate", value: 0, display_type: "boost_percentage" }
      ],
      properties: {
        category: "AI Agent",
        creators: [
          {
            address: process.env.CREATOR_WALLET_ADDRESS,
            share: 5
          }
        ]
      }
    };

    // Upload metadata to IPFS
    const metadataUri = await uploadToIPFS(metadata);

    // Save agent to database (without NFT mint address initially)
    const result = await req.db.query(`
      INSERT INTO ai_agents 
      (user_id, name, personality_type, voice_tone, humor_style, intelligence_level, 
       controversy_comfort, platforms, target_topics, avoid_topics, behavioral_guidelines)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      req.user.id, name, personalityType, voiceTone, humorStyle, intelligenceLevel,
      controversyComfort, platforms, targetTopics, avoidTopics, behavioralGuidelines
    ]);

    const agentId = result.rows[0].id;

    res.json({
      success: true,
      agentId,
      metadataUri,
      avatarUrl
    });

  } catch (error) {
    console.error('Agent creation failed:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Finalize agent creation after NFT minting
router.post('/finalize', authenticateUser, async (req, res) => {
  try {
    const { agentId, mintAddress, transaction } = req.body;

    // Update agent with NFT information
    await req.db.query(`
      UPDATE ai_agents 
      SET nft_mint_address = $1, is_active = true 
      WHERE id = $2 AND user_id = $3
    `, [mintAddress, agentId, req.user.id]);

    // Create initial NFT metadata record
    await req.db.query(`
      INSERT INTO nft_metadata 
      (mint_address, agent_id, owner_address, creator_royalty, is_mutable)
      VALUES ($1, $2, $3, 500, true)
    `, [mintAddress, agentId, req.user.walletAddress]);

    res.json({ success: true });

  } catch (error) {
    console.error('Agent finalization failed:', error);
    res.status(500).json({ error: 'Failed to finalize agent' });
  }
});

// Get user's agents
router.get('/my-agents', authenticateUser, async (req, res) => {
  try {
    const agents = await req.db.query(`
      SELECT a.*, nm.owner_address, nm.traits, nm.rarity_score
      FROM ai_agents a
      LEFT JOIN nft_metadata nm ON a.nft_mint_address = nm.mint_address
      WHERE a.user_id = $1 AND a.is_active = true
      ORDER BY a.created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      agents: agents.rows
    });

  } catch (error) {
    console.error('Failed to fetch agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get agent details
router.get('/:agentId', authenticateUser, async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await req.db.query(`
      SELECT a.*, nm.owner_address, nm.traits, nm.rarity_score,
             COUNT(gc.id) as total_content,
             AVG(gc.engagement_rate) as avg_engagement
      FROM ai_agents a
      LEFT JOIN nft_metadata nm ON a.nft_mint_address = nm.mint_address
      LEFT JOIN generated_content gc ON a.id = gc.agent_id
      WHERE a.id = $1 AND (a.user_id = $2 OR nm.owner_address = $3)
      GROUP BY a.id, nm.owner_address, nm.traits, nm.rarity_score
    `, [agentId, req.user.id, req.user.walletAddress]);

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get recent content
    const recentContent = await req.db.query(`
      SELECT content_text, platform, published_at, likes_count, retweets_count, engagement_rate
      FROM generated_content
      WHERE agent_id = $1 AND status = 'published'
      ORDER BY published_at DESC
      LIMIT 10
    `, [agentId]);

    res.json({
      success: true,
      agent: agent.rows[0],
      recentContent: recentContent.rows
    });

  } catch (error) {
    console.error('Failed to fetch agent details:', error);
    res.status(500).json({ error: 'Failed to fetch agent details' });
  }
});

// Generate content with agent
router.post('/:agentId/generate', authenticateUser, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { type = 'original_post', platform = 'twitter', context } = req.body;

    // Get agent configuration
    const agent = await req.db.query(`
      SELECT * FROM ai_agents 
      WHERE id = $1 AND (user_id = $2 OR nft_mint_address IN (
        SELECT mint_address FROM nft_metadata WHERE owner_address = $3
      ))
    `, [agentId, req.user.id, req.user.walletAddress]);

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found or not owned' });
    }

    // Initialize personality agent
    const personalityAgent = new PersonalityAgent(agent.rows[0]);

    // Generate content
    const content = await personalityAgent.generateContent({
      type,
      platform,
      ...context
    });

    // Save as draft
    const result = await req.db.query(`
      INSERT INTO generated_content 
      (agent_id, platform, content_type, content_text, ai_model_used, generation_prompt, status)
      VALUES ($1, $2, $3, $4, 'gpt-4', $5, 'draft')
      RETURNING id
    `, [agentId, platform, type, content, context?.prompt || 'Generated by AI agent']);

    res.json({
      success: true,
      contentId: result.rows[0].id,
      content
    });

  } catch (error) {
    console.error('Content generation failed:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Schedule content for publishing
router.post('/:agentId/schedule', authenticateUser, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { contentId, scheduledFor, autoPost = false } = req.body;

    // Verify ownership
    const content = await req.db.query(`
      SELECT gc.*, a.user_id, nm.owner_address
      FROM generated_content gc
      JOIN ai_agents a ON gc.agent_id = a.id
      LEFT JOIN nft_metadata nm ON a.nft_mint_address = nm.mint_address
      WHERE gc.id = $1 AND gc.agent_id = $2
    `, [contentId, agentId]);

    if (content.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const contentRow = content.rows[0];
    if (contentRow.user_id !== req.user.id && contentRow.owner_address !== req.user.walletAddress) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update content with schedule
    await req.db.query(`
      UPDATE generated_content 
      SET scheduled_for = $1, status = $2
      WHERE id = $3
    `, [scheduledFor, autoPost ? 'scheduled' : 'draft', contentId]);

    res.json({ success: true });

  } catch (error) {
    console.error('Content scheduling failed:', error);
    res.status(500).json({ error: 'Failed to schedule content' });
  }
});

export default router; 