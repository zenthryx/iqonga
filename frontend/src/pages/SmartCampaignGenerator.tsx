import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  SparklesIcon,
  CalendarIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface CampaignObjective {
  id: string;
  name: string;
  description: string;
  defaultDuration: number;
  recommendedFrequency: number;
}

interface CampaignType {
  id: string;
  name: string;
}

interface GeneratedCampaign {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  campaignObjective: string;
  platforms: string[];
  duration: number;
  totalAds: number;
  totalPosts: number;
  contentCalendar: any[];
  strategy: any;
  adIds: string[];
  posts: any[];
  metadata: {
    generatedAt: string;
    startDate: string;
    endDate: string;
  };
}

interface CampaignHistoryItem {
  id: string;
  name: string;
  description: string;
  campaign_type: string;
  objective: string;
  target_platforms: string[];
  status: string;
  start_date: string;
  end_date: string;
  total_impressions: number;
  total_clicks: number;
  created_at: string;
}

const SmartCampaignGenerator: React.FC = () => {
  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('awareness');
  const [campaignType, setCampaignType] = useState('multi_platform');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [targetAudience, setTargetAudience] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState(14);
  const [postFrequency, setPostFrequency] = useState(2);
  const [customInstructions, setCustomInstructions] = useState('');
  
  // Media type options
  const [imagesOnly, setImagesOnly] = useState(false);
  const [includeVideo, setIncludeVideo] = useState(true);
  const [includeUGC, setIncludeUGC] = useState(true);
  
  // Use existing ads option
  const [useExistingAds, setUseExistingAds] = useState(false);
  const [existingAdIds, setExistingAdIds] = useState<string[]>([]);
  const [availableAds, setAvailableAds] = useState<any[]>([]);

  // UI state
  const [objectives, setObjectives] = useState<CampaignObjective[]>([]);
  const [types, setTypes] = useState<CampaignType[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [campaignHistory, setCampaignHistory] = useState<CampaignHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [pollingCampaignId, setPollingCampaignId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const pollingBackoffRef = useRef<number>(15000); // Start with 15 seconds
  const consecutiveErrorsRef = useRef<number>(0);

  // Safely extract platforms from ad record (stringified JSON or array)
  const getAdPlatforms = (ad: any): string[] => {
    const p = ad?.platforms;
    if (Array.isArray(p)) return p;
    if (typeof p === 'string') {
      try {
        const parsed = JSON.parse(p);
        if (Array.isArray(parsed)) return parsed;
        if (parsed) return [String(parsed)];
      } catch {
        return [p];
      }
    }
    return [];
  };

  // Platform icons mapping
  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📷',
    twitter: '🐦',
    tiktok: '🎵',
    linkedin: '💼',
    youtube: '📺',
    google: '🔍'
  };

  useEffect(() => {
    loadObjectives();
    loadTypes();
    loadCampaignHistory();
  }, []);

  useEffect(() => {
    // Load available ads when useExistingAds is enabled
    if (useExistingAds) {
      loadAvailableAds();
    }
  }, [useExistingAds]);

  useEffect(() => {
    // Cleanup polling interval on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  useEffect(() => {
    calculateEstimatedCost();
  }, [campaignObjective, targetPlatforms, duration, postFrequency]);

  const loadObjectives = async () => {
    try {
      const response = await apiService.get('/smart-campaigns/objectives');
      if (response.success) {
        setObjectives(response.data);
        if (response.data.length > 0 && !campaignObjective) {
          setCampaignObjective(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load objectives:', error);
    }
  };

  const loadTypes = async () => {
    try {
      const response = await apiService.get('/smart-campaigns/types');
      if (response.success) {
        setTypes(response.data);
      }
    } catch (error) {
      console.error('Failed to load types:', error);
    }
  };

  const loadCampaignHistory = async () => {
    try {
      const response = await apiService.get('/smart-campaigns?limit=10');
      if (response.success) {
        setCampaignHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load campaign history:', error);
    }
  };

  const loadAvailableAds = async () => {
    try {
      const response = await apiService.get('/smart-ads/history?limit=50');
      if (response.success) {
        setAvailableAds(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load available ads:', error);
    }
  };

  const calculateEstimatedCost = () => {
    const BASE_CAMPAIGN_COST = 100;
    const AD_BASE_COST = 250;
    const PER_PLATFORM = 150;
    
    const selectedObjective = objectives.find(obj => obj.id === campaignObjective);
    const campaignDuration = duration || (selectedObjective?.defaultDuration || 14);
    const frequency = postFrequency || (selectedObjective?.recommendedFrequency || 2);
    const totalPosts = campaignDuration * frequency;
    const platformCount = targetPlatforms.length;
    
    const costPerAd = AD_BASE_COST + (platformCount > 1 ? (platformCount - 1) * PER_PLATFORM : 0);
    const totalCost = BASE_CAMPAIGN_COST + (totalPosts * costPerAd);
    
    setEstimatedCost(totalCost);
  };

  const handlePlatformToggle = (platform: string) => {
    setTargetPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const pollCampaignStatus = async (campaignId: string) => {
    try {
      // Use the status endpoint for efficient polling
      const response = await apiService.get(`/smart-campaigns/${campaignId}/status`);
      if (response.success && response.data) {
        const statusData = response.data;
        
        // Reset error count on successful request
        consecutiveErrorsRef.current = 0;
        pollingBackoffRef.current = 15000; // Reset to base interval
        
        if (statusData.status === 'completed') {
          // Campaign completed - fetch full campaign data
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setPollingCampaignId(null);
          setGenerating(false);
          pollingBackoffRef.current = 15000;
          consecutiveErrorsRef.current = 0;
          
          // Fetch full campaign details
          try {
            const fullResponse = await apiService.get(`/smart-campaigns/${campaignId}`);
            if (fullResponse.success && fullResponse.data) {
              console.log('Campaign data received:', fullResponse.data);
              setGeneratedCampaign(fullResponse.data);
              toast.success('Campaign generated successfully!');
            } else {
              console.error('Failed to fetch campaign data:', fullResponse);
              toast.error('Campaign completed but failed to load details. Please refresh.');
            }
          } catch (fetchError: any) {
            console.error('Error fetching campaign details:', fetchError);
            toast.error('Campaign completed but failed to load details. Please refresh.');
          }
          
          loadCampaignHistory();
        } else if (statusData.status === 'failed') {
          // Campaign failed
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setPollingCampaignId(null);
          setGenerating(false);
          pollingBackoffRef.current = 15000;
          consecutiveErrorsRef.current = 0;
          toast.error(`Campaign generation failed: ${statusData.errorMessage || 'Unknown error'}`);
        }
        // If status is 'processing', continue polling
      }
    } catch (error: any) {
      console.error('Error polling campaign status:', error);
      
      // Handle rate limiting (429 errors)
      if (error.response?.status === 429 || error.message?.includes('Too many requests')) {
        const newErrorCount = consecutiveErrorsRef.current + 1;
        consecutiveErrorsRef.current = newErrorCount;
        
        // Exponential backoff: 15s, 30s, 60s, 120s, max 300s (5 minutes)
        const newBackoff = Math.min(15000 * Math.pow(2, newErrorCount - 1), 300000);
        pollingBackoffRef.current = newBackoff;
        
        // Stop polling if we get too many consecutive rate limit errors (10+)
        if (newErrorCount >= 10) {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setPollingCampaignId(null);
          setGenerating(false);
          toast.error('Too many rate limit errors. Please refresh the page to check campaign status manually.');
          return;
        }
        
        // Restart polling with new backoff interval
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        const newInterval = setInterval(() => {
          pollCampaignStatus(campaignId);
        }, newBackoff);
        setPollingInterval(newInterval);
        
        console.log(`Rate limited. Backing off to ${newBackoff / 1000}s interval.`);
      } else {
        // For other errors, continue polling but reset error count after a few successful requests
        // (handled in the success path above)
      }
    }
  };

  const handleGenerate = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    if (targetPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    if (useExistingAds && existingAdIds.length === 0) {
      toast.error('Please select at least one existing ad to use');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiService.post('/smart-campaigns/generate', {
        campaignName: campaignName.trim(),
        campaignDescription: campaignDescription.trim(),
        campaignObjective,
        campaignType,
        targetPlatforms,
        targetAudience: targetAudience.trim() || undefined,
        brandVoice: brandVoice.trim() || undefined,
        startDate: startDate || undefined,
        duration,
        postFrequency,
        customInstructions: customInstructions.trim() || undefined,
        imagesOnly,
        includeVideo: !imagesOnly && includeVideo,
        includeUGC: !imagesOnly && includeVideo && includeUGC,
        useExistingAds,
        existingAdIds: useExistingAds ? existingAdIds : []
      }, {
        timeout: 30000 // 30 seconds - should return quickly with campaignId
      });

      if (response.success) {
        const campaignId = response.data.campaignId;
        if (campaignId) {
          // Start polling
          setPollingCampaignId(campaignId);
          pollingBackoffRef.current = 15000; // Start with 15 seconds
          consecutiveErrorsRef.current = 0;
          toast.success('Campaign generation started. This may take several minutes...');
          
          // Poll every 15 seconds (respects rate limit of 100 requests per 900 seconds)
          const interval = setInterval(() => {
            pollCampaignStatus(campaignId);
          }, pollingBackoffRef.current);
          setPollingInterval(interval);
          
          // Initial poll after 2 seconds
          setTimeout(() => {
            pollCampaignStatus(campaignId);
          }, 2000);
        } else {
          // Legacy response format (synchronous)
          setGeneratedCampaign(response.data);
          const creditsUsed = (response as any).creditsUsed || 0;
          toast.success(`Campaign generated successfully! Used ${creditsUsed} credits`);
          loadCampaignHistory();
          setGenerating(false);
        }
      } else {
        throw new Error(response.error || 'Failed to generate campaign');
      }
    } catch (error: any) {
      console.error('Campaign generation error:', error);
      toast.error(error.message || 'Failed to generate campaign. Please try again.');
      setGenerating(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setPollingCampaignId(null);
    }
  };

  const handleViewCampaign = async (campaignId: string) => {
    try {
      const response = await apiService.get(`/smart-campaigns/${campaignId}`);
      if (response.success) {
        setViewingCampaign(response.data);
      } else {
        toast.error('Failed to load campaign details');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load campaign details');
    }
  };

  const handleScheduleCampaign = async (campaignId: string) => {
    try {
      const response = await apiService.post(`/smart-campaigns/${campaignId}/schedule`);
      if (response.success) {
        toast.success('Campaign posts scheduled successfully!');
        loadCampaignHistory();
        if (viewingCampaign) {
          await handleViewCampaign(campaignId);
        }
      } else {
        throw new Error(response.error || 'Failed to schedule campaign');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await apiService.delete(`/smart-campaigns/${campaignId}`);
      if (response.success) {
        toast.success('Campaign deleted successfully');
        loadCampaignHistory();
        if (viewingCampaign?.id === campaignId) {
          setViewingCampaign(null);
        }
        if (generatedCampaign?.campaignId === campaignId) {
          setGeneratedCampaign(null);
        }
      } else {
        throw new Error(response.error || 'Failed to delete campaign');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete campaign');
    }
  };

  const selectedObjective = objectives.find(obj => obj.id === campaignObjective);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RocketLaunchIcon className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Smart Campaign Generator</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Create AI-powered multi-platform campaigns with automated content calendars and scheduling
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Information */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <ClipboardDocumentIcon className="h-6 w-6 text-purple-400" />
                Campaign Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Summer Product Launch 2025"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    placeholder="Describe your campaign goals and key messages..."
                    rows={3}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Campaign Objective & Type */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Campaign Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Campaign Objective *
                  </label>
                  <select
                    value={campaignObjective}
                    onChange={(e) => {
                      setCampaignObjective(e.target.value);
                      const obj = objectives.find(o => o.id === e.target.value);
                      if (obj) {
                        setDuration(obj.defaultDuration);
                        setPostFrequency(obj.recommendedFrequency);
                      }
                    }}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {objectives.map((obj) => (
                      <option key={obj.id} value={obj.id}>
                        {obj.name} - {obj.description}
                      </option>
                    ))}
                  </select>
                  {selectedObjective && (
                    <p className="text-xs text-gray-500 mt-1">
                      Default: {selectedObjective.defaultDuration} days, {selectedObjective.recommendedFrequency} posts/day
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Campaign Type
                  </label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Target Platforms */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Target Platforms</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'youtube', 'google'].map((platform) => (
                  <button
                    key={platform}
                    onClick={() => handlePlatformToggle(platform)}
                    className={`p-4 rounded-xl font-medium transition-all ${
                      targetPlatforms.includes(platform)
                        ? 'bg-purple-600 text-white border-2 border-purple-400'
                        : 'bg-slate-700/50 text-gray-300 border-2 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl mb-1">{platformIcons[platform] || '📱'}</div>
                    <div className="text-sm capitalize">{platform}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-semibold text-white">Advanced Options</span>
                {showAdvanced ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {showAdvanced && (
                <div className="p-6 pt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Target Audience
                      </label>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g., Tech-savvy professionals, 25-45"
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Brand Voice
                      </label>
                      <input
                        type="text"
                        value={brandVoice}
                        onChange={(e) => setBrandVoice(e.target.value)}
                        placeholder="e.g., Professional, friendly, innovative"
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 14)}
                        min={1}
                        max={90}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Posts per Day
                      </label>
                      <input
                        type="number"
                        value={postFrequency}
                        onChange={(e) => setPostFrequency(parseInt(e.target.value) || 2)}
                        min={1}
                        max={10}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Custom Instructions
                    </label>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Any specific requirements or guidelines for the campaign..."
                      rows={3}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  {/* Media Type Selection */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Media Type Options</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={imagesOnly}
                          onChange={(e) => {
                            setImagesOnly(e.target.checked);
                            if (e.target.checked) {
                              setIncludeVideo(false);
                              setIncludeUGC(false);
                            }
                          }}
                          className="w-5 h-5 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Images Only (No videos or UGC)</span>
                      </label>
                      
                      {!imagesOnly && (
                        <>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeVideo}
                              onChange={(e) => {
                                setIncludeVideo(e.target.checked);
                                if (!e.target.checked) {
                                  setIncludeUGC(false);
                                }
                              }}
                              className="w-5 h-5 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-gray-300">Include Videos</span>
                          </label>
                          
                          {includeVideo && (
                            <label className="flex items-center gap-3 cursor-pointer ml-8">
                              <input
                                type="checkbox"
                                checked={includeUGC}
                                onChange={(e) => setIncludeUGC(e.target.checked)}
                                className="w-5 h-5 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                              />
                              <span className="text-gray-300">Include UGC Videos</span>
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Use Existing Ads Option */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Use Existing Ads</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useExistingAds}
                          onChange={async (e) => {
                            setUseExistingAds(e.target.checked);
                            if (e.target.checked) {
                              await loadAvailableAds();
                            } else {
                              setExistingAdIds([]);
                            }
                          }}
                          className="w-5 h-5 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Use pre-created ads instead of generating new ones</span>
                      </label>
                      
                      {useExistingAds && (
                        <div className="ml-8 space-y-2">
                          <p className="text-sm text-gray-400">Select ads to reuse in this campaign:</p>
                          <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-600 rounded-lg p-3 bg-slate-700/30">
                            {availableAds.length === 0 ? (
                              <p className="text-sm text-gray-500">No ads available. Please create some ads first.</p>
                            ) : (
                              availableAds.map((ad: any) => (
                                <label key={ad.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={existingAdIds.includes(ad.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setExistingAdIds([...existingAdIds, ad.id]);
                                      } else {
                                        setExistingAdIds(existingAdIds.filter(id => id !== ad.id));
                                      }
                                    }}
                                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-sm text-gray-300">
                                    {ad.ad_type || 'Ad'} - {getAdPlatforms(ad).join(', ') || 'N/A'}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                          {existingAdIds.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {existingAdIds.length} ad{existingAdIds.length !== 1 ? 's' : ''} selected. They will be cycled through the campaign.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-white">Estimated Cost</span>
                <span className="text-2xl font-bold text-white">{estimatedCost} credits</span>
              </div>
              
              <div className="text-xs text-white/70 mb-4 space-y-1">
                <div className="flex justify-between">
                  <span>Campaign Strategy & Calendar</span>
                  <span>100</span>
                </div>
                <div className="flex justify-between">
                  <span>{duration} days × {postFrequency} posts/day = {duration * postFrequency} ads</span>
                  <span>+{duration * postFrequency * (250 + (targetPlatforms.length > 1 ? (targetPlatforms.length - 1) * 150 : 0))}</span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !campaignName.trim() || targetPlatforms.length === 0 || (useExistingAds && existingAdIds.length === 0)}
                className="w-full py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {generating ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    {pollingCampaignId ? 'Generating Campaign...' : 'Starting Campaign Generation...'}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Generate Smart Campaign
                  </>
                )}
              </button>

              {pollingCampaignId && (
                <p className="text-xs text-white/90 mt-4 text-center animate-pulse">
                  🔄 Campaign generation in progress. This may take several minutes...
                </p>
              )}

              {!pollingCampaignId && (
                <p className="text-xs text-white/70 mt-4 text-center">
                  ⏱️ Estimated time: {duration * postFrequency > 20 ? '15-30 minutes' : '5-15 minutes'}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Preview & History */}
          <div className="space-y-6">
            {/* Campaign Preview */}
            {generatedCampaign && (
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Generated Campaign</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Campaign Name</p>
                    <p className="text-white font-medium">{generatedCampaign.campaignName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Duration</p>
                    <p className="text-white">{generatedCampaign.duration} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Posts</p>
                    <p className="text-white">{generatedCampaign.totalPosts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Platforms</p>
                    <p className="text-white">{generatedCampaign.platforms.join(', ')}</p>
                  </div>
                  <button
                    onClick={() => handleViewCampaign(generatedCampaign.campaignId)}
                    className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <EyeIcon className="h-5 w-5" />
                    View Campaign Details
                  </button>
                </div>
              </div>
            )}

            {/* Campaign History */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-semibold text-white">Recent Campaigns ({campaignHistory.length})</span>
                {showHistory ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {showHistory && (
                <div className="p-6 pt-0">
                  {campaignHistory.length > 0 ? (
                    <div className="space-y-3">
                      {campaignHistory.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-white mb-1">{campaign.name}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span className="capitalize">{campaign.objective}</span>
                              <span>•</span>
                              <span>{campaign.status}</span>
                              <span>•</span>
                              <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewCampaign(campaign.id)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                              title="View Campaign"
                            >
                              <EyeIcon className="h-5 w-5 text-gray-400 hover:text-white" />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                              title="Delete Campaign"
                            >
                              <TrashIcon className="h-5 w-5 text-gray-400 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No campaigns yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Campaign Modal */}
      {viewingCampaign && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{viewingCampaign.name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {viewingCampaign.objective} • {viewingCampaign.status} • Created {new Date(viewingCampaign.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setViewingCampaign(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campaign Info */}
                <div>
                  <h4 className="font-semibold text-white mb-3">Campaign Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white">{viewingCampaign.campaign_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Platforms:</span>
                      <span className="text-white">{(viewingCampaign.target_platforms || []).join(', ')}</span>
                    </div>
                    {viewingCampaign.start_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Start Date:</span>
                        <span className="text-white">{new Date(viewingCampaign.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {viewingCampaign.end_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">End Date:</span>
                        <span className="text-white">{new Date(viewingCampaign.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h4 className="font-semibold text-white mb-3">Performance</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Impressions</p>
                      <p className="text-xl font-bold text-white">{viewingCampaign.total_impressions || 0}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Clicks</p>
                      <p className="text-xl font-bold text-white">{viewingCampaign.total_clicks || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Content Calendar */}
                {viewingCampaign.content_calendar && viewingCampaign.content_calendar.length > 0 && (
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">Content Calendar ({viewingCampaign.content_calendar.length} posts)</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/smart-campaigns/${viewingCampaign.id}/calendar.csv`, {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
                                }
                              });
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `campaign-${viewingCampaign.id.slice(0, 8)}-calendar.csv`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                                toast.success('Calendar exported as CSV!');
                              } else {
                                throw new Error('Failed to export CSV');
                              }
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to export calendar');
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg text-blue-300 transition-colors flex items-center gap-1"
                        >
                          <ArrowDownTrayIcon className="h-3 w-3" />
                          CSV
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/smart-campaigns/${viewingCampaign.id}/calendar.pdf`, {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
                                }
                              });
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `campaign-${viewingCampaign.id.slice(0, 8)}-calendar.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                                toast.success('Calendar exported as PDF!');
                              } else {
                                throw new Error('Failed to export PDF');
                              }
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to export calendar');
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-lg text-red-300 transition-colors flex items-center gap-1"
                        >
                          <ArrowDownTrayIcon className="h-3 w-3" />
                          PDF
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {viewingCampaign.content_calendar.map((entry: any, idx: number) => {
                          const date = new Date(entry.scheduledTime);
                          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                          const platforms = Array.isArray(entry.platforms) ? entry.platforms : (entry.platforms ? [entry.platforms] : []);
                          
                          return (
                            <div key={idx} className="flex items-start gap-3 p-2 hover:bg-slate-600/30 rounded-lg transition-colors">
                              <div className="flex-shrink-0 w-20 text-xs text-gray-400">
                                <div>{dateStr}</div>
                                <div className="text-gray-500">{timeStr}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-white">
                                    Day {entry.day}, Post {entry.postIndex + 1}
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <div className="flex items-center gap-1">
                                    {platforms.map((p: string) => (
                                      <span key={p} className="text-xs">{platformIcons[p] || '📱'}</span>
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-purple-400 capitalize">{entry.adType || 'N/A'}</span>
                                </div>
                                {entry.callToAction && (
                                  <div className="text-xs text-gray-300 mb-1">CTA: {entry.callToAction}</div>
                                )}
                                {entry.contentGuidance && (
                                  <div className="text-xs text-gray-400 line-clamp-2">{entry.contentGuidance}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Campaign Posts */}
                {viewingCampaign.posts && viewingCampaign.posts.length > 0 && (
                  <div className="lg:col-span-2">
                    <h4 className="font-semibold text-white mb-3">Campaign Posts ({viewingCampaign.posts.length})</h4>
                    <div className="bg-slate-700/30 rounded-xl p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {viewingCampaign.posts.slice(0, 10).map((post: any) => (
                          <div key={post.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-300">{platformIcons[post.platform] || '📱'} {post.platform}</span>
                              <span className="text-gray-500">{post.format}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                post.status === 'posted' ? 'bg-green-600/20 text-green-400' :
                                post.status === 'scheduled' ? 'bg-blue-600/20 text-blue-400' :
                                'bg-gray-600/20 text-gray-400'
                              }`}>
                                {post.status}
                              </span>
                            </div>
                            {post.scheduled_time && (
                              <span className="text-gray-500 text-xs">
                                {new Date(post.scheduled_time).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                        {viewingCampaign.posts.length > 10 && (
                          <p className="text-xs text-gray-500 mt-2">
                            +{viewingCampaign.posts.length - 10} more posts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-700 flex justify-between">
              {viewingCampaign.status === 'draft' && (
                <button
                  onClick={() => handleScheduleCampaign(viewingCampaign.id)}
                  className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 rounded-lg text-green-300 font-medium transition-colors flex items-center gap-2"
                >
                  <PlayIcon className="h-4 w-4" />
                  Schedule Campaign
                </button>
              )}
              {viewingCampaign.status === 'scheduled' && (
                <button
                  onClick={() => {
                    // Pause campaign functionality can be added
                    toast('Pause functionality coming soon', { icon: 'ℹ️' });
                  }}
                  className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/50 rounded-lg text-yellow-300 font-medium transition-colors flex items-center gap-2"
                >
                  <PauseIcon className="h-4 w-4" />
                  Pause Campaign
                </button>
              )}
              <button
                onClick={() => setViewingCampaign(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCampaignGenerator;

