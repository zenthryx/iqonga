import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Mail,
  Phone,
  Clock,
  Settings,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import salesCadenceApi from '@/services/salesCadenceApi';
import salesEmailApi from '@/services/salesEmailApi';

const CadenceBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [cadence, setCadence] = useState({
    cadence_name: '',
    description: '',
    channel: 'email',
    is_active: true,
    auto_stop_on_reply: true,
    auto_stop_on_meeting: true,
    default_delay_days: 2
  });
  const [steps, setSteps] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);

  useEffect(() => {
    if (isEditing) {
      loadCadence();
    }
    loadTemplates();
  }, [id]);

  const loadCadence = async () => {
    try {
      setLoading(true);
      const data = await salesCadenceApi.getCadence(id!);
      setCadence(data);
      const stepsData = await salesCadenceApi.getSteps(id!);
      setSteps(stepsData);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load cadence');
      navigate('/sales/cadences');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await salesEmailApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      // Templates are optional
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let cadenceId = id;

      if (!isEditing) {
        // Create cadence
        const newCadence = await salesCadenceApi.createCadence(cadence);
        cadenceId = newCadence.id;
        toast.success('Cadence created successfully');
      } else {
        // Update cadence
        await salesCadenceApi.updateCadence(id!, cadence);
        toast.success('Cadence updated successfully');
      }

      // Save steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.id && step.id.startsWith('new-')) {
          // New step - create it
          await salesCadenceApi.addStep(cadenceId!, {
            ...step,
            step_order: i + 1
          });
        } else if (step.id) {
          // Existing step - update it
          await salesCadenceApi.updateStep(cadenceId!, step.id, {
            ...step,
            step_order: i + 1
          });
        }
      }

      navigate('/sales/cadences');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save cadence');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = (stepType: string) => {
    const newStep: any = {
      id: `new-${Date.now()}`,
      step_type: stepType,
      step_name: `New ${stepType} step`,
      step_order: steps.length + 1,
      delay_days: cadence.default_delay_days,
      delay_hours: 0
    };

    if (stepType === 'email') {
      newStep.email_subject = '';
      newStep.email_body = '';
      newStep.track_opens = true;
      newStep.track_clicks = true;
    } else if (stepType === 'call_task') {
      newStep.task_subject = '';
      newStep.task_notes = '';
      newStep.task_priority = 'medium';
    } else if (stepType === 'wait') {
      newStep.wait_reason = '';
    }

    setEditingStep(newStep);
    setShowStepModal(true);
  };

  const handleSaveStep = (stepData: any) => {
    if (editingStep.id.startsWith('new-')) {
      setSteps([...steps, stepData]);
    } else {
      setSteps(steps.map(s => s.id === editingStep.id ? stepData : s));
    }
    setShowStepModal(false);
    setEditingStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const handleEditStep = (step: any) => {
    setEditingStep(step);
    setShowStepModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/sales/cadences"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isEditing ? 'Edit Cadence' : 'Create Cadence'}
            </h1>
            <p className="text-gray-400">Build your automated sales sequence</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          Save Cadence
        </button>
      </div>

      {/* Cadence Settings */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Cadence Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cadence Name *
            </label>
            <input
              type="text"
              value={cadence.cadence_name}
              onChange={(e) => setCadence({ ...cadence, cadence_name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              placeholder="e.g., Introduction Sequence"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Channel
            </label>
            <select
              value={cadence.channel}
              onChange={(e) => setCadence({ ...cadence, channel: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="multi_channel">Multi-Channel</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={cadence.description}
              onChange={(e) => setCadence({ ...cadence, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              placeholder="Describe this cadence..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Delay (Days)
            </label>
            <input
              type="number"
              value={cadence.default_delay_days}
              onChange={(e) => setCadence({ ...cadence, default_delay_days: parseInt(e.target.value) || 2 })}
              min="0"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cadence.auto_stop_on_reply}
                onChange={(e) => setCadence({ ...cadence, auto_stop_on_reply: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-white/5 border-white/10 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Auto-stop on reply</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cadence.auto_stop_on_meeting}
                onChange={(e) => setCadence({ ...cadence, auto_stop_on_meeting: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-white/5 border-white/10 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Auto-stop on meeting</span>
            </label>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Sequence Steps</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleAddStep('email')}
              className="inline-flex items-center px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Mail className="w-4 h-4 mr-2" />
              Add Email
            </button>
            <button
              onClick={() => handleAddStep('call_task')}
              className="inline-flex items-center px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4 mr-2" />
              Add Task
            </button>
            <button
              onClick={() => handleAddStep('wait')}
              className="inline-flex items-center px-3 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Clock className="w-4 h-4 mr-2" />
              Add Wait
            </button>
          </div>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No steps yet</h3>
            <p className="text-gray-400 mb-4">Add steps to build your sequence</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center space-x-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {step.step_type === 'email' && <Mail className="w-4 h-4 text-blue-400" />}
                    {step.step_type === 'call_task' && <Phone className="w-4 h-4 text-purple-400" />}
                    {step.step_type === 'wait' && <Clock className="w-4 h-4 text-gray-400" />}
                    <span className="font-medium text-white">{step.step_name}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {step.delay_days > 0 && `Wait ${step.delay_days} day(s)`}
                    {step.delay_hours > 0 && ` ${step.delay_hours} hour(s)`}
                    {step.delay_days === 0 && step.delay_hours === 0 && 'Immediate'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditStep(step)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteStep(step.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step Modal */}
      {showStepModal && editingStep && (
        <StepModal
          step={editingStep}
          templates={templates}
          onSave={handleSaveStep}
          onClose={() => {
            setShowStepModal(false);
            setEditingStep(null);
          }}
        />
      )}
    </div>
  );
};

// Step Configuration Modal
const StepModal: React.FC<{
  step: any;
  templates: any[];
  onSave: (step: any) => void;
  onClose: () => void;
}> = ({ step, templates, onSave, onClose }) => {
  const [stepData, setStepData] = useState(step);

  const handleSave = () => {
    onSave(stepData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-white/10 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">
            {step.id.startsWith('new-') ? 'Add Step' : 'Edit Step'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Step Name *
            </label>
            <input
              type="text"
              value={stepData.step_name}
              onChange={(e) => setStepData({ ...stepData, step_name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Delay (Days)
              </label>
              <input
                type="number"
                value={stepData.delay_days || 0}
                onChange={(e) => setStepData({ ...stepData, delay_days: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Delay (Hours)
              </label>
              <input
                type="number"
                value={stepData.delay_hours || 0}
                onChange={(e) => setStepData({ ...stepData, delay_hours: parseInt(e.target.value) || 0 })}
                min="0"
                max="23"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {stepData.step_type === 'email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Template
                </label>
                <select
                  value={stepData.email_template_id || ''}
                  onChange={(e) => setStepData({ ...stepData, email_template_id: e.target.value || null })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">None (Custom Email)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={stepData.email_subject || ''}
                  onChange={(e) => setStepData({ ...stepData, email_subject: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Email subject line"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Body *
                </label>
                <textarea
                  value={stepData.email_body || ''}
                  onChange={(e) => setStepData({ ...stepData, email_body: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Email body (use {{first_name}}, {{company_name}}, etc. for personalization)"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepData.track_opens !== false}
                    onChange={(e) => setStepData({ ...stepData, track_opens: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-white/5 border-white/10 rounded"
                  />
                  <span className="text-sm text-gray-300">Track opens</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepData.track_clicks !== false}
                    onChange={(e) => setStepData({ ...stepData, track_clicks: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-white/5 border-white/10 rounded"
                  />
                  <span className="text-sm text-gray-300">Track clicks</span>
                </label>
              </div>
            </>
          )}

          {stepData.step_type === 'call_task' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Task Subject *
                </label>
                <input
                  type="text"
                  value={stepData.task_subject || ''}
                  onChange={(e) => setStepData({ ...stepData, task_subject: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g., Call lead to discuss pricing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Task Notes
                </label>
                <textarea
                  value={stepData.task_notes || ''}
                  onChange={(e) => setStepData({ ...stepData, task_notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Task details and talking points"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={stepData.task_priority || 'medium'}
                  onChange={(e) => setStepData({ ...stepData, task_priority: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </>
          )}

          {stepData.step_type === 'wait' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wait Reason
              </label>
              <input
                type="text"
                value={stepData.wait_reason || ''}
                onChange={(e) => setStepData({ ...stepData, wait_reason: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                placeholder="e.g., Wait for response"
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Save Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CadenceBuilder;

