import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppCampaignRecipient } from '../../../types/whatsapp';

const CampaignRecipients: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: campaignData } = useQuery({
    queryKey: ['whatsapp-campaign', id],
    queryFn: () => whatsappApi.getCampaign(id!),
    enabled: !!id,
  });

  const { data: recipientsData, isLoading } = useQuery({
    queryKey: ['whatsapp-campaign-recipients', id, statusFilter],
    queryFn: () => whatsappApi.getCampaignRecipients(id!, { status: statusFilter || undefined, limit: 1000 }),
    enabled: !!id,
  });

  const campaign = (campaignData as any)?.data?.campaign;
  const recipients: WhatsAppCampaignRecipient[] = (recipientsData as any)?.data?.recipients || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="w-4 h-4 text-blue-400" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'read':
        return <CheckCircle className="w-4 h-4 text-purple-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-600/20 text-blue-400';
      case 'delivered':
        return 'bg-green-600/20 text-green-400';
      case 'read':
        return 'bg-purple-600/20 text-purple-400';
      case 'failed':
        return 'bg-red-600/20 text-red-400';
      default:
        return 'bg-yellow-600/20 text-yellow-400';
    }
  };

  const filteredRecipients = recipients.filter((recipient) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        recipient.phone_number.toLowerCase().includes(searchLower) ||
        (recipient.contact_name && recipient.contact_name.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const statusCounts = recipients.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!campaign) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/whatsapp/campaigns/${id}/analytics`)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Campaign Recipients</h1>
          <p className="text-gray-400 text-sm mt-1">{campaign.name}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{recipients.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{statusCounts.pending || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Sent</p>
          <p className="text-2xl font-bold text-blue-400">{statusCounts.sent || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Delivered</p>
          <p className="text-2xl font-bold text-green-400">{statusCounts.delivered || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-400">{statusCounts.failed || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search recipients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="read">Read</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Recipients List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading recipients...</p>
        </div>
      ) : filteredRecipients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No recipients found</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Contact</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Phone</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Status</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Sent At</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Delivered At</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Read At</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRecipients.map((recipient) => (
                  <tr key={recipient.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">
                        {recipient.contact_name || 'Unknown'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300">{recipient.phone_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(recipient.status)}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(recipient.status)}`}
                        >
                          {recipient.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-sm">
                        {recipient.sent_at
                          ? new Date(recipient.sent_at).toLocaleString()
                          : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-sm">
                        {recipient.delivered_at
                          ? new Date(recipient.delivered_at).toLocaleString()
                          : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-sm">
                        {recipient.read_at ? new Date(recipient.read_at).toLocaleString() : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {recipient.error_message ? (
                        <p className="text-red-400 text-sm" title={recipient.error_message}>
                          {recipient.error_message.substring(0, 50)}
                          {recipient.error_message.length > 50 ? '...' : ''}
                        </p>
                      ) : (
                        <p className="text-gray-500 text-sm">-</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/whatsapp/campaigns/${id}/analytics`)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Back to Analytics
        </button>
      </div>
    </div>
  );
};

export default CampaignRecipients;
