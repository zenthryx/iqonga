import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Users, 
  TrendingUp,
  Mail,
  Calendar,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import salesCadenceApi from '@/services/salesCadenceApi';

const CadenceList: React.FC = () => {
  const [cadences, setCadences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    loadCadences();
  }, [filterActive]);

  const loadCadences = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterActive !== undefined) filters.is_active = filterActive;
      if (searchQuery) filters.search = searchQuery;

      const data = await salesCadenceApi.getCadences(filters);
      setCadences(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load cadences');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await salesCadenceApi.deleteCadence(id);
      toast.success('Cadence deleted successfully');
      loadCadences();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete cadence');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await salesCadenceApi.updateCadence(id, { is_active: !currentStatus });
      toast.success(`Cadence ${!currentStatus ? 'activated' : 'paused'}`);
      loadCadences();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update cadence');
    }
  };

  const filteredCadences = cadences.filter(cadence =>
    searchQuery === '' || 
    cadence.cadence_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cadence.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales Cadences</h1>
          <p className="text-gray-400">Manage your automated sales sequences</p>
        </div>
        <Link
          to="/sales/cadences/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Cadence
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search cadences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filterActive === undefined ? 'all' : filterActive.toString()}
            onChange={(e) => setFilterActive(e.target.value === 'all' ? undefined : e.target.value === 'true')}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Cadences List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredCadences.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No cadences found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery || filterActive !== undefined
              ? 'Try adjusting your filters'
              : 'Get started by creating your first sales cadence'
            }
          </p>
          {!searchQuery && filterActive === undefined && (
            <Link
              to="/sales/cadences/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Cadence
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCadences.map((cadence) => (
            <div
              key={cadence.id}
              className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{cadence.cadence_name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2">{cadence.description || 'No description'}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    cadence.is_active
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                  }`}
                >
                  {cadence.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  <span>{cadence.total_steps || 0} steps</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{cadence.total_enrollments || 0} enrolled</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>{cadence.active_enrollments || 0} active</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  to={`/sales/cadences/${cadence.id}`}
                  className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-medium transition-colors text-center"
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Edit
                </Link>
                <button
                  onClick={() => handleToggleActive(cadence.id, cadence.is_active)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors"
                  title={cadence.is_active ? 'Pause' : 'Activate'}
                >
                  {cadence.is_active ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(cadence.id, cadence.cadence_name)}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CadenceList;

