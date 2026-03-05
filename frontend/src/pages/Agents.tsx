import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { agentService, Agent } from '@/services/agentService';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '@/utils/domain';

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'training' | 'error'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'interactions' | 'engagement'>('created_at');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        const response = await agentService.getAgents();
        if (response.success) {
          setAgents(response.agents);
        } else {
          toast.error('Could not fetch agents.');
        }
      } catch (error: any) {
        toast.error(`Failed to fetch agents: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const filteredAgents = (agents || [])
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'interactions':
          return (b.performance_metrics?.total_interactions || 0) - (a.performance_metrics?.total_interactions || 0);
        case 'engagement':
          return (b.performance_metrics?.engagement_rate || 0) - (a.performance_metrics?.engagement_rate || 0);
        default:
          return 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/20';
      case 'inactive':
        return 'text-gray-400 bg-gray-400/20';
      case 'training':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'error':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      // Here you would call agentService.deleteAgent(agentId)
      // For now, just remove from state
      setAgents(agents.filter(agent => agent.id !== agentId));
      toast.success('Agent deleted.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Agents</h1>
          <p className="text-gray-400 mt-1">
            Manage your AI agent personalities and their performance
          </p>
        </div>
        <Link to="/agents/create" className="btn-primary">
          ➕ Create New Agent
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Agents
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by name or description..."
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="training">Training</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-field"
            >
              <option value="created_at">Created Date</option>
              <option value="name">Name</option>
              <option value="interactions">Interactions</option>
              <option value="engagement">Engagement Rate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="agent-card hover:transform hover:scale-105 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center overflow-hidden">
                  {agent.avatar_url ? (
                    <>
                      <img 
                        src={resolveImageUrl(agent.avatar_url) || ''} 
                        alt={`${agent.name} avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="text-white font-semibold text-lg hidden">
                        {agent.name.charAt(0)}
                      </span>
                    </>
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {agent.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Actions Dropdown */}
              <div className="relative group">
                <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-1">
                    <Link
                      to={`/agents/${agent.id}`}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/agents/${agent.id}/edit`}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Edit Agent
                    </Link>
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                    >
                      Delete Agent
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
              {agent.description}
            </p>

            {/* Personality Traits */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {agent.personality_config.core_traits.slice(0, 3).map((trait: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs"
                  >
                    {trait}
                  </span>
                ))}
                {agent.personality_config.core_traits.length > 3 && (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">
                    +{agent.personality_config.core_traits.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Interactions</span>
                <span className="text-white font-medium">
                  {(agent.performance_metrics?.total_interactions || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Engagement Rate</span>
                <span className="text-green-400 font-medium">
                  {agent.performance_metrics?.engagement_rate || 0}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Platforms</span>
                <span className="text-purple-400 font-medium">
                  {Object.keys(agent.performance_metrics?.platform_metrics || {}).length}
                </span>
              </div>
            </div>

            {/* Platform Icons */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {Object.keys(agent.performance_metrics?.platform_metrics || {}).map((platform) => (
                  <div
                    key={platform}
                    className="h-6 w-6 bg-gray-600 rounded flex items-center justify-center"
                    title={platform}
                  >
                    <span className="text-xs text-white font-medium">
                      {platform.charAt(0).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
              
              <Link
                to={`/agents/${agent.id}`}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!isLoading && filteredAgents.length === 0 && (
        <div className="text-center py-20 glass-card">
          <h2 className="text-xl font-semibold text-white">No Agents Found</h2>
          <p className="text-gray-400 mt-2">
            {agents.length === 0
              ? 'Create your first AI agent to get started with Iqonga.'
              : 'Try adjusting your search or filters.'}
          </p>
          {agents.length === 0 && statusFilter === 'all' && (
            <Link to="/agents/create" className="btn-primary mt-6">
              Create Your First Agent
            </Link>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Agents</p>
              <p className="text-2xl font-bold text-white">{agents.length}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Agents</p>
              <p className="text-2xl font-bold text-white">
                {agents.filter(a => a.status === 'active').length}
              </p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Interactions</p>
              <p className="text-2xl font-bold text-white">
                {agents.reduce((sum, agent) => sum + (agent.performance_metrics?.total_interactions || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Engagement</p>
              <p className="text-2xl font-bold text-white">
                {(agents.length > 0 ? (agents.reduce((sum, agent) => sum + (agent.performance_metrics?.engagement_rate || 0), 0) / agents.length) : 0).toFixed(1)}%
              </p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agents;