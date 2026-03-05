import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, Megaphone, Bot, Plus, Activity } from 'lucide-react';
import { whatsappApi } from '../../services/whatsappApi';
import { WhatsAppAccount } from '../../types/whatsapp';
import toast from 'react-hot-toast';

const WhatsAppDashboard: React.FC = () => {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Fetch accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery<any>({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.getAccounts(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch contacts count
  const { data: contactsData } = useQuery<any>({
    queryKey: ['whatsapp-contacts-count'],
    queryFn: () => whatsappApi.getContacts({ limit: 1 }),
    select: (data: any) => data?.total || 0,
  });

  // Fetch campaigns count
  const { data: campaignsData } = useQuery<any>({
    queryKey: ['whatsapp-campaigns-count'],
    queryFn: () => whatsappApi.getCampaigns({ limit: 1 }),
    select: (data: any) => data?.total || 0,
  });

  // Fetch bots count
  const { data: botsData } = useQuery<any>({
    queryKey: ['whatsapp-bots-count'],
    queryFn: () => whatsappApi.getBots({ limit: 1 }),
    select: (data: any) => data?.total || 0,
  });

  // Calculate message count (would need a messages endpoint or calculate from contacts)
  const messageCount = 1234; // Placeholder - would need actual endpoint

  const stats = [
    {
      label: 'Messages',
      value: messageCount.toLocaleString(),
      change: '+12%',
      icon: MessageSquare,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Contacts',
      value: (contactsData || 0).toLocaleString(),
      change: '+5%',
      icon: Users,
      color: 'green',
      gradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Campaigns',
      value: (campaignsData || 0).toString(),
      change: '3 Active',
      icon: Megaphone,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Bots',
      value: (botsData || 0).toString(),
      change: '5 Active',
      icon: Bot,
      color: 'pink',
      gradient: 'from-pink-500 to-pink-600',
    },
  ];

  const accounts = (accountsData as any)?.data?.accounts || [];

  // Mock recent activity - would be replaced with actual API call
  useEffect(() => {
    // In real implementation, fetch from API
    setRecentActivity([
      {
        type: 'campaign',
        message: 'Campaign "Welcome Campaign" sent to 100 contacts',
        time: '2 hours ago',
      },
      {
        type: 'template',
        message: 'Template "welcome_message" approved',
        time: '5 hours ago',
      },
      {
        type: 'bot',
        message: 'Bot "Welcome Bot" executed 15 times today',
        time: '8 hours ago',
      },
    ]);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">WhatsApp Dashboard</h1>
        <Link
          to="/whatsapp/accounts/connect"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Connect Account
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-500 text-sm font-medium">{stat.change} ↑</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-gray-400 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Accounts */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">📱 Connected Accounts</h2>
            <Link
              to="/whatsapp/accounts"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View All
            </Link>
          </div>

          {accountsLoading ? (
            <div className="text-center text-gray-400 py-8">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">No accounts connected</div>
              <Link
                to="/whatsapp/accounts/connect"
                className="text-blue-400 hover:text-blue-300"
              >
                Connect your first account →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.slice(0, 3).map((account: WhatsAppAccount) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{account.account_name}</div>
                    <div className="text-gray-400 text-sm mt-1">{account.phone_number}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      Last sync: {account.last_sync_at 
                        ? new Date(account.last_sync_at).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        account.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {account.status === 'active' ? '●' : '○'} {account.status}
                    </span>
                    <Link
                      to={`/whatsapp/accounts/${account.id}`}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">📈 Recent Activity</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No recent activity</div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="pb-4 border-b border-gray-700 last:border-0 last:pb-0"
                >
                  <div className="text-white font-medium">{activity.message}</div>
                  <div className="text-gray-400 text-sm mt-1">{activity.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/whatsapp/contacts/new"
            className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
          >
            <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-white text-sm font-medium">Add Contact</div>
          </Link>
          <Link
            to="/whatsapp/templates/new"
            className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
          >
            <Megaphone className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-white text-sm font-medium">Create Template</div>
          </Link>
          <Link
            to="/whatsapp/campaigns/new"
            className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
          >
            <Megaphone className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-white text-sm font-medium">New Campaign</div>
          </Link>
          <Link
            to="/whatsapp/bots/new"
            className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition-colors"
          >
            <Bot className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <div className="text-white text-sm font-medium">Create Bot</div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
