import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { salesApi, Lead } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Tag,
  FileText,
  Save,
  X,
  AlertCircle,
  Loader,
  CheckCircle
} from 'lucide-react';

const LeadForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<Lead | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    lead_source: '',
    lead_status: 'New',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && id) {
      loadLead(id);
    }
  }, [id, isEditMode]);

  const loadLead = async (leadId: string) => {
    try {
      setLoading(true);
      const lead = await salesApi.getLead(leadId);
      setFormData({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company_name: lead.company_name || '',
        job_title: lead.job_title || '',
        lead_source: lead.lead_source || '',
        lead_status: lead.lead_status || 'New',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to load lead:', error);
      toast.error('Failed to load lead details');
      navigate('/sales/leads');
    } finally {
      setLoading(false);
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

    // Clear duplicate flag when email changes
    if (name === 'email' && isDuplicate) {
      setIsDuplicate(false);
      setDuplicateLead(null);
    }
  };

  const handleEmailBlur = async () => {
    // Only check for duplicates in create mode and if email is valid
    if (isEditMode || !formData.email || !formData.email.includes('@')) {
      return;
    }

    try {
      setChecking(true);
      const result = await salesApi.checkDuplicateLead(formData.email);
      if (result.isDuplicate && result.lead) {
        setIsDuplicate(true);
        setDuplicateLead(result.lead);
        toast.error('A lead with this email already exists!', { duration: 4000 });
      }
    } catch (error) {
      console.error('Failed to check for duplicate:', error);
    } finally {
      setChecking(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Optional validations
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
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

    if (!isEditMode && isDuplicate) {
      toast.error('Cannot create duplicate lead. Please use a different email.');
      return;
    }

    try {
      setLoading(true);

      const leadData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        company_name: formData.company_name.trim() || undefined,
        job_title: formData.job_title.trim() || undefined,
        lead_source: formData.lead_source || undefined,
        lead_status: formData.lead_status
      };

      if (isEditMode && id) {
        await salesApi.updateLead(id, leadData);
      } else {
        await salesApi.createLead(leadData);
      }

      navigate('/sales/leads');
    } catch (error) {
      console.error('Failed to save lead:', error);
      // Toast is handled by API service
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/sales/leads');
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading lead details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isEditMode ? 'Edit Lead' : 'Create New Lead'}
        </h1>
        <p className="text-gray-400">
          {isEditMode 
            ? 'Update lead information and details' 
            : 'Add a new lead to your sales pipeline'
          }
        </p>
      </div>

      {/* Duplicate Warning */}
      {isDuplicate && duplicateLead && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-yellow-500 font-semibold mb-1">Duplicate Lead Detected</h3>
            <p className="text-gray-300 text-sm mb-2">
              A lead with email <strong>{duplicateLead.email}</strong> already exists:
            </p>
            <p className="text-gray-400 text-sm">
              {duplicateLead.first_name} {duplicateLead.last_name} - {duplicateLead.company_name || 'No company'}
            </p>
            <button
              onClick={() => navigate(`/sales/leads/${duplicateLead.id}`)}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 underline"
            >
              View existing lead →
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.first_name ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                placeholder="John"
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-500">{errors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-gray-700 border ${
                  errors.last_name ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-500">{errors.last_name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  disabled={isEditMode}
                  className={`w-full pl-10 pr-10 py-2 bg-gray-700 border ${
                    errors.email ? 'border-red-500' : isDuplicate ? 'border-yellow-500' : 'border-gray-600'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                    isEditMode ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="john.doe@example.com"
                />
                {checking && (
                  <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                )}
                {!checking && !isDuplicate && formData.email && !errors.email && !isEditMode && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
              {isEditMode && (
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-700 border ${
                    errors.phone ? 'border-red-500' : 'border-gray-600'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Company Information Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Company Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="Acme Corporation"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job Title
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Marketing Manager"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Details Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            Lead Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Source */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lead Source
              </label>
              <select
                name="lead_source"
                value={formData.lead_source}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select source...</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter/X">Twitter/X</option>
                <option value="Cold Outreach">Cold Outreach</option>
                <option value="Event">Event</option>
                <option value="Partner">Partner</option>
                <option value="Advertisement">Advertisement</option>
                <option value="Content Marketing">Content Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Lead Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lead Status
              </label>
              <select
                name="lead_status"
                value={formData.lead_status}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Nurturing">Nurturing</option>
                <option value="Disqualified">Disqualified</option>
              </select>
            </div>
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
            disabled={loading || (!isEditMode && isDuplicate)}
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
                {isEditMode ? 'Update Lead' : 'Create Lead'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeadForm;

