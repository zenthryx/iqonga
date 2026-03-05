import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Play, Pause, Trash2, Bot as BotIcon } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppBot } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const BotList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['whatsapp-bots', search, statusFilter],
    queryFn: () => whatsappApi.getBots({
      search,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      limit: 50,
    }),
  });

  const bots = (data as any)?.data || [];
  const total = (data as any)?.total || 0;

  const toggleBotMutation = useMutation({
    mutationFn: ({ botId, isActive }: { botId: string; isActive: boolean }) =>
      whatsappApi.updateBot(botId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-bots'] });
      toast.success('Bot status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update bot');
    },
  });

  const deleteBotMutation = useMutation({
    mutationFn: (botId: string) => whatsappApi.deleteBot(botId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-bots'] });
      toast.success('Bot deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete bot');
    },
  });

  const handleToggleBot = (bot: WhatsAppBot) => {
    toggleBotMutation.mutate({ botId: bot.id, isActive: !bot.is_active });
  };

  const handleDeleteBot = (bot: WhatsAppBot) => {
    if (window.confirm(`Are you sure you want to delete "${bot.name}"?`)) {
      deleteBotMutation.mutate(bot.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Bots</h1>
        <Link
          to="/whatsapp/bots/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Bot
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
                placeholder="Search bots..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Bots List */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading bots...</div>
      ) : bots.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <div className="text-gray-400 mb-4">No bots found</div>
          <Link
            to="/whatsapp/bots/new"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create your first bot
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot: WhatsAppBot) => (
            <div
              key={bot.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${bot.is_active ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                    <BotIcon className={`w-6 h-6 ${bot.is_active ? 'text-green-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{bot.name}</h3>
                    <span
                      className={`text-xs ${
                        bot.is_active ? 'text-green-400' : 'text-gray-400'
                      }`}
                    >
                      {bot.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-gray-400 text-sm space-y-1 mb-4">
                <div>Trigger: {bot.trigger_type}</div>
                <div>Reply Type: {bot.reply_type}</div>
                {bot.execution_count !== undefined && (
                  <div>Executions: {bot.execution_count}</div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleBot(bot)}
                  disabled={toggleBotMutation.isPending}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    bot.is_active
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } disabled:opacity-50`}
                >
                  {bot.is_active ? <Pause className="w-4 h-4 inline mr-1" /> : <Play className="w-4 h-4 inline mr-1" />}
                  {bot.is_active ? 'Pause' : 'Activate'}
                </button>
                <Link
                  to={`/whatsapp/bots/${bot.id}`}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm text-center transition-colors"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDeleteBot(bot)}
                  disabled={deleteBotMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 50 && (
        <div className="text-center text-gray-400">
          Showing {bots.length} of {total} bots
        </div>
      )}
    </div>
  );
};

export default BotList;
