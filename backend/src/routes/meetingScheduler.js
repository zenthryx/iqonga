const express = require('express');
const router = express.Router();
const MeetingSchedulerService = require('../services/MeetingSchedulerService');
const { authenticateToken } = require('../middleware/auth');
const CreditService = require('../services/CreditService');
const ServicePricingService = require('../services/ServicePricingService');
const { v4: uuidv4 } = require('uuid');

// Initialize credit service
const creditService = new CreditService();

// POST /api/meeting-scheduler/schedule - Schedule a meeting
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const meetingData = req.body;

    // Get pricing and deduct credits
    const creditCost = await ServicePricingService.getPricing('sales_meeting_schedule');
    const meetingId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'sales_meeting_schedule', creditCost, meetingId);
    } catch (creditError) {
      return res.status(402).json({
        success: false,
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const meeting = await MeetingSchedulerService.scheduleMeeting(userId, meetingData);

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting scheduled successfully',
      creditsUsed: creditCost
    });
  } catch (error) {
    console.error('Schedule meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule meeting',
      message: error.message
    });
  }
});

// GET /api/meeting-scheduler/lead/:leadId - Get meetings for a lead
router.get('/lead/:leadId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { leadId } = req.params;

    const meetings = await MeetingSchedulerService.getMeetingsForLead(leadId, userId);

    res.json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Get lead meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead meetings',
      message: error.message
    });
  }
});

// GET /api/meeting-scheduler/deal/:dealId - Get meetings for a deal
router.get('/deal/:dealId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dealId } = req.params;

    const meetings = await MeetingSchedulerService.getMeetingsForDeal(dealId, userId);

    res.json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Get deal meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deal meetings',
      message: error.message
    });
  }
});

// GET /api/meeting-scheduler/upcoming - Get upcoming meetings
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const meetings = await MeetingSchedulerService.getUpcomingMeetings(userId, parseInt(days));

    res.json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming meetings',
      message: error.message
    });
  }
});

// DELETE /api/meeting-scheduler/:activityId - Cancel a meeting
router.delete('/:activityId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { activityId } = req.params;

    const activity = await MeetingSchedulerService.cancelMeeting(activityId, userId);

    res.json({
      success: true,
      data: activity,
      message: 'Meeting cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel meeting',
      message: error.message
    });
  }
});

// GET /api/meeting-scheduler/availability - Get user availability
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const availability = await MeetingSchedulerService.getAvailability(userId, startDate, endDate);

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability',
      message: error.message
    });
  }
});

module.exports = router;

