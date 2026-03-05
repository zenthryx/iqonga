import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronLeft, Users, FileText, Calendar, Check } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { CreateCampaignForm, WhatsAppTemplate, WhatsAppContact, WhatsAppContactGroup } from '../../../types/whatsapp';
import toast from 'react-hot-toast';

const CampaignBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CreateCampaignForm>({
    wabaId: '',
    name: '',
    type: 'broadcast',
    templateId: '',
    scheduledAt: '',
    variables: {},
    recipientIds: [],
    groupIds: [],
    contactPhones: [],
  });

  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualPhones, setManualPhones] = useState<string>('');

  // Fetch accounts
  const { data: accountsData } = useQuery<any>({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.getAccounts(),
  });

  const accounts = (accountsData as any)?.data?.accounts || [];

  // Fetch templates
  const { data: templatesData } = useQuery<any>({
    queryKey: ['whatsapp-templates', formData.wabaId],
    queryFn: () => whatsappApi.getTemplates({ wabaId: formData.wabaId, status: 'approved' }),
    enabled: !!formData.wabaId,
  });

  const templates = (templatesData as any)?.data || [];

  // Fetch contacts
  const { data: contactsData } = useQuery<any>({
    queryKey: ['whatsapp-contacts', formData.wabaId],
    queryFn: () => whatsappApi.getContacts({ wabaId: formData.wabaId, limit: 1000 }),
    enabled: !!formData.wabaId,
  });

  const contacts = (contactsData as any)?.data || [];

  // Fetch groups
  const { data: groupsData } = useQuery<any>({
    queryKey: ['whatsapp-groups', formData.wabaId],
    queryFn: () => whatsappApi.getContactGroups(formData.wabaId),
    enabled: !!formData.wabaId,
  });

  const groups = (groupsData as any)?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CreateCampaignForm) => whatsappApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns'] });
      toast.success('Campaign created successfully');
      navigate('/whatsapp/campaigns');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create campaign');
    },
  });

  useEffect(() => {
    if (selectedTemplate) {
      setFormData({ ...formData, templateId: selectedTemplate.id });
    }
  }, [selectedTemplate]);

  const handleNext = () => {
    if (step === 1 && !formData.wabaId) {
      toast.error('Please select an account');
      return;
    }
    if (step === 2 && !formData.templateId) {
      toast.error('Please select a template');
      return;
    }
    if (step === 3 && selectedRecipients.length === 0 && selectedGroups.length === 0 && !manualPhones.trim()) {
      toast.error('Please select at least one recipient source');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    const finalData: CreateCampaignForm = {
      ...formData,
      recipientIds: selectedRecipients,
      groupIds: selectedGroups,
      contactPhones: manualPhones.split('\n').map(p => p.trim()).filter(Boolean),
    };

    createMutation.mutate(finalData);
  };

  const steps = [
    { number: 1, title: 'Account & Basic Info' },
    { number: 2, title: 'Select Template' },
    { number: 3, title: 'Select Recipients' },
    { number: 4, title: 'Schedule & Review' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/whatsapp/campaigns')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Campaigns
      </button>

      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-8">
          {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
        </h1>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <React.Fragment key={s.number}>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s.number
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {step > s.number ? <Check className="w-5 h-5" /> : s.number}
                  </div>
                  <span className="ml-2 text-sm text-gray-400 hidden md:inline">{s.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s.number ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Account & Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">
                WhatsApp Business Account <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.wabaId}
                onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select an account</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.waba_id}>
                    {account.account_name} ({account.phone_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Campaign Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Welcome Campaign"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Select Template */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-4">
                Select Template <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {templates.map((template: WhatsAppTemplate) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold">{template.template_name}</h3>
                      {selectedTemplate?.id === template.id && (
                        <Check className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{template.body_text.substring(0, 100)}...</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {template.category} | {template.language}
                    </div>
                  </div>
                ))}
              </div>
              {templates.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No approved templates found. <a href="/whatsapp/templates/new" className="text-blue-400">Create one</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Recipients */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-4">Select Contacts</label>
              <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                {contacts.map((contact: WhatsAppContact) => (
                  <label key={contact.id} className="flex items-center gap-3 p-2 hover:bg-gray-600 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(contact.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecipients([...selectedRecipients, contact.id]);
                        } else {
                          setSelectedRecipients(selectedRecipients.filter(id => id !== contact.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-white">
                      {contact.name || contact.profile_name || contact.phone_number}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-4">Select Groups</label>
              <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                {groups.map((group: WhatsAppContactGroup) => (
                  <label key={group.id} className="flex items-center gap-3 p-2 hover:bg-gray-600 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroups([...selectedGroups, group.id]);
                        } else {
                          setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-white">{group.name} ({group.contact_count} contacts)</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Or Enter Phone Numbers (one per line)</label>
              <textarea
                value={manualPhones}
                onChange={(e) => setManualPhones(e.target.value)}
                placeholder="+1234567890&#10;+0987654321"
                rows={6}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 4: Schedule & Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Schedule (Optional)</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-gray-500 text-sm mt-1">Leave empty to send immediately</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4">Campaign Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Template:</span>
                  <span className="text-white">{selectedTemplate?.template_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Recipients:</span>
                  <span className="text-white">
                    {selectedRecipients.length} contacts, {selectedGroups.length} groups, {manualPhones.split('\n').filter(Boolean).length} manual
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Recipients:</span>
                  <span className="text-white font-semibold">
                    {selectedRecipients.length + 
                     groups.reduce((sum: number, g: WhatsAppContactGroup) => sum + g.contact_count, 0) +
                     manualPhones.split('\n').filter(Boolean).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/whatsapp/campaigns')}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignBuilder;
