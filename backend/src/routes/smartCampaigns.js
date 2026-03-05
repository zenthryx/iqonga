const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const SmartCampaignService = require('../services/SmartCampaignService');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/connection');
const PDFDocument = require('pdfkit');

const creditService = new CreditService();

// GET /api/smart-campaigns/objectives - Get available campaign objectives
router.get('/objectives', authenticateToken, (req, res) => {
  try {
    const objectives = SmartCampaignService.getCampaignObjectives();
    res.json({ success: true, data: objectives });
  } catch (error) {
    logger.error('Failed to get campaign objectives:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/types - Get available campaign types
router.get('/types', authenticateToken, (req, res) => {
  try {
    const types = SmartCampaignService.getCampaignTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    logger.error('Failed to get campaign types:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/smart-campaigns/generate - Generate a new smart campaign
router.post('/generate', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      agentId,
      productId,
      campaignName,
      campaignDescription,
      campaignObjective = 'awareness',
      campaignType = 'multi_platform',
      targetPlatforms = ['facebook', 'instagram'],
      targetAudience,
      brandVoice,
      startDate,
      duration, // in days
      postFrequency, // posts per day
      budget,
      customInstructions,
      // Media type options
      imagesOnly = false,
      includeVideo = true,
      includeUGC = true,
      // Use existing ads option
      useExistingAds = false,
      existingAdIds = []
    } = req.body;

    // Validate required fields
    if (!campaignName) {
      return res.status(400).json({
        error: 'Campaign name is required'
      });
    }

    // Calculate credit cost
    // Base cost for campaign strategy + content calendar generation
    const BASE_CAMPAIGN_COST = 100; // Strategy + calendar generation
    
    // Get objective details
    const objectives = SmartCampaignService.getCampaignObjectives();
    const objective = objectives.find(obj => obj.id === campaignObjective) || objectives.find(obj => obj.id === 'awareness') || objectives[0];
    const campaignDuration = duration || (objective?.defaultDuration || 14);
    const frequency = postFrequency || (objective?.recommendedFrequency || 2);
    const totalPosts = campaignDuration * frequency;
    
    // Cost per ad generation (using Smart Ad pricing)
    const AD_BASE_COST = 250; // Base cost per ad (1 platform, 2 variants)
    const PER_PLATFORM = 150;
    const platformCount = (targetPlatforms || ['facebook', 'instagram']).length;
    
    // Estimate: Each post generates 1 ad, but ads may be shared across platforms
    // Conservative estimate: 1 ad per post
    const estimatedAdCount = totalPosts;
    const costPerAd = AD_BASE_COST + (platformCount > 1 ? (platformCount - 1) * PER_PLATFORM : 0);
    
    const totalCreditCost = BASE_CAMPAIGN_COST + (estimatedAdCount * costPerAd);

    logger.info(`Campaign generation cost estimate: ${totalCreditCost} credits (${estimatedAdCount} ads × ${costPerAd} + ${BASE_CAMPAIGN_COST} base)`);

    // Check and deduct credits
    const campaignId = uuidv4();
    try {
      await creditService.deductCredits(userId, 'smart_campaign_generation', totalCreditCost, campaignId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: totalCreditCost
      });
    }

    logger.info(`Starting Smart Campaign generation for user ${userId}, estimated cost: ${totalCreditCost} credits`);

    // Create initial campaign record with 'processing' status for polling
    try {
      await database.query(`
        INSERT INTO ad_campaigns (
          id, user_id, name, description, campaign_type, objective,
          target_platforms, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET status = 'processing', updated_at = NOW()
      `, [
        campaignId,
        userId,
        campaignName,
        campaignDescription || null,
        campaignType,
        campaignObjective,
        JSON.stringify(targetPlatforms || ['facebook', 'instagram'])
      ]);
    } catch (dbError) {
      logger.error('Failed to create campaign record:', dbError);
      // Continue anyway - campaign generation will create/update it
    }

    // Generate the campaign (async - will continue in background)
    
    // Start campaign generation in background
    SmartCampaignService.generateCampaign({
      campaignId, // Pass the campaignId to the service
      userId,
      agentId,
      productId,
      campaignName,
      campaignDescription,
      campaignObjective,
      campaignType,
      targetPlatforms: targetPlatforms || ['facebook', 'instagram'],
      targetAudience,
      brandVoice,
      startDate: startDate ? new Date(startDate) : new Date(),
      duration: campaignDuration,
      postFrequency: frequency,
      budget,
      customInstructions,
      imagesOnly,
      includeVideo,
      includeUGC,
      useExistingAds,
      existingAdIds
    }).then(result => {
      // Update campaign status to completed using saveCampaign to ensure all fields are updated
      SmartCampaignService.saveCampaign({
        campaignId: result.campaignId,
        userId,
        campaignName: result.campaignName,
        campaignDescription: campaignDescription || null,
        campaignType: result.campaignType,
        campaignObjective: result.campaignObjective,
        targetPlatforms: result.platforms,
        targetAudience: targetAudience || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: new Date(Date.now() + (duration || 14) * 24 * 60 * 60 * 1000),
        scheduleConfig: {
          duration: duration || 14,
          frequency: postFrequency || 2,
          totalPosts: result.totalPosts || 0
        },
        adIds: result.adIds || [],
        contentCalendar: result.contentCalendar || [],
        strategy: result.strategy || {},
        status: 'completed'
      }).catch(dbError => {
        logger.error('Failed to update campaign status:', dbError);
        // Fallback to direct update if saveCampaign fails
        database.query(`
          UPDATE ad_campaigns 
          SET status = 'completed', strategy = $1, content_calendar = $2, updated_at = NOW()
          WHERE id = $3
        `, [
          JSON.stringify(result.strategy),
          JSON.stringify(result.contentCalendar),
          campaignId
        ]).catch(fallbackError => {
          logger.error('Failed to update campaign status (fallback):', fallbackError);
        });
      });
    }).catch(error => {
      logger.error(`Campaign ${campaignId} generation failed:`, error);
      // Update campaign status to failed in database
      database.query(`
        UPDATE ad_campaigns 
        SET status = 'failed', error_message = $1 
        WHERE id = $2
      `, [error.message, campaignId]).catch(dbError => {
        logger.error('Failed to update campaign status:', dbError);
      });
    });

    // Return immediately with campaign ID for polling
    res.json({
      success: true,
      data: {
        campaignId,
        status: 'processing',
        message: 'Campaign generation started. Use polling endpoint to check status.'
      },
      creditsUsed: totalCreditCost
    });

  } catch (error) {
    logger.error('Smart Campaign generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate campaign',
      details: error.message
    });
  }
});

// GET /api/smart-campaigns - Get user's campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, status } = req.query;

    const campaigns = await SmartCampaignService.getUserCampaigns(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    });

    res.json({
      success: true,
      data: campaigns
    });

  } catch (error) {
    logger.error('Failed to get campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/:id/status - Get campaign status (for polling)
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get just the status from database for efficient polling
    const result = await database.query(`
      SELECT id, status, error_message, updated_at
      FROM ad_campaigns
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    const campaign = result.rows[0];
    res.json({
      success: true,
      data: {
        campaignId: campaign.id,
        status: campaign.status,
        errorMessage: campaign.error_message,
        updatedAt: campaign.updated_at
      }
    });

  } catch (error) {
    logger.error('Failed to get campaign status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/:id/calendar.csv - Export content calendar as CSV
router.get('/:id/calendar.csv', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await database.query(`
      SELECT content_calendar
      FROM ad_campaigns
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let calendar = result.rows[0].content_calendar || [];
    if (typeof calendar === 'string') {
      try { calendar = JSON.parse(calendar); } catch { calendar = []; }
    }

    const rows = [
      ['Day', 'Scheduled Time', 'Platforms', 'Ad Type', 'Visual Style', 'Format', 'Call To Action', 'Guidance/Promo']
    ];

    calendar.forEach(entry => {
      rows.push([
        entry.day ?? '',
        entry.scheduledTime || entry.scheduled_time || '',
        (entry.platforms || []).join(', '),
        entry.adType || '',
        entry.visualStyle || '',
        entry.format || '',
        entry.callToAction || '',
        entry.promotionalDetails || entry.contentGuidance || ''
      ]);
    });

    const csv = rows.map(r => r.map(v => {
      const val = v === null || v === undefined ? '' : String(v);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-calendar.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Failed to export campaign calendar CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/:id/calendar.pdf - Export content calendar as PDF
router.get('/:id/calendar.pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await database.query(`
      SELECT content_calendar, name
      FROM ad_campaigns
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let calendar = result.rows[0].content_calendar || [];
    if (typeof calendar === 'string') {
      try { calendar = JSON.parse(calendar); } catch { calendar = []; }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-calendar.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(16).text(`Campaign Calendar: ${result.rows[0].name || id}`, { underline: true });
    doc.moveDown();

    calendar.forEach((entry, idx) => {
      doc.fontSize(11).text(`Day ${entry.day ?? ''} • ${entry.scheduledTime || entry.scheduled_time || ''}`);
      doc.fontSize(10).fillColor('#555').text(`Platforms: ${(entry.platforms || []).join(', ')}`);
      doc.fontSize(10).fillColor('#555').text(`Ad Type: ${entry.adType || ''} | Visual Style: ${entry.visualStyle || ''} | Format: ${entry.format || ''}`);
      doc.fontSize(10).fillColor('#333').text(`CTA: ${entry.callToAction || ''}`);
      if (entry.promotionalDetails || entry.contentGuidance) {
        doc.fontSize(10).fillColor('#222').text(`Guidance: ${entry.promotionalDetails || entry.contentGuidance || ''}`);
      }
      doc.moveDown(1);
      if ((idx + 1) % 6 === 0) doc.addPage();
    });

    doc.end();
  } catch (error) {
    logger.error('Failed to export campaign calendar PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/:id - Get single campaign by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await SmartCampaignService.getCampaignById(id, userId);

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });

  } catch (error) {
    logger.error('Failed to get campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/:id/performance - Get campaign performance
router.get('/:id/performance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const performance = await SmartCampaignService.getCampaignPerformance(id, userId);

    res.json({
      success: true,
      data: performance
    });

  } catch (error) {
    logger.error('Failed to get campaign performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/smart-campaigns/:id/schedule - Schedule all campaign posts
router.post('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify campaign ownership
    const campaign = await SmartCampaignService.getCampaignById(id, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Schedule all posts
    const scheduledCount = await SmartCampaignService.scheduleCampaignPosts(id, userId);

    // Update campaign status
    await SmartCampaignService.updateCampaignStatus(id, userId, 'scheduled');

    res.json({
      success: true,
      message: `Scheduled ${scheduledCount} campaign posts`,
      data: { scheduledCount }
    });

  } catch (error) {
    logger.error('Failed to schedule campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/smart-campaigns/:id/status - Update campaign status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    await SmartCampaignService.updateCampaignStatus(id, userId, status);

    res.json({
      success: true,
      message: `Campaign status updated to ${status}`
    });

  } catch (error) {
    logger.error('Failed to update campaign status:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/smart-campaigns/:id - Delete campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const campaign = await SmartCampaignService.getCampaignById(id, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Delete campaign (cascade will delete posts)
    await database.query(`
      DELETE FROM ad_campaigns WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/:id/calendar.csv - Export campaign calendar as CSV
router.get('/:id/calendar.csv', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await SmartCampaignService.getCampaignById(id, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const contentCalendar = campaign.content_calendar || [];
    
    // Generate CSV
    const csvHeader = 'Date,Time,Platform,Format,Ad Type,Call to Action,Content Guidance\n';
    const csvRows = contentCalendar.map(entry => {
      const date = new Date(entry.scheduledTime);
      const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const platforms = Array.isArray(entry.platforms) ? entry.platforms.join('; ') : entry.platforms || '';
      const contentGuidance = (entry.contentGuidance || '').replace(/"/g, '""'); // Escape quotes
      
      return `"${dateStr}","${timeStr}","${platforms}","${entry.format || 'feed'}","${entry.adType || ''}","${entry.callToAction || ''}","${contentGuidance}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id.slice(0, 8)}-calendar.csv"`);
    res.send(csv);

  } catch (error) {
    logger.error('Failed to export calendar CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/smart-campaigns/:id/calendar.pdf - Export campaign calendar as PDF
router.get('/:id/calendar.pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await SmartCampaignService.getCampaignById(id, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id.slice(0, 8)}-calendar.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text(campaign.name || 'Campaign Calendar', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Duration: ${campaign.duration || 'N/A'} days | Platforms: ${(campaign.platforms || []).join(', ')}`, { align: 'center' });
    doc.moveDown(2);

    const contentCalendar = campaign.content_calendar || [];
    
    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Date', 50, doc.y);
    doc.text('Time', 150, doc.y);
    doc.text('Platform', 220, doc.y);
    doc.text('Ad Type', 320, doc.y);
    doc.text('CTA', 420, doc.y);
    doc.moveDown();
    
    let yPos = doc.y;
    doc.font('Helvetica').fontSize(9);
    
    // Table rows
    contentCalendar.forEach((entry, index) => {
      if (yPos > 700) { // New page if needed
        doc.addPage();
        yPos = 50;
      }
      
      const date = new Date(entry.scheduledTime);
      const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const platforms = Array.isArray(entry.platforms) ? entry.platforms.join(', ') : entry.platforms || '';
      
      doc.text(dateStr, 50, yPos);
      doc.text(timeStr, 150, yPos);
      doc.text(platforms.substring(0, 15), 220, yPos);
      doc.text((entry.adType || '').substring(0, 15), 320, yPos);
      doc.text((entry.callToAction || '').substring(0, 15), 420, yPos);
      
      yPos += 20;
    });

    doc.end();

  } catch (error) {
    logger.error('Failed to export calendar PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

