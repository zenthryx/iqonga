import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CompanyStats {
  profileComplete: number;
  productsCount: number;
  documentsCount: number;
  teamMembersCount: number;
  achievementsCount: number;
  agentsConnected: number;
  web3Configured: boolean;
  customDataSchemasCount: number;
  customDataEntriesCount: number;
}

interface CompanyProfile {
  id: string;
  company_name: string;
  industry: string;
  company_description: string;
}

const CompanyDashboard: React.FC = () => {
  const [stats, setStats] = useState<CompanyStats>({
    profileComplete: 0,
    productsCount: 0,
    documentsCount: 0,
    teamMembersCount: 0,
    achievementsCount: 0,
    agentsConnected: 0,
    web3Configured: false,
    customDataSchemasCount: 0,
    customDataEntriesCount: 0
  });
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/company/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data.stats);
          setProfile(data.data.profile);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading company dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-6 rounded-xl border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm font-medium">Company Profile</p>
              <p className="text-2xl font-bold text-blue-100">
                {stats.profileComplete === 100 ? 'Complete' : `${stats.profileComplete}%`}
              </p>
            </div>
            <div className="bg-blue-500/30 p-3 rounded-lg">
              <span className="text-blue-200 text-xl">🏢</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-blue-500/20 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${stats.profileComplete}%` }}
              ></div>
            </div>
            <p className="text-blue-300 text-xs mt-1">
              {stats.profileComplete === 100 ? 'All fields completed' : `${stats.profileComplete}% complete`}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 p-6 rounded-xl border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm font-medium">Products</p>
              <p className="text-2xl font-bold text-green-100">{stats.productsCount} Active</p>
            </div>
            <div className="bg-green-500/30 p-3 rounded-lg">
              <span className="text-green-200 text-xl">📦</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-green-300 text-sm">
              {stats.productsCount === 0 ? 'No products added' : 'Products configured'}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-6 rounded-xl border border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-300 text-sm font-medium">Documents</p>
              <p className="text-2xl font-bold text-orange-100">{stats.documentsCount} Files</p>
            </div>
            <div className="bg-orange-500/30 p-3 rounded-lg">
              <span className="text-orange-200 text-xl">📄</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-orange-300 text-sm">
              {stats.documentsCount === 0 ? 'No documents uploaded' : 'Knowledge base ready'}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 p-6 rounded-xl border border-indigo-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-300 text-sm font-medium">Team Members</p>
              <p className="text-2xl font-bold text-indigo-100">{stats.teamMembersCount} Active</p>
            </div>
            <div className="bg-indigo-500/30 p-3 rounded-lg">
              <span className="text-indigo-200 text-xl">👥</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-indigo-300 text-sm">
              {stats.teamMembersCount === 0 ? 'No team members added' : 'Team profiles ready'}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-6 rounded-xl border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-300 text-sm font-medium">Achievements</p>
              <p className="text-2xl font-bold text-yellow-100">{stats.achievementsCount} Milestones</p>
            </div>
            <div className="bg-yellow-500/30 p-3 rounded-lg">
              <span className="text-yellow-200 text-xl">🏆</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-yellow-300 text-sm">
              {stats.achievementsCount === 0 ? 'No achievements added' : 'Success stories ready'}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-6 rounded-xl border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm font-medium">AI Agents</p>
              <p className="text-2xl font-bold text-purple-100">{stats.agentsConnected} Connected</p>
            </div>
            <div className="bg-purple-500/30 p-3 rounded-lg">
              <span className="text-purple-200 text-xl">🤖</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-purple-300 text-sm">
              {stats.agentsConnected === 0 ? 'No agents connected' : 'Agents trained'}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 p-6 rounded-xl border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-300 text-sm font-medium">Web3 Details</p>
              <p className="text-2xl font-bold text-cyan-100">
                {stats.web3Configured ? 'Configured' : 'Not Set'}
              </p>
            </div>
            <div className="bg-cyan-500/30 p-3 rounded-lg">
              <span className="text-cyan-200 text-xl">⛓️</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-cyan-300 text-sm">
              {stats.web3Configured ? 'Blockchain project ready' : 'Add Web3 information'}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 p-6 rounded-xl border border-teal-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-300 text-sm font-medium">Custom Data</p>
              <p className="text-2xl font-bold text-teal-100">{stats.customDataSchemasCount} Schemas</p>
            </div>
            <div className="bg-teal-500/30 p-3 rounded-lg">
              <span className="text-teal-200 text-xl">🗄️</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-teal-300 text-sm">
              {stats.customDataEntriesCount} entries across {stats.customDataSchemasCount} schemas
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {profile ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="bg-green-500/20 p-2 rounded-lg flex-shrink-0">
                    <span className="text-green-400">📄</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Company profile created</p>
                    <p className="text-gray-400 text-sm">{profile.company_name}</p>
                  </div>
                </div>
                {stats.productsCount > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg flex-shrink-0">
                      <span className="text-blue-400">📦</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{stats.productsCount} products configured</p>
                      <p className="text-gray-400 text-sm">Products & services ready</p>
                    </div>
                  </div>
                )}
                {stats.documentsCount > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-500/20 p-2 rounded-lg flex-shrink-0">
                      <span className="text-orange-400">📄</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{stats.documentsCount} documents uploaded</p>
                      <p className="text-gray-400 text-sm">Knowledge base ready</p>
                    </div>
                  </div>
                )}
                {stats.teamMembersCount > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-500/20 p-2 rounded-lg flex-shrink-0">
                      <span className="text-indigo-400">👥</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{stats.teamMembersCount} team members added</p>
                      <p className="text-gray-400 text-sm">Team profiles ready</p>
                    </div>
                  </div>
                )}
                {stats.achievementsCount > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-500/20 p-2 rounded-lg flex-shrink-0">
                      <span className="text-yellow-400">🏆</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{stats.achievementsCount} achievements added</p>
                      <p className="text-gray-400 text-sm">Success stories ready</p>
                    </div>
                  </div>
                )}
                {stats.web3Configured && (
                  <div className="flex items-start gap-3">
                    <div className="bg-cyan-500/20 p-2 rounded-lg flex-shrink-0">
                      <span className="text-cyan-400">⛓️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Web3 details configured</p>
                      <p className="text-gray-400 text-sm">Blockchain project information added</p>
                    </div>
                  </div>
                )}
                {stats.customDataSchemasCount > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="bg-teal-500/20 p-2 rounded-lg flex-shrink-0">
                      <span className="text-teal-400">🗄️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{stats.customDataSchemasCount} custom data schemas</p>
                      <p className="text-gray-400 text-sm">{stats.customDataEntriesCount} entries available</p>
                    </div>
                  </div>
                )}
                {stats.agentsConnected > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg flex-shrink-0">
                      <span className="text-purple-400">🤖</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{stats.agentsConnected} agents connected</p>
                      <p className="text-gray-400 text-sm">Agents trained and ready</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">🚀</div>
                <p className="text-gray-400">No activity yet. Start by creating your company profile!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/company?tab=profile')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-purple-400 hover:bg-purple-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏢</div>
              <p className="font-medium text-gray-200">Company Profile</p>
              <p className="text-sm text-gray-400">Set up your business</p>
            </button>
            
            <button 
              onClick={() => navigate('/company?tab=products')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-blue-400 hover:bg-blue-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📦</div>
              <p className="font-medium text-gray-200">Add Products</p>
              <p className="text-sm text-gray-400">Products & services</p>
            </button>
            
            <button 
              onClick={() => navigate('/company?tab=documents')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-green-400 hover:bg-green-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📄</div>
              <p className="font-medium text-gray-200">Upload Docs</p>
              <p className="text-sm text-gray-400">FAQs, whitepapers</p>
            </button>
            
            <button 
              onClick={() => navigate('/company?tab=team')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-indigo-400 hover:bg-indigo-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">👥</div>
              <p className="font-medium text-gray-200">Add Team</p>
              <p className="text-sm text-gray-400">Team members</p>
            </button>
            
            <button 
              onClick={() => navigate('/company?tab=achievements')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-yellow-400 hover:bg-yellow-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏆</div>
              <p className="font-medium text-gray-200">Add Achievements</p>
              <p className="text-sm text-gray-400">Milestones & awards</p>
            </button>
            
            <button 
              onClick={() => navigate('/company?tab=agents')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-orange-400 hover:bg-orange-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🤖</div>
              <p className="font-medium text-gray-200">Train Agents</p>
              <p className="text-sm text-gray-400">Assign knowledge</p>
            </button>
            
            <button 
              onClick={() => navigate('/company?tab=web3')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-cyan-400 hover:bg-cyan-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⛓️</div>
              <p className="font-medium text-gray-200">Web3 Details</p>
              <p className="text-sm text-gray-400">Blockchain info</p>
            </button>
            
            <button 
              onClick={() => navigate('/company?tab=custom-data')}
              className="p-4 border-2 border-dashed border-gray-500 rounded-lg hover:border-teal-400 hover:bg-teal-500/10 transition-all text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🗄️</div>
              <p className="font-medium text-gray-200">Custom Data</p>
              <p className="text-sm text-gray-400">Business schemas</p>
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      {!profile && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-4">Welcome to Company Knowledge Base</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Teach your AI agents about your company, products, and services so they can represent your brand authentically 
            across all social media platforms.
          </p>
          <button 
            onClick={() => navigate('/company?tab=profile')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            🚀 Get Started - Create Company Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;
