import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Send, CheckCircle, Eye, XCircle, Clock } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { CampaignStats } from '../../../types/whatsapp';

const CampaignAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaignData } = useQuery({
    queryKey: ['whatsapp-campaign', id],
    queryFn: () => whatsappApi.getCampaign(id!),
    enabled: !!id,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['whatsapp-campaign-stats', id],
    queryFn: () => whatsappApi.getCampaignStats(id!),
    enabled: !!id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const campaign = (campaignData as any)?.data?.campaign;
  const stats: CampaignStats = (statsData as any)?.data?.stats;

  if (!campaign) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Campaign not found</p>
      </div>
    );
  }

  const deliveryRate = stats?.deliveryRate || '0%';
  const readRate = stats?.readRate || '0%';
  const failureRate = stats?.failureRate || '0%';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/whatsapp/campaigns')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">{campaign.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {campaign.type === 'broadcast' ? 'Broadcast Campaign' : 'Targeted Campaign'}
          </p>
        </div>
      </div>

      {statsLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading statistics...</p>
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Recipients</p>
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.total || 0}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Sent</p>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.sent || 0}</p>
              <p className="text-sm text-gray-400 mt-1">
                {stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Delivered</p>
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.delivered || 0}</p>
              <p className="text-sm text-gray-400 mt-1">Delivery Rate: {deliveryRate}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Read</p>
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.read || 0}</p>
              <p className="text-sm text-gray-400 mt-1">Read Rate: {readRate}</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Pending</p>
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.pending || 0}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Failed</p>
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.failed || 0}</p>
              <p className="text-sm text-gray-400 mt-1">Failure Rate: {failureRate}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Engagement</p>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {stats.delivered > 0 ? ((stats.read / stats.delivered) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-gray-400 mt-1">Read/Delivered ratio</p>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Campaign Progress</h3>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Sent</span>
                <span className="text-white">
                  {stats.sent} / {stats.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.sent / stats.total) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Delivered</span>
                <span className="text-white">
                  {stats.delivered} / {stats.sent || 1}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Read</span>
                <span className="text-white">
                  {stats.read} / {stats.delivered || 1}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.delivered > 0 ? (stats.read / stats.delivered) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Campaign Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Status</p>
                <p className="text-white font-medium capitalize">{campaign.status}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Template</p>
                <p className="text-white font-medium">{campaign.template_name || 'N/A'}</p>
              </div>
              {campaign.scheduled_at && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Scheduled At</p>
                  <p className="text-white font-medium">
                    {new Date(campaign.scheduled_at).toLocaleString()}
                  </p>
                </div>
              )}
              {campaign.started_at && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Started At</p>
                  <p className="text-white font-medium">
                    {new Date(campaign.started_at).toLocaleString()}
                  </p>
                </div>
              )}
              {campaign.completed_at && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Completed At</p>
                  <p className="text-white font-medium">
                    {new Date(campaign.completed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/whatsapp/campaigns/${id}/recipients`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              View Recipients
            </button>
            <button
              onClick={() => navigate('/whatsapp/campaigns')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Campaigns
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400">No statistics available</p>
        </div>
      )}
    </div>
  );
};

export default CampaignAnalytics;
