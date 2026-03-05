import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Play, Pause, CheckCircle, Clock, XCircle } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppCampaign } from '../../../types/whatsapp';

const CampaignList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<any>({
    queryKey: ['whatsapp-campaigns', search, statusFilter],
    queryFn: () => whatsappApi.getCampaigns({
      search,
      status: statusFilter || undefined,
      limit: 50,
    }),
  });

  const campaigns = (data as any)?.data || [];
  const total = (data as any)?.total || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'running':
        return (
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Play className="w-3 h-3" />
            Running
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        );
      case 'paused':
        return (
          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Pause className="w-3 h-3" />
            Paused
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Campaigns</h1>
        <Link
          to="/whatsapp/campaigns/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <div className="text-gray-400 mb-4">No campaigns found</div>
          <Link
            to="/whatsapp/campaigns/new"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: WhatsAppCampaign) => (
            <div
              key={campaign.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <div className="text-gray-400 text-sm space-y-1">
                    <div>
                      Template: {campaign.template_name} | 
                      Recipients: {campaign.total_recipients || 0} | 
                      Sent: {campaign.sent_count || 0} | 
                      Delivered: {campaign.delivered_count || 0}
                    </div>
                    {campaign.scheduled_at && (
                      <div>
                        Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                      </div>
                    )}
                    <div>
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    to={`/whatsapp/campaigns/${campaign.id}`}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    View
                  </Link>
                  {campaign.status === 'draft' && (
                    <Link
                      to={`/whatsapp/campaigns/${campaign.id}/edit`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="text-center text-gray-400">
          Showing {campaigns.length} of {total} campaigns
        </div>
      )}
    </div>
  );
};

export default CampaignList;
