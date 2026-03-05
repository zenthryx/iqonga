import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppBotExecution } from '../../../types/whatsapp';

const BotExecutions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: botData } = useQuery({
    queryKey: ['whatsapp-bot', id],
    queryFn: () => whatsappApi.getBot(id!),
    enabled: !!id,
  });

  const { data: executionsData, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-bot-executions', id],
    queryFn: () => whatsappApi.getBotExecutions(id!, { limit: 100 }),
    enabled: !!id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const bot = (botData as any)?.data?.bot;
  const executions: WhatsAppBotExecution[] = (executionsData as any)?.data?.executions || [];

  const getStatusIcon = (status?: string) => {
    if (!status) {
      // If no status, check if response_text exists to determine success
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) {
      return 'bg-green-600/20 text-green-400';
    }
    switch (status) {
      case 'success':
        return 'bg-green-600/20 text-green-400';
      case 'failed':
        return 'bg-red-600/20 text-red-400';
      default:
        return 'bg-yellow-600/20 text-yellow-400';
    }
  };

  const getExecutionStatus = (execution: WhatsAppBotExecution): string => {
    if (execution.status) {
      return execution.status;
    }
    // Infer status from response_text
    if (execution.response_text) {
      return 'success';
    }
    return 'pending';
  };

  const filteredExecutions = executions.filter((execution) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        (execution.contact_phone || execution.phone_number)?.toLowerCase().includes(searchLower) ||
        (execution.trigger_message || execution.message_text)?.toLowerCase().includes(searchLower) ||
        execution.status?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const statusCounts = executions.reduce(
    (acc, e) => {
      const status = getExecutionStatus(e);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!bot) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Bot not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/whatsapp/bots')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Bot Execution Log</h1>
            <p className="text-gray-400 text-sm mt-1">{bot.name}</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total Executions</p>
          <p className="text-2xl font-bold text-white">{executions.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Successful</p>
          <p className="text-2xl font-bold text-green-400">{statusCounts.success || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-400">{statusCounts.failed || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{statusCounts.pending || 0}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search executions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Executions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading executions...</p>
        </div>
      ) : filteredExecutions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No executions found</p>
          <p className="text-gray-500 text-sm mt-2">
            This bot hasn't been triggered yet. Test it to see executions here.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Time</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Contact</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Trigger Message</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Reply Type</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Status</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Response Time</th>
                  <th className="text-left text-white px-6 py-3 text-sm font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredExecutions.map((execution) => (
                  <tr key={execution.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-gray-300 text-sm">
                        {new Date(execution.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">
                        {execution.contact_name || 'Unknown'}
                      </p>
                      <p className="text-gray-400 text-sm">{execution.contact_phone || execution.phone_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300 text-sm max-w-xs truncate">
                        {execution.trigger_message || execution.message_text || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-300 text-sm capitalize">
                        {execution.reply_type?.replace('_', ' ') || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(getExecutionStatus(execution))}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(getExecutionStatus(execution))}`}
                        >
                          {getExecutionStatus(execution)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-400 text-sm">
                        {execution.response_time_ms
                          ? `${execution.response_time_ms}ms`
                          : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {execution.error_message || (getExecutionStatus(execution) === 'failed' && execution.response_text) ? (
                        <p className="text-red-400 text-sm" title={execution.error_message || execution.response_text}>
                          {(execution.error_message || execution.response_text || '').substring(0, 50)}
                          {(execution.error_message || execution.response_text || '').length > 50 ? '...' : ''}
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

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/whatsapp/bots/${id}/test`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Test Bot
        </button>
        <button
          onClick={() => navigate('/whatsapp/bots')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Back to Bots
        </button>
      </div>
    </div>
  );
};

export default BotExecutions;
