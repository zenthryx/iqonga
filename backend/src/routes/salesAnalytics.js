const express = require('express');
const router = express.Router();
const SalesReportingService = require('../services/SalesReportingService');
const { authenticateToken } = require('../middleware/auth');

// GET /api/sales-analytics/dashboard - Get dashboard metrics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const metrics = await SalesReportingService.getDashboardMetrics(userId, dateRange);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      message: error.message
    });
  }
});

// GET /api/sales-analytics/revenue-chart - Get revenue over time
router.get('/revenue-chart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const data = await SalesReportingService.getRevenueOverTime(userId, dateRange, groupBy);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue chart',
      message: error.message
    });
  }
});

// GET /api/sales-analytics/lead-sources - Get lead source attribution
router.get('/lead-sources', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const data = await SalesReportingService.getLeadSourceAttribution(userId, dateRange);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get lead sources error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead sources',
      message: error.message
    });
  }
});

// GET /api/sales-analytics/conversion-funnel - Get conversion funnel
router.get('/conversion-funnel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const data = await SalesReportingService.getConversionFunnel(userId, dateRange);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get conversion funnel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversion funnel',
      message: error.message
    });
  }
});

// GET /api/sales-analytics/sales-velocity - Get sales velocity
router.get('/sales-velocity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const data = await SalesReportingService.getSalesVelocity(userId, dateRange);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get sales velocity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales velocity',
      message: error.message
    });
  }
});

// GET /api/sales-analytics/win-loss - Get win/loss analysis
router.get('/win-loss', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const data = await SalesReportingService.getWinLossAnalysis(userId, dateRange);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get win/loss analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch win/loss analysis',
      message: error.message
    });
  }
});

// GET /api/sales-analytics/export/csv - Export data to CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reportType, startDate, endDate } = req.query;

    if (!reportType || !['leads', 'deals', 'activities'].includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type. Must be: leads, deals, or activities'
      });
    }

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const csv = await SalesReportingService.exportToCSV(userId, reportType, dateRange);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}_${Date.now()}.csv"`);
    
    res.send(csv);
  } catch (error) {
    console.error('Export to CSV error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export to CSV',
      message: error.message
    });
  }
});

module.exports = router;

