import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { salesApi, Lead, Deal } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import {
  Mail,
  Phone,
  Calendar,
  FileText,
  CheckSquare,
  User,
  Building,
  Save,
  X,
  Loader,
  Clock,
  Search,
  Tag
} from 'lucide-react';

const ActivityForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const leadIdFromUrl = searchParams.get('lead_id');
  const dealIdFromUrl = searchParams.get('deal_id');
  const typeFromUrl = searchParams.get('type') || 'note';

  const [loading, setLoading] = useState(false);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [searchingDeals, setSearchingDeals] = useState(false);
  
  const [leadSearch, setLeadSearch] = useState('');
  const [dealSearch, setDealSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    type: typeFromUrl,
    lead_id: leadIdFromUrl || '',
    deal_id: dealIdFromUrl || '',
    subject: '',
    notes: '',
    due_date: '',
    status: 'Pending',
    outcome: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (leadIdFromUrl) {
      loadLeadById(leadIdFromUrl);
    }
    if (dealIdFromUrl) {
      loadDealById(dealIdFromUrl);
    }
  }, [leadIdFromUrl, dealIdFromUrl]);

  useEffect(() => {
    if (leadSearch.length >= 2) {
      searchLeads(leadSearch);
    } else {
      setLeads([]);
    }
  }, [leadSearch]);

  useEffect(() => {
    if (dealSearch.length >= 2) {
      searchDeals(dealSearch);
    } else {
      setDeals([]);
    }
  }, [dealSearch]);

  const loadLeadById = async (leadId: string) => {
    try {
      const lead = await salesApi.getLead(leadId);
      setSelectedLead(lead);
    } catch (error) {
      console.error('Failed to load lead:', error);
    }
  };

  const loadDealById = async (dealId: string) => {
    try {
      const deal = await salesApi.getDeal(dealId);
      setSelectedDeal(deal);
    } catch (error) {
      console.error('Failed to load deal:', error);
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

  const searchDeals = async (query: string) => {
    try {
      setSearchingDeals(true);
      const result = await salesApi.getDeals({ search: query }, 1, 10);
      setDeals(result.data);
    } catch (error) {
      console.error('Failed to search deals:', error);
    } finally {
      setSearchingDeals(false);
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

    // Auto-update subject based on type
    if (name === 'type' && !formData.subject) {
      let defaultSubject = '';
      switch (value) {
        case 'email':
          defaultSubject = 'Email sent to ';
          break;
        case 'call':
          defaultSubject = 'Called ';
          break;
        case 'meeting':
          defaultSubject = 'Met with ';
          break;
        case 'task':
          defaultSubject = 'Follow up task';
          break;
        case 'note':
          defaultSubject = 'Note added';
          break;
      }
      setFormData(prev => ({ ...prev, subject: defaultSubject }));
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData(prev => ({ ...prev, lead_id: lead.id }));
    setLeadSearch('');
    setLeads([]);
  };

  const handleDealSelect = (deal: Deal) => {
    setSelectedDeal(deal);
    setFormData(prev => ({ ...prev, deal_id: deal.id }));
    setDealSearch('');
    setDeals([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Activity type is required';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.lead_id && !formData.deal_id) {
      newErrors.association = 'Please associate with either a lead or a deal';
    }
    if (formData.type === 'task' && !formData.due_date) {
      newErrors.due_date = 'Due date is required for tasks';
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

      const activityData = {
        type: formData.type,
        lead_id: formData.lead_id || undefined,
        deal_id: formData.deal_id || undefined,
        subject: formData.subject.trim(),
        notes: formData.notes.trim() || undefined,
        due_date: formData.due_date || undefined,
        status: formData.type === 'task' ? formData.status : 'Completed'
      };

      await salesApi.createActivity(activityData);

      // Navigate back to the appropriate page
      if (formData.deal_id) {
        navigate(`/sales/deals/${formData.deal_id}`);
      } else if (formData.lead_id) {
        navigate(`/sales/leads/${formData.lead_id}`);
      } else {
        navigate('/sales/activities');
      }
    } catch (error) {
      console.error('Failed to save activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (formData.deal_id) {
      navigate(`/sales/deals/${formData.deal_id}`);
    } else if (formData.lead_id) {
      navigate(`/sales/leads/${formData.lead_id}`);
    } else {
      navigate('/sales/dashboard');
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'call':
        return <Phone className="w-5 h-5" />;
      case 'meeting':
        return <Calendar className="w-5 h-5" />;
      case 'task':
        return <CheckSquare className="w-5 h-5" />;
      case 'note':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Log Activity</h1>
        <p className="text-gray-400">
          Record an interaction or create a task
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Activity Type */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            Activity Type
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { value: 'email', label: 'Email', icon: Mail },
              { value: 'call', label: 'Call', icon: Phone },
              { value: 'meeting', label: 'Meeting', icon: Calendar },
              { value: 'task', label: 'Task', icon: CheckSquare },
              { value: 'note', label: 'Note', icon: FileText }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleChange({ target: { name: 'type', value } } as any)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === value
                    ? 'border-blue-500 bg-blue-600/20'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  formData.type === value ? 'text-blue-400' : 'text-gray-400'
                }`} />
                <div className={`text-sm font-medium ${
                  formData.type === value ? 'text-white' : 'text-gray-300'
                }`}>
                  {label}
                </div>
              </button>
            ))}
          </div>
          {errors.type && (
            <p className="mt-2 text-sm text-red-500">{errors.type}</p>
          )}
        </div>

        {/* Association */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Associate With
          </h2>

          {errors.association && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {errors.association}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Association */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lead
              </label>
              {selectedLead ? (
                <div className="bg-gray-700/50 rounded-lg p-3 flex items-start justify-between">
                  <div>
                    <div className="text-white font-medium">
                      {selectedLead.first_name} {selectedLead.last_name}
                    </div>
                    <div className="text-gray-400 text-sm">{selectedLead.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLead(null);
                      setFormData(prev => ({ ...prev, lead_id: '' }));
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search leads..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
                  />
                  {searchingLeads && (
                    <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                  )}
                </div>
              )}

              {leads.length > 0 && (
                <div className="mt-2 bg-gray-700 rounded-lg border border-gray-600 max-h-40 overflow-y-auto">
                  {leads.map(lead => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => handleLeadSelect(lead)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 text-sm"
                    >
                      <div className="text-white font-medium">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-gray-400 text-xs">{lead.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Deal Association */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deal
              </label>
              {selectedDeal ? (
                <div className="bg-gray-700/50 rounded-lg p-3 flex items-start justify-between">
                  <div>
                    <div className="text-white font-medium">{selectedDeal.deal_name}</div>
                    <div className="text-gray-400 text-sm">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: selectedDeal.currency
                      }).format(selectedDeal.amount)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeal(null);
                      setFormData(prev => ({ ...prev, deal_id: '' }));
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={dealSearch}
                    onChange={(e) => setDealSearch(e.target.value)}
                    placeholder="Search deals..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
                  />
                  {searchingDeals && (
                    <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                  )}
                </div>
              )}

              {deals.length > 0 && (
                <div className="mt-2 bg-gray-700 rounded-lg border border-gray-600 max-h-40 overflow-y-auto">
                  {deals.map(deal => (
                    <button
                      key={deal.id}
                      type="button"
                      onClick={() => handleDealSelect(deal)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 text-sm"
                    >
                      <div className="text-white font-medium">{deal.deal_name}</div>
                      <div className="text-gray-400 text-xs">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: deal.currency
                        }).format(deal.amount)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Details */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            {getActivityIcon(formData.type)}
            <span className="ml-2">Details</span>
          </h2>

          <div className="space-y-4">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.subject ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                placeholder={`What was this ${formData.type} about?`}
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-500">{errors.subject}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes / Details
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="Add any relevant details, outcomes, or next steps..."
              />
            </div>

            {/* Conditional Fields for Task */}
            {formData.type === 'task' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-2 bg-gray-700 border ${
                        errors.due_date ? 'border-red-500' : 'border-gray-600'
                      } rounded-lg text-white focus:outline-none focus:border-blue-500`}
                    />
                  </div>
                  {errors.due_date && (
                    <p className="mt-1 text-sm text-red-500">{errors.due_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            )}
          </div>
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
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Log Activity
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;

