import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { KeywordMonitor } from '../../services/keywordIntelligenceService';
import AlertRulesConfig, { AlertRule } from './AlertRulesConfig';

interface CreateMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<KeywordMonitor>) => void;
  initialData?: KeywordMonitor;
}

const CreateMonitorModal: React.FC<CreateMonitorModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<KeywordMonitor>>({
    keyword: '',
    monitor_type: 'keyword',
    platform: 'twitter',
    sentiment_threshold: 5.0,
    mention_spike_threshold: 10,
    track_influencers: true,
    monitoring_frequency: '15min',
    auto_post_enabled: false,
    content_style: 'professional',
  });
  const [influencerHandles, setInfluencerHandles] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [tags, setTags] = useState('');
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        keyword: initialData.keyword || '',
        monitor_type: initialData.monitor_type || 'keyword',
        platform: initialData.platform || 'twitter',
        sentiment_threshold: initialData.sentiment_threshold || 5.0,
        mention_spike_threshold: initialData.mention_spike_threshold || 10,
        track_influencers: initialData.track_influencers ?? true,
        monitoring_frequency: initialData.monitoring_frequency || '15min',
        auto_post_enabled: initialData.auto_post_enabled || false,
        content_style: initialData.content_style || 'professional',
      });
      setInfluencerHandles(initialData.influencer_handles?.join(', ') || '');
      setExcludeKeywords(initialData.exclude_keywords?.join(', ') || '');
      setTags(initialData.tags?.join(', ') || '');
    } else {
      // Reset form for new monitor
      setFormData({
        keyword: '',
        monitor_type: 'keyword',
        platform: 'twitter',
        sentiment_threshold: 5.0,
        mention_spike_threshold: 10,
        track_influencers: true,
        monitoring_frequency: '15min',
        auto_post_enabled: false,
        content_style: 'professional',
      });
      setInfluencerHandles('');
      setExcludeKeywords('');
      setTags('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keyword) {
      alert('Keyword is required');
      return;
    }

    onSubmit({
      ...formData,
      influencer_handles: influencerHandles
        ? influencerHandles.split(',').map(h => h.trim()).filter(Boolean)
        : [],
      exclude_keywords: excludeKeywords
        ? excludeKeywords.split(',').map(k => k.trim()).filter(Boolean)
        : [],
      tags: tags
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : [],
      notes: alertRules && alertRules.length > 0 
        ? JSON.stringify({ alert_rules: alertRules })
        : undefined, // Store alert rules in notes as JSON
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Monitor' : 'Create New Monitor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Keyword/Hashtag */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Keyword or Hashtag *
            </label>
            <input
              type="text"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., AI, #artificialintelligence"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type
            </label>
            <select
              value={formData.monitor_type}
              onChange={(e) => setFormData({ ...formData, monitor_type: e.target.value as 'keyword' | 'hashtag' })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="keyword">Keyword</option>
              <option value="hashtag">Hashtag</option>
            </select>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Platform
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="twitter">Twitter/X</option>
              <option value="all">All Platforms</option>
            </select>
          </div>

          {/* Monitoring Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Monitoring Frequency
            </label>
            <select
              value={formData.monitoring_frequency}
              onChange={(e) => setFormData({ ...formData, monitoring_frequency: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="5min">Every 5 minutes</option>
              <option value="15min">Every 15 minutes</option>
              <option value="30min">Every 30 minutes</option>
              <option value="1hour">Every hour</option>
              <option value="6hour">Every 6 hours</option>
              <option value="24hour">Every 24 hours</option>
            </select>
          </div>

          {/* Alert Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sentiment Threshold (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sentiment_threshold}
                onChange={(e) => setFormData({ ...formData, sentiment_threshold: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mention Spike Threshold (%)
              </label>
              <input
                type="number"
                value={formData.mention_spike_threshold}
                onChange={(e) => setFormData({ ...formData, mention_spike_threshold: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Influencer Handles */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Influencer Handles (comma-separated)
            </label>
            <input
              type="text"
              value={influencerHandles}
              onChange={(e) => setInfluencerHandles(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., @elonmusk, @openai"
            />
          </div>

          {/* Exclude Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Exclude Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., spam, fake"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., marketing, tech"
            />
          </div>

          {/* Auto-post */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto-post"
              checked={formData.auto_post_enabled}
              onChange={(e) => setFormData({ ...formData, auto_post_enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto-post" className="ml-2 text-sm text-gray-300">
              Enable auto-posting when alerts trigger
            </label>
          </div>

          {/* Track Influencers */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="track-influencers"
              checked={formData.track_influencers}
              onChange={(e) => setFormData({ ...formData, track_influencers: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="track-influencers" className="ml-2 text-sm text-gray-300">
              Track influencer activity
            </label>
          </div>

          {/* Advanced Alert Rules */}
          <div className="border-t border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left mb-4"
            >
              <span className="text-sm font-medium text-gray-300">Advanced Alert Rules</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {showAdvanced && (
              <div className="bg-gray-700 rounded-lg p-4">
                <AlertRulesConfig
                  rules={alertRules}
                  onChange={setAlertRules}
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {initialData ? 'Update Monitor' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMonitorModal;

