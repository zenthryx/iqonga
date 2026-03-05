import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { salesApi, Deal, Lead, Pipeline, PipelineStage } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  Building,
  Save,
  X,
  Loader,
  Search,
  Plus
} from 'lucide-react';

const DealForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;
  const leadIdFromUrl = searchParams.get('lead_id');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    deal_name: '',
    lead_id: leadIdFromUrl || '',
    amount: '',
    currency: 'USD',
    close_date: '',
    pipeline_id: '',
    stage_id: '',
    win_probability: '50'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.pipeline_id) {
      loadStages(formData.pipeline_id);
    }
  }, [formData.pipeline_id]);

  useEffect(() => {
    if (leadIdFromUrl) {
      loadLeadById(leadIdFromUrl);
    }
  }, [leadIdFromUrl]);

  useEffect(() => {
    if (leadSearch.length >= 2) {
      searchLeads(leadSearch);
    } else {
      setLeads([]);
    }
  }, [leadSearch]);

  const loadInitialData = async () => {
    try {
      const pipelinesData = await salesApi.getPipelines();
      setPipelines(pipelinesData);

      // Set default pipeline
      if (pipelinesData.length > 0 && !formData.pipeline_id) {
        const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0];
        setFormData(prev => ({ ...prev, pipeline_id: defaultPipeline.id }));
      }

      // Load deal data if editing
      if (isEditMode && id) {
        await loadDeal(id);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load form data');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadDeal = async (dealId: string) => {
    try {
      const deal = await salesApi.getDeal(dealId);
      setFormData({
        deal_name: deal.deal_name || '',
        lead_id: deal.lead_id || '',
        amount: deal.amount?.toString() || '',
        currency: deal.currency || 'USD',
        close_date: deal.close_date ? deal.close_date.split('T')[0] : '',
        pipeline_id: deal.pipeline_id || '',
        stage_id: deal.stage_id || '',
        win_probability: deal.win_probability?.toString() || '50'
      });

      // Load associated lead
      if (deal.lead_id) {
        await loadLeadById(deal.lead_id);
      }
    } catch (error) {
      console.error('Failed to load deal:', error);
      toast.error('Failed to load deal details');
      navigate('/sales/pipeline');
    }
  };

  const loadLeadById = async (leadId: string) => {
    try {
      const lead = await salesApi.getLead(leadId);
      setSelectedLead(lead);
      if (!formData.deal_name && lead) {
        setFormData(prev => ({
          ...prev,
          deal_name: `${lead.company_name || lead.first_name + ' ' + lead.last_name} - Deal`
        }));
      }
    } catch (error) {
      console.error('Failed to load lead:', error);
    }
  };

  const loadStages = async (pipelineId: string) => {
    try {
      const stagesData = await salesApi.getPipelineStages(pipelineId);
      setStages(stagesData);

      // Set default stage if not already set
      if (!formData.stage_id && stagesData.length > 0) {
        const firstStage = stagesData.sort((a, b) => a.stage_order - b.stage_order)[0];
        setFormData(prev => ({ 
          ...prev, 
          stage_id: firstStage.id,
          win_probability: firstStage.win_probability.toString()
        }));
      }
    } catch (error) {
      console.error('Failed to load stages:', error);
    }
  };

  const searchLeads = async (query: string) => {
    try {
      setSearchingLeads(true);
      const result = await salesApi.getLeads({ search: query }, 1, 10);
      setLeads(result.data);
    } catch (error) {
      console.error('Failed to search leads:', error);
    } finally {
      setSearchingLeads(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Auto-update win probability when stage changes
    if (name === 'stage_id') {
      const stage = stages.find(s => s.id === value);
      if (stage) {
        setFormData(prev => ({ ...prev, win_probability: stage.win_probability.toString() }));
      }
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData(prev => ({ 
      ...prev, 
      lead_id: lead.id,
      deal_name: prev.deal_name || `${lead.company_name || lead.first_name + ' ' + lead.last_name} - Deal`
    }));
    setLeadSearch('');
    setLeads([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.deal_name.trim()) {
      newErrors.deal_name = 'Deal name is required';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.close_date) {
      newErrors.close_date = 'Expected close date is required';
    }
    if (!formData.pipeline_id) {
      newErrors.pipeline_id = 'Pipeline is required';
    }
    if (!formData.stage_id) {
      newErrors.stage_id = 'Stage is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);

      const dealData = {
        deal_name: formData.deal_name.trim(),
        lead_id: formData.lead_id || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        close_date: formData.close_date,
        pipeline_id: formData.pipeline_id,
        stage_id: formData.stage_id,
        win_probability: parseInt(formData.win_probability)
      };

      if (isEditMode && id) {
        await salesApi.updateDeal(id, dealData);
        navigate(`/sales/deals/${id}`);
      } else {
        const newDeal = await salesApi.createDeal(dealData);
        navigate(`/sales/deals/${newDeal.id}`);
      }
    } catch (error) {
      console.error('Failed to save deal:', error);
      // Toast is handled by API service
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && id) {
      navigate(`/sales/deals/${id}`);
    } else {
      navigate('/sales/pipeline');
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading deal details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isEditMode ? 'Edit Deal' : 'Create New Deal'}
        </h1>
        <p className="text-gray-400">
          {isEditMode 
            ? 'Update deal information and details' 
            : 'Add a new deal to your sales pipeline'
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deal Information Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Deal Information
          </h2>
          
          <div className="space-y-6">
            {/* Deal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="deal_name"
                value={formData.deal_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.deal_name ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                placeholder="e.g., Acme Corp - Enterprise License"
              />
              {errors.deal_name && (
                <p className="mt-1 text-sm text-red-500">{errors.deal_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Deal Value <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className={`flex-1 px-4 py-2 bg-gray-700 border ${
                      errors.amount ? 'border-red-500' : 'border-gray-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                    placeholder="50000.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
                )}
              </div>

              {/* Expected Close Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expected Close Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="close_date"
                    value={formData.close_date}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full pl-10 pr-4 py-2 bg-gray-700 border ${
                      errors.close_date ? 'border-red-500' : 'border-gray-600'
                    } rounded-lg text-white focus:outline-none focus:border-blue-500`}
                  />
                </div>
                {errors.close_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.close_date}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline & Stage Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Pipeline & Stage
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pipeline */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pipeline <span className="text-red-500">*</span>
              </label>
              <select
                name="pipeline_id"
                value={formData.pipeline_id}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.pipeline_id ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white focus:outline-none focus:border-blue-500`}
              >
                <option value="">Select pipeline...</option>
                {pipelines.map(pipeline => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.pipeline_name} {pipeline.is_default && '(Default)'}
                  </option>
                ))}
              </select>
              {errors.pipeline_id && (
                <p className="mt-1 text-sm text-red-500">{errors.pipeline_id}</p>
              )}
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stage <span className="text-red-500">*</span>
              </label>
              <select
                name="stage_id"
                value={formData.stage_id}
                onChange={handleChange}
                disabled={!formData.pipeline_id || stages.length === 0}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.stage_id ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">Select stage...</option>
                {stages.sort((a, b) => a.stage_order - b.stage_order).map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.stage_name} ({stage.win_probability}%)
                  </option>
                ))}
              </select>
              {errors.stage_id && (
                <p className="mt-1 text-sm text-red-500">{errors.stage_id}</p>
              )}
            </div>

            {/* Win Probability */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Win Probability
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  name="win_probability"
                  value={formData.win_probability}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="5"
                  className="flex-1"
                />
                <span className="text-white font-semibold w-12">{formData.win_probability}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${formData.win_probability}%` }}
                />
              </div>
            </div>

            {/* Weighted Value */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Weighted Value
              </label>
              <div className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formData.amount && !isNaN(parseFloat(formData.amount))
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: formData.currency
                      }).format(parseFloat(formData.amount) * (parseInt(formData.win_probability) / 100))
                    : '$0.00'
                  }
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Based on {formData.win_probability}% probability
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact/Lead Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Associated Contact
          </h2>

          {selectedLead ? (
            <div className="bg-gray-700/50 rounded-lg p-4 flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-semibold">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </div>
                  <div className="text-gray-400 text-sm">{selectedLead.email}</div>
                  {selectedLead.company_name && (
                    <div className="text-gray-400 text-sm flex items-center mt-1">
                      <Building className="w-3 h-3 mr-1" />
                      {selectedLead.company_name}
                    </div>
                  )}
                </div>
              </div>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLead(null);
                    setFormData(prev => ({ ...prev, lead_id: '' }));
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm mb-3">
                Search for an existing lead or leave empty to create a standalone deal.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search leads by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  disabled={isEditMode}
                />
                {searchingLeads && (
                  <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                )}
              </div>

              {/* Lead search results */}
              {leads.length > 0 && (
                <div className="mt-2 bg-gray-700 rounded-lg border border-gray-600 max-h-60 overflow-y-auto">
                  {leads.map(lead => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => handleLeadSelect(lead)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                    >
                      <div className="text-white font-medium">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-gray-400 text-sm">{lead.email}</div>
                      {lead.company_name && (
                        <div className="text-gray-400 text-sm mt-1">
                          {lead.company_name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {isEditMode && (
                <p className="mt-2 text-xs text-gray-400">
                  Contact association cannot be changed after deal creation
                </p>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update Deal' : 'Create Deal'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DealForm;

