import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesApi, Lead } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import BulkActionToolbar from '../../components/sales/BulkActionToolbar';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Loader,
  TrendingUp,
  Mail,
  Building,
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Filters {
  status: string;
  search: string;
  source: string;
  min_score: string;
  qualified: string;
}

const LeadsList: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    search: '',
    source: '',
    min_score: '',
    qualified: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  
  // Bulk selection
  const {
    selectedIds,
    selectedCount,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected
  } = useBulkSelection(leads);

  useEffect(() => {
    loadLeads();
  }, [filters, pagination.page]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const apiFilters: any = {};
      if (filters.status) apiFilters.status = filters.status;
      if (filters.search) apiFilters.search = filters.search;
      if (filters.source) apiFilters.source = filters.source;
      if (filters.min_score) apiFilters.min_score = parseInt(filters.min_score);
      if (filters.qualified) apiFilters.qualified = filters.qualified === 'true';

      const response = await salesApi.getLeads(apiFilters, pagination.page, pagination.limit);
      setLeads(response.data);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      await salesApi.deleteLead(id);
      loadLeads();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const handleBulkAction = async (action: string, data?: any) => {
    const token = localStorage.getItem('authToken');
    const selectedLeadIds = Array.from(selectedIds);

    try {
      const response = await fetch(`https://www.ajentrix.com/api/bulk-actions/leads/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          ...data
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Bulk action failed');
      }

      loadLeads();
    } catch (error: any) {
      throw error;
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    
    switch (status.toLowerCase()) {
      case 'qualified':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'contacted':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'nurturing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'disqualified':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Leads Management</h1>
          <p className="text-gray-400">Manage and track your sales leads</p>
        </div>
        <Link
          to="/sales/leads/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Nurturing">Nurturing</option>
              <option value="Disqualified">Disqualified</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Sources</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Twitter/X">Twitter/X</option>
              <option value="Cold Outreach">Cold Outreach</option>
              <option value="Event">Event</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Qualified Filter */}
          <div>
            <select
              value={filters.qualified}
              onChange={(e) => handleFilterChange('qualified', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Leads</option>
              <option value="true">Qualified</option>
              <option value="false">Not Qualified</option>
            </select>
          </div>

          {/* Min Score */}
          <div>
            <input
              type="number"
              placeholder="Min Score"
              value={filters.min_score}
              onChange={(e) => handleFilterChange('min_score', e.target.value)}
              min="0"
              max="100"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No leads found</h3>
            <p className="text-gray-400 mb-4">
              {filters.search || filters.status || filters.source
                ? 'Try adjusting your filters'
                : 'Get started by adding your first lead'
              }
            </p>
            <Link
              to="/sales/leads/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-750 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-600/20 rounded-lg mr-3">
                            <User className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {lead.first_name} {lead.last_name}
                            </div>
                            {lead.job_title && (
                              <div className="text-gray-400 text-sm">{lead.job_title}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-gray-300">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {lead.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.company_name ? (
                          <div className="flex items-center text-gray-300">
                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                            {lead.company_name}
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.lead_status)}`}>
                          {lead.lead_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TrendingUp className={`w-4 h-4 mr-1 ${getScoreColor(lead.lead_score)}`} />
                          <span className={`font-semibold ${getScoreColor(lead.lead_score)}`}>
                            {lead.lead_score}
                          </span>
                          <span className="text-gray-500 text-sm ml-1">/100</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                        {lead.lead_source || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/sales/leads/${lead.id}`}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/sales/leads/${lead.id}/edit`}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} leads
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {selectedCount > 0 && (
        <BulkActionToolbar
          selectedCount={selectedCount}
          entityType="leads"
          onClearSelection={clearSelection}
          onBulkAction={handleBulkAction}
        />
      )}
    </div>
  );
};

export default LeadsList;
