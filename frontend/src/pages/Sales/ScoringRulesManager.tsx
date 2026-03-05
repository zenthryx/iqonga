import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, Target, TrendingUp, Power, PowerOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScoringRule {
  id: string;
  rule_name: string;
  rule_type: 'behavioral' | 'firmographic' | 'engagement' | 'demographic';
  criteria: Record<string, any>;
  points: number;
  is_active: boolean;
  created_at: string;
}

const ScoringRulesManager: React.FC = () => {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null);
  
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'behavioral' as 'behavioral' | 'firmographic' | 'engagement' | 'demographic',
    criteria: {},
    points: 10
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('https://www.ajentrix.com/api/lead-scoring/rules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setRules(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load scoring rules:', error);
      toast.error('Failed to load scoring rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      const url = editingRule
        ? `https://www.ajentrix.com/api/lead-scoring/rules/${editingRule.id}`
        : 'https://www.ajentrix.com/api/lead-scoring/rules';
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingRule ? 'Rule updated!' : 'Rule created!');
        loadRules();
        handleCloseForm();
      } else {
        toast.error(result.error || 'Failed to save rule');
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error('Failed to save rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://www.ajentrix.com/api/lead-scoring/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Rule deleted!');
        loadRules();
      } else {
        toast.error(result.error || 'Failed to delete rule');
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleActive = async (rule: ScoringRule) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://www.ajentrix.com/api/lead-scoring/rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: !rule.is_active
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(rule.is_active ? 'Rule deactivated' : 'Rule activated');
        loadRules();
      } else {
        toast.error(result.error || 'Failed to update rule');
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const handleEdit = (rule: ScoringRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      criteria: rule.criteria,
      points: rule.points
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({
      rule_name: '',
      rule_type: 'behavioral',
      criteria: {},
      points: 10
    });
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'behavioral':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'firmographic':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'engagement':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'demographic':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Target className="w-8 h-8 mr-3 text-blue-400" />
            Lead Scoring Rules
          </h1>
          <p className="text-gray-400 mt-2">Configure automated lead scoring criteria</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-4">
        {rules.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-12 text-center">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Scoring Rules Yet</h3>
            <p className="text-gray-400 mb-4">
              Create your first scoring rule to automatically score leads based on behavior and attributes
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{rule.rule_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRuleTypeColor(rule.rule_type)}`}>
                      {rule.rule_type}
                    </span>
                    {rule.is_active ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/50">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/50">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1 text-green-400" />
                      +{rule.points} points
                    </span>
                    <span>
                      Created: {new Date(rule.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-gray-300">
                    <strong>Criteria:</strong> {JSON.stringify(rule.criteria, null, 2)}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.is_active
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title={rule.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {rule.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={handleCloseForm} />

            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 rounded-lg shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white">
                  {editingRule ? 'Edit Scoring Rule' : 'New Scoring Rule'}
                </h3>
                <button onClick={handleCloseForm} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rule Name *</label>
                  <input
                    type="text"
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., Email Opened"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rule Type *</label>
                  <select
                    value={formData.rule_type}
                    onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="behavioral">Behavioral (email opens, clicks)</option>
                    <option value="firmographic">Firmographic (company size, industry)</option>
                    <option value="engagement">Engagement (website visits, content downloads)</option>
                    <option value="demographic">Demographic (job title, location)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Points *</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    min="1"
                    max="100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Criteria (JSON) *
                  </label>
                  <textarea
                    value={JSON.stringify(formData.criteria, null, 2)}
                    onChange={(e) => {
                      try {
                        setFormData({ ...formData, criteria: JSON.parse(e.target.value) });
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={6}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
                    placeholder='{"action": "email_opened", "min_count": 1}'
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Example: {`{"action": "email_opened", "min_count": 3}`}
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringRulesManager;

