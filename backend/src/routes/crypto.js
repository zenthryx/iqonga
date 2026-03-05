const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const CryptoRepository = require('../services/cryptoRepository');
const CryptoContentGenerator = require('../services/cryptoContentGenerator');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');

const creditService = new CreditService();
const pricingService = require('../services/ServicePricingService');

// Create monitor
router.post('/monitors', authenticateToken, async (req, res) => {
  try {
    const { token_symbol, token_name } = req.body;
    if (!token_symbol) {
      return res.status(400).json({ error: 'token_symbol is required' });
    }

    const monitor = await CryptoRepository.createMonitor(req.user.id, req.body);
    res.status(201).json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create monitor', details: err.message });
  }
});

// List monitors
router.get('/monitors', authenticateToken, async (req, res) => {
  try {
    const monitors = await CryptoRepository.getMonitorsByUser(req.user.id);
    res.json({ success: true, data: monitors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monitors', details: err.message });
  }
});

// Get monitor
router.get('/monitors/:id', authenticateToken, async (req, res) => {
  try {
    const monitor = await CryptoRepository.getMonitorById(req.params.id, req.user.id);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monitor', details: err.message });
  }
});

// Update monitor
router.put('/monitors/:id', authenticateToken, async (req, res) => {
  try {
    const monitor = await CryptoRepository.updateMonitor(req.params.id, req.user.id, req.body);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update monitor', details: err.message });
  }
});

// Activate/deactivate
router.post('/monitors/:id/activate', authenticateToken, async (req, res) => {
  try {
    const monitor = await CryptoRepository.setMonitorActive(req.params.id, req.user.id, true);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to activate monitor', details: err.message });
  }
});

router.post('/monitors/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const monitor = await CryptoRepository.setMonitorActive(req.params.id, req.user.id, false);
    if (!monitor) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, data: monitor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate monitor', details: err.message });
  }
});

// Delete monitor
router.delete('/monitors/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await CryptoRepository.deleteMonitor(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Monitor not found' });
    res.json({ success: true, message: 'Monitor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete monitor', details: err.message });
  }
});

// Latest sentiment for token
router.get('/sentiment/:token', authenticateToken, async (req, res) => {
  try {
    const snapshot = await CryptoRepository.getLatestSnapshotForToken(req.user.id, req.params.token);
    if (!snapshot) return res.status(404).json({ success: false, error: 'No sentiment found' });
    res.json({ success: true, data: snapshot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sentiment', details: err.message });
  }
});

// Sentiment history
router.get('/sentiment/:token/history', authenticateToken, async (req, res) => {
  try {
    // get monitor id first
    const monitors = await CryptoRepository.getMonitorsByUser(req.user.id);
    const monitor = monitors.find(
      (m) => m.token_symbol?.toLowerCase() === req.params.token.toLowerCase(),
    );
    if (!monitor) return res.status(404).json({ error: 'Monitor not found for token' });

    const history = await CryptoRepository.getRecentSnapshots(monitor.id, 50);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sentiment history', details: err.message });
  }
});

// Alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await CryptoRepository.listAlerts(req.user.id, 50);
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
  }
});

router.put('/alerts/:id/read', authenticateToken, async (req, res) => {
  try {
    const alert = await CryptoRepository.markAlertRead(req.user.id, req.params.id);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark alert read', details: err.message });
  }
});

// Usage summary
router.get('/usage/summary', authenticateToken, async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const summary = await CryptoRepository.getUsageSummary(req.user.id, period);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch usage summary', details: err.message });
  }
});

// Content generation
router.post('/content/generate', authenticateToken, async (req, res) => {
  try {
    const { token_symbol, sentiment, style = 'professional' } = req.body;
    if (!token_symbol || !sentiment) {
      return res.status(400).json({ error: 'token_symbol and sentiment are required' });
    }

    const generator = new CryptoContentGenerator();
    const text = await generator.generateTextPost(token_symbol, sentiment, style);

    const cost = await pricingService.getPricing('crypto_content_generation');
    if (cost > 0) {
      await creditService.deductCredits(req.user.id, 'crypto_content_generation', cost);
    }
    await CryptoRepository.insertUsage(req.user.id, {
      operation_type: 'crypto_content_generation',
      credits_deducted: cost,
    });

    res.json({ success: true, data: { content: text } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate content', details: err.message });
  }
});

// Content posting (delegated to scheduler/posting service, but provide route hook)
router.post('/content/post', authenticateToken, async (req, res) => {
  try {
    const { token_symbol, sentiment, channels = [] } = req.body;
    if (!token_symbol || !sentiment) {
      return res.status(400).json({ error: 'token_symbol and sentiment are required' });
    }

    const scheduler = new (require('../services/cryptoMonitoringScheduler'))();
    await scheduler._autoPost(
      {
        user_id: req.user.id,
        token_symbol,
        post_channels: channels,
      },
      sentiment,
    );

    const cost = await pricingService.getPricing('crypto_auto_post');
    if (cost > 0) {
      await creditService.deductCredits(req.user.id, 'crypto_auto_post', cost);
    }
    await CryptoRepository.insertUsage(req.user.id, {
      operation_type: 'crypto_auto_post',
      credits_deducted: cost,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post content', details: err.message });
  }
});

// Manual trigger for testing - process all active monitors for a user
router.post('/monitors/trigger', authenticateToken, async (req, res) => {
  try {
    const scheduler = new (require('../services/cryptoMonitoringScheduler'))();
    const monitors = await CryptoRepository.getMonitorsByUser(req.user.id);
    const activeMonitors = monitors.filter(m => m.is_active);
    
    if (activeMonitors.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No active monitors found',
        processed: 0 
      });
    }

    let processed = 0;
    let errors = [];
    
    for (const monitor of activeMonitors) {
      try {
        await scheduler._processMonitor(monitor);
        processed++;
      } catch (err) {
        errors.push({
          token: monitor.token_symbol,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${processed} of ${activeMonitors.length} monitors`,
      processed,
      total: activeMonitors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger monitoring', details: err.message });
  }
});

module.exports = router;

