import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  GiftIcon,
  ShareIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface ReferralStats {
  referralCode: string | null;
  referralLink: string | null;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  completedEarnings: number;
  pendingEarnings: number;
  totalRewards: number;
}

interface ReferralReward {
  id: string;
  rewardType: string;
  purchaseAmount: number;
  usdcAmount: number;
  creditsAwarded: number;
  status: string;
  transactionSignature: string | null;
  referredUsername: string | null;
  createdAt: string;
  completedAt: string | null;
}

const Referrals: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, rewardsRes] = await Promise.all([
        apiService.get('/referrals/stats'),
        apiService.get('/referrals/rewards')
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (rewardsRes.success) {
        setRewards(rewardsRes.data);
      }
    } catch (error: any) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = () => {
    if (stats?.referralLink) {
      if (navigator.share) {
        navigator.share({
          title: 'Join me on Iqonga!',
          text: 'Get started with AI-powered marketing and engagement',
          url: stats.referralLink
        }).catch(() => {
          copyToClipboard(stats.referralLink!);
        });
      } else {
        copyToClipboard(stats.referralLink);
      }
    }
  };

  const getSolanaExplorerLink = (signature: string) => {
    return `https://solscan.io/tx/${signature}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Referral Program</h1>
        <p className="text-gray-400 mt-2">
          Earn USDC for every user you refer! Share your link and get rewarded.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Referrals</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats?.totalReferrals || 0}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.activeReferrals || 0} active
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                ${(stats?.totalEarnings || 0).toFixed(2)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ${(stats?.completedEarnings || 0).toFixed(2)} paid
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                ${(stats?.pendingEarnings || 0).toFixed(2)}
              </p>
            </div>
            <GiftIcon className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Processing...</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Rewards</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats?.totalRewards || 0}
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-purple-400" />
          </div>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
      </div>

      {/* Referral Code Section - Always show, even if code is being generated */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Your Referral Code
              </h3>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <code className="text-white font-mono text-lg flex-1">
                  {stats?.referralCode || 'Generating...'}
                </code>
                {stats?.referralCode && (
                  <button
                    onClick={() => copyToClipboard(stats.referralCode!)}
                    className="p-2 hover:bg-white/20 rounded transition-colors"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-300" />
                    ) : (
                      <Copy className="h-5 w-5 text-white" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Your Referral Link
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={stats?.referralLink || 'Generating referral link...'}
                readOnly
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              {stats?.referralLink && (
                <button
                  onClick={shareReferralLink}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                >
                  <ShareIcon className="h-5 w-5" />
                  <span>Share</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-white text-sm">
              💰 <strong>Earn 20% USDC</strong> on every purchase your referrals make!
            </p>
            <p className="text-white/80 text-xs mt-1">
              Your referrals also get a 20% bonus on their first purchase.
            </p>
          </div>
        </div>

      {/* Rewards History */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Rewards History</h2>
        
        {rewards.length === 0 ? (
          <div className="text-center py-12">
            <GiftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No rewards yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Start referring users to earn USDC!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Referred User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Purchase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    USDC Earned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {rewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(reward.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {reward.referredUsername || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {reward.purchaseAmount} credits
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                      ${reward.usdcAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          reward.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : reward.status === 'processing'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : reward.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {reward.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {reward.transactionSignature ? (
                        <a
                          href={getSolanaExplorerLink(reward.transactionSignature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                          <span>View</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Referrals;

