import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { getApiBaseUrl, getGuideUrl } from '@/utils/domain';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ArrowRightIcon,
  ListBulletIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

interface BranchRule {
  condition: string;
  value?: string;
  next_task_id?: string;
}

interface WorkflowTask {
  id: string;
  workflow_id: string;
  sort_order: number;
  name: string;
  agent_id: string | null;
  agent_name: string | null;
  handoff_instructions: string | null;
  task_type?: string;
  sub_workflow_name?: string | null;
  branch_config?: BranchRule[] | null;
}

interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_template?: boolean;
  trigger_type?: string;
  schedule_cron?: string | null;
  webhook_secret?: string | null;
  tasks?: WorkflowTask[];
}

interface Agent {
  id: string;
  name: string;
}

const Workflows: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [taskForm, setTaskForm] = useState({ name: '', agent_id: '', handoff_instructions: '', task_type: 'agent' as string, sub_workflow_id: '', next_step_id: '' });
  const [lastExecution, setLastExecution] = useState<any>(null);
  const [resuming, setResuming] = useState(false);
  const [executions, setExecutions] = useState<any[]>([]);
  const [routerConfigTask, setRouterConfigTask] = useState<WorkflowTask | null>(null);
  const [branchConfig, setBranchConfig] = useState<BranchRule[]>([]);

  useEffect(() => {
    fetchWorkflows();
    fetchAgents();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res: any = await apiService.get('/workflows/templates');
      if (res?.success && res?.data) setTemplates(res.data);
    } catch {
      setTemplates([]);
    }
  };

  useEffect(() => {
    if (id && id !== 'new') {
      fetchWorkflow(id);
      fetchExecutions(id);
    } else {
      setWorkflow(null);
      setExecutions([]);
      setLoading(false);
    }
  }, [id]);

  const fetchExecutions = async (workflowId: string) => {
    try {
      const res: any = await apiService.get(`/workflows/${workflowId}/executions?limit=20`);
      if (res?.success && res?.data) setExecutions(res.data);
      else setExecutions([]);
    } catch {
      setExecutions([]);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const res: any = await apiService.get('/workflows');
      if (res?.success && res?.data) setWorkflows(res.data);
    } catch (e) {
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res: any = await apiService.get('/agents');
      const list = res?.agents ?? res?.data ?? [];
      setAgents(Array.isArray(list) ? list : []);
    } catch {
      setAgents([]);
    }
  };

  const fetchWorkflow = async (workflowId: string) => {
    setLoading(true);
    try {
      const res: any = await apiService.get(`/workflows/${workflowId}`);
      if (res?.success && res?.data) setWorkflow(res.data);
      else setWorkflow(null);
    } catch {
      toast.error('Workflow not found');
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (templateId?: string) => {
    try {
      const res: any = templateId
        ? await apiService.post('/workflows/from-template', { template_id: templateId })
        : await apiService.post('/workflows', { name: 'New workflow', description: '' });
      if (res?.success && res?.data?.id) {
        toast.success('Workflow created');
        setShowCreateModal(false);
        navigate(`/workflows/${res.data.id}`);
      }
    } catch (e) {
      toast.error('Failed to create workflow');
    }
  };

  const handleUpdate = async (payload: Partial<Workflow>) => {
    if (!workflow) return;
    try {
      await apiService.put(`/workflows/${workflow.id}`, payload);
      toast.success('Saved');
      setWorkflow((w) => (w ? { ...w, ...payload } : null));
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!workflow || !window.confirm('Delete this workflow?')) return;
    try {
      await apiService.delete(`/workflows/${workflow.id}`);
      toast.success('Workflow deleted');
      navigate('/workflows');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleAddTask = async () => {
    if (!workflow) return;
    const taskType = taskForm.task_type || 'agent';
    const isAgent = taskType === 'agent';
    const isSubWorkflow = taskType === 'sub_workflow';
    if (isAgent && !taskForm.agent_id) {
      toast.error('Select an agent for agent steps');
      return;
    }
    if (isSubWorkflow && !taskForm.sub_workflow_id) {
      toast.error('Select a workflow for sub-workflow steps');
      return;
    }
    try {
      await apiService.post(`/workflows/${workflow.id}/tasks`, {
        name: taskForm.name || 'Step',
        agent_id: taskForm.agent_id || undefined,
        handoff_instructions: taskForm.handoff_instructions || undefined,
        task_type: taskType,
        sub_workflow_id: isSubWorkflow ? taskForm.sub_workflow_id || undefined : undefined,
        next_step_id: taskType === 'router' && taskForm.next_step_id ? taskForm.next_step_id : undefined,
      });
      toast.success('Task added');
      setShowTaskModal(false);
      setTaskForm({ name: '', agent_id: '', handoff_instructions: '', task_type: 'agent', sub_workflow_id: '', next_step_id: '' });
      fetchWorkflow(workflow.id);
    } catch (e) {
      toast.error('Failed to add task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Remove this step?')) return;
    try {
      await apiService.delete(`/workflows/tasks/${taskId}`);
      if (workflow) fetchWorkflow(workflow.id);
      toast.success('Step removed');
    } catch {
      toast.error('Failed to remove step');
    }
  };

  const handleRun = async () => {
    if (!workflow) return;
    if (!workflow.tasks?.length) {
      toast.error('Add at least one step');
      return;
    }
    setRunning(true);
    try {
      const res: any = await apiService.post(`/workflows/${workflow.id}/run`, {
        input_prompt: inputPrompt || 'Please begin.',
      });
      if (res?.success && res?.data) {
        setLastExecution(res.data);
        fetchExecutions(workflow.id);
        toast.success(res.data.status === 'completed' ? 'Workflow completed' : res.data.status === 'running' ? 'Workflow paused for approval' : 'Workflow finished with errors');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleResume = async (resolution: 'approved' | 'rejected') => {
    if (!lastExecution?.id) return;
    setResuming(true);
    try {
      const res: any = await apiService.post(`/workflows/executions/${lastExecution.id}/resume`, { resolution });
      if (res?.success && res?.data) {
        setLastExecution(res.data);
        if (workflow?.id) fetchExecutions(workflow.id);
        toast.success(resolution === 'approved' ? 'Approved, workflow continued' : 'Rejected');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Resume failed');
    } finally {
      setResuming(false);
    }
  };

  const openRouterConfig = (task: WorkflowTask) => {
    setRouterConfigTask(task);
    setBranchConfig(Array.isArray(task.branch_config) ? task.branch_config.map((b) => ({ ...b })) : []);
  };

  const saveBranchConfig = async () => {
    if (!routerConfigTask || !workflow) return;
    try {
      await apiService.put(`/workflows/tasks/${routerConfigTask.id}`, { branch_config: branchConfig.length ? branchConfig : null });
      toast.success('Branches saved');
      setRouterConfigTask(null);
      fetchWorkflow(workflow.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save branches');
    }
  };

  const loadExecution = async (executionId: string) => {
    try {
      const res: any = await apiService.get(`/workflows/executions/${executionId}`);
      if (res?.success && res?.data) setLastExecution(res.data);
    } catch {
      toast.error('Failed to load run');
    }
  };

  if (id && id !== 'new' && loading && !workflow) {
    return (
      <div className="p-6 text-gray-400">Loading workflow…</div>
    );
  }

  if (id && id !== 'new' && workflow) {
    const tasks = workflow.tasks || [];
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link to="/workflows" className="hover:text-white">Workflows</Link>
          <ArrowRightIcon className="w-4 h-4" />
          <span className="text-white">{workflow.name}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-gray-400 mt-1">{workflow.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDelete()}
              className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <PlusIcon className="w-5 h-5" /> Add step
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => setWorkflow((w) => (w ? { ...w, name: e.target.value } : null))}
            onBlur={() => handleUpdate({ name: workflow.name })}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Short name for this workflow (e.g. Research and Draft, Support Triage).</p>
          <label className="block text-sm font-medium text-gray-300 mt-3 mb-2">Description (optional)</label>
          <input
            type="text"
            value={workflow.description || ''}
            onChange={(e) => setWorkflow((w) => (w ? { ...w, description: e.target.value } : null))}
            onBlur={() => handleUpdate({ description: workflow.description || '' })}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">What this workflow does and when to use it.</p>
          <label className="block text-sm font-medium text-gray-300 mt-3 mb-2">Template</label>
          <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!workflow.is_template}
              onChange={(e) => {
                const v = e.target.checked;
                setWorkflow((w) => (w ? { ...w, is_template: v } : null));
                handleUpdate({ is_template: v });
              }}
              className="rounded border-gray-600 bg-gray-900 text-emerald-600"
            />
            <span>Available as template for others</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">When checked, this workflow appears in the template list when creating a new workflow.</p>
          <label className="block text-sm font-medium text-gray-300 mt-3 mb-2">Trigger</label>
          <select
            value={workflow.trigger_type || 'manual'}
            onChange={(e) => handleUpdate({ trigger_type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-2"
          >
            <option value="manual">Manual only</option>
            <option value="schedule">Schedule (cron)</option>
            <option value="webhook">Webhook</option>
          </select>
          <p className="text-xs text-gray-500 mt-1 mb-2">Manual: run from here or API. Schedule: run at set times. Webhook: run when an external system POSTs to the URL.</p>
          {(workflow.trigger_type || 'manual') === 'schedule' && (
            <>
              <label className="block text-sm text-gray-400 mb-1">Cron (e.g. 0 9 * * 1-5 = 9am weekdays)</label>
              <input
                type="text"
                value={workflow.schedule_cron || ''}
                onChange={(e) => setWorkflow((w) => (w ? { ...w, schedule_cron: e.target.value } : null))}
                onBlur={() => handleUpdate({ schedule_cron: workflow.schedule_cron || '' })}
                placeholder="0 9 * * 1-5"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-2"
              />
              <p className="text-xs text-gray-500 mt-1">Five fields: minute hour day-of-month month day-of-week. Example: 0 9 * * 1-5 = 9:00 AM on weekdays.</p>
            </>
          )}
          {(workflow.trigger_type || 'manual') === 'webhook' && (
            <>
              <label className="block text-sm text-gray-400 mb-1">Webhook secret (optional, for auth)</label>
              <input
                type="text"
                value={workflow.webhook_secret || ''}
                onChange={(e) => setWorkflow((w) => (w ? { ...w, webhook_secret: e.target.value } : null))}
                onBlur={() => handleUpdate({ webhook_secret: workflow.webhook_secret || '' })}
                placeholder="Secret token"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-2"
              />
              <p className="text-xs text-gray-500 mt-1">If set, callers must send this in X-Webhook-Token header or ?token= to trigger the workflow.</p>
              <label className="block text-sm text-gray-400 mb-1">Webhook URL</label>
              <div className="flex gap-2 items-center">
                <code className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-300 text-sm overflow-x-auto">
                  {`${getApiBaseUrl().replace(/\/$/, '')}/workflows/${workflow.id}/trigger`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${getApiBaseUrl().replace(/\/$/, '')}/workflows/${workflow.id}/trigger`;
                    navigator.clipboard.writeText(url).then(() => toast.success('URL copied')).catch(() => toast.error('Copy failed'));
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" /> Copy
                </button>
              </div>
            </>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <ListBulletIcon className="w-5 h-5" /> Steps
          </h2>
          <p className="text-xs text-gray-500 mb-2">Add steps in order. Each step can be an Agent, Approval (human-in-the-loop), Router (branch by condition), or Sub-workflow. Use the pencil on Router steps to configure branches.</p>
          {tasks.length === 0 ? (
            <p className="text-gray-400">No steps yet. Add a step and assign an agent to each.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t, i) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-gray-800/50 border border-gray-700 p-3"
                >
                  <span className="text-gray-300">
                    {i + 1}. {t.name} → <span className="text-emerald-400">{(t.task_type || 'agent') === 'approval' ? 'Approval' : (t.task_type || 'agent') === 'router' ? 'Router' : t.sub_workflow_name || t.agent_name || 'Agent'}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {(t.task_type || 'agent') === 'router' && (
                      <button
                        type="button"
                        onClick={() => openRouterConfig(t)}
                        className="text-amber-400 hover:text-amber-300 p-1"
                        title="Configure branches"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(t.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <PlayIcon className="w-5 h-5" /> Run workflow
          </h2>
          <p className="text-xs text-gray-500 mb-2">Enter an optional initial prompt and click Run. If a step is Approval, the run will pause until you Approve or Reject.</p>
          <textarea
            placeholder="Initial prompt (optional)"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-3 min-h-[80px]"
            rows={3}
          />
          <button
            type="button"
            onClick={handleRun}
            disabled={running || tasks.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run'}
            <PlayIcon className="w-4 h-4" />
          </button>
        </div>

        {executions.length > 0 && (
          <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ListBulletIcon className="w-5 h-5" /> Recent runs
            </h2>
            <ul className="space-y-2 mb-4">
              {executions.slice(0, 10).map((ex: any) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => loadExecution(ex.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${lastExecution?.id === ex.id ? 'bg-indigo-600/30 text-white' : 'bg-gray-900/50 text-gray-300 hover:bg-gray-700/50'}`}
                  >
                    <span className="font-medium">{ex.status}</span>
                    <span className="text-gray-500 ml-2">{ex.started_at ? new Date(ex.started_at).toLocaleString() : '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lastExecution && (
          <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5" /> {lastExecution.id === executions[0]?.id ? 'Last run result' : 'Run result'}
            </h2>
            <p className="text-sm text-gray-400 mb-2">
              Status: {lastExecution.status}
              {lastExecution.duration_ms != null && (
                <span className="ml-2"> · Duration: {lastExecution.duration_ms >= 1000 ? `${(lastExecution.duration_ms / 1000).toFixed(1)}s` : `${lastExecution.duration_ms}ms`}</span>
              )}
            </p>
            {lastExecution.status === 'running' && lastExecution.steps?.some((s: any) => s.status === 'pending_approval') && (
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleResume('approved')}
                  disabled={resuming}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <CheckCircleIcon className="w-5 h-5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleResume('rejected')}
                  disabled={resuming}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                >
                  <XCircleIcon className="w-5 h-5" /> Reject
                </button>
              </div>
            )}
            {lastExecution.steps?.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-sm font-medium text-gray-300">Steps</p>
                {(lastExecution.steps as any[]).map((s: any, idx: number) => {
                  const dur = s.started_at && s.completed_at ? (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) : null;
                  return (
                    <div key={s.id} className="rounded-lg bg-gray-900/70 border border-gray-700 p-3 text-sm">
                      <div className="flex justify-between items-center text-gray-300 mb-1">
                        <span className="font-medium">{s.task_name ?? `Step ${idx + 1}`}</span>
                        <span className="text-gray-500">{s.status}{dur != null ? ` · ${dur}ms` : ''}</span>
                      </div>
                      {s.input_text != null && s.input_text !== '' && (
                        <div className="mt-1">
                          <span className="text-gray-500 text-xs">Input:</span>
                          <pre className="whitespace-pre-wrap text-gray-400 mt-0.5 max-h-24 overflow-auto">{s.input_text.length > 300 ? s.input_text.slice(0, 300) + '…' : s.input_text}</pre>
                        </div>
                      )}
                      {s.output_text != null && s.output_text !== '' && (
                        <div className="mt-1">
                          <span className="text-gray-500 text-xs">Output:</span>
                          <pre className="whitespace-pre-wrap text-gray-400 mt-0.5 max-h-24 overflow-auto">{s.output_text.length > 300 ? s.output_text.slice(0, 300) + '…' : s.output_text}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-900 p-3 rounded-lg max-h-96 overflow-auto">
              {lastExecution.aggregated_output || '(no output)'}
            </pre>
          </div>
        )}

        {routerConfigTask && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
              <h3 className="text-lg font-semibold text-white mb-2">Configure branches: {routerConfigTask.name}</h3>
              <p className="text-sm text-gray-400 mb-4">When the previous step output matches a condition, go to the chosen step. Add a &quot;default&quot; for fallback.</p>
              <div className="space-y-3 mb-4">
                {branchConfig.map((br, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-900 p-3">
                    <select
                      value={br.condition}
                      onChange={(e) => setBranchConfig((prev) => prev.map((b, i) => (i === idx ? { ...b, condition: e.target.value } : b)))}
                      className="px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm"
                    >
                      <option value="output_contains">If output contains</option>
                      <option value="default">Default (else)</option>
                    </select>
                    {br.condition === 'output_contains' && (
                      <input
                        type="text"
                        value={br.value ?? ''}
                        onChange={(e) => setBranchConfig((prev) => prev.map((b, i) => (i === idx ? { ...b, value: e.target.value } : b)))}
                        placeholder="text"
                        className="px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm w-32"
                      />
                    )}
                    <select
                      value={br.next_task_id ?? ''}
                      onChange={(e) => setBranchConfig((prev) => prev.map((b, i) => (i === idx ? { ...b, next_task_id: e.target.value || undefined } : b)))}
                      className="px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm flex-1 min-w-[120px]"
                    >
                      <option value="">— Select step —</option>
                      {(workflow?.tasks ?? []).filter((t) => t.id !== routerConfigTask.id).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setBranchConfig((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1">×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setBranchConfig((prev) => [...prev, { condition: 'output_contains', value: '', next_task_id: '' }])} className="text-sm text-emerald-400 hover:text-emerald-300 mb-4">+ Add branch</button>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRouterConfigTask(null)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700">Cancel</button>
                <button type="button" onClick={saveBranchConfig} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500">Save</button>
              </div>
            </div>
          </div>
        )}

        {showTaskModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-white mb-4">Add step</h3>
              <p className="text-xs text-gray-500 mb-3">Agent: AI runs this step. Approval: pause for human approve/reject. Router: branch by previous output. Sub-workflow: run another workflow here.</p>
              <label className="block text-sm text-gray-400 mb-1">Step type</label>
              <select
                value={taskForm.task_type}
                onChange={(e) => setTaskForm((f) => ({ ...f, task_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-3"
              >
                <option value="agent">Agent</option>
                <option value="approval">Approval (human-in-the-loop)</option>
                <option value="router">Router (branch by condition)</option>
                <option value="sub_workflow">Sub-workflow</option>
              </select>
              <label className="block text-sm text-gray-400 mb-1">Step name</label>
              <input
                type="text"
                value={taskForm.name}
                onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Research"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-3"
              />
              {taskForm.task_type === 'agent' && (
                <>
                  <label className="block text-sm text-gray-400 mb-1">Agent</label>
                  <select
                    value={taskForm.agent_id}
                    onChange={(e) => setTaskForm((f) => ({ ...f, agent_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-3"
                  >
                    <option value="">Select agent</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </>
              )}
              {taskForm.task_type === 'sub_workflow' && (
                <>
                  <label className="block text-sm text-gray-400 mb-1">Workflow</label>
                  <select
                    value={taskForm.sub_workflow_id}
                    onChange={(e) => setTaskForm((f) => ({ ...f, sub_workflow_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-3"
                  >
                    <option value="">Select workflow</option>
                    {workflows.filter((w) => w.id !== workflow?.id).map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </>
              )}
              {taskForm.task_type === 'router' && (workflow?.tasks?.length ?? 0) > 0 && (
                <>
                  <label className="block text-sm text-gray-400 mb-1">Default next step (optional)</label>
                  <select
                    value={taskForm.next_step_id}
                    onChange={(e) => setTaskForm((f) => ({ ...f, next_step_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-3"
                  >
                    <option value="">— None —</option>
                    {(workflow.tasks ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </>
              )}
              <label className="block text-sm text-gray-400 mb-1">Handoff instructions (optional)</label>
              <textarea
                value={taskForm.handoff_instructions}
                onChange={(e) => setTaskForm((f) => ({ ...f, handoff_instructions: e.target.value }))}
                placeholder="e.g. Use the previous summary and draft a 300-word post"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-4"
                rows={2}
              />
              <p className="text-xs text-gray-500 -mt-2 mb-4">Instructions passed to this step; previous step output is appended automatically.</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Workflows</h1>
          <p className="text-gray-400 mt-1">Define multi-step flows and assign an agent to each step.</p>
          <a href={getGuideUrl('workflows')} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300 mt-1 inline-block">View guide →</a>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <PlusIcon className="w-5 h-5" /> New workflow
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : workflows.length === 0 ? (
        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-8 text-center">
          <p className="text-gray-400 mb-4">No workflows yet.</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <PlusIcon className="w-5 h-5" /> Create workflow
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {workflows.map((w) => (
            <li key={w.id}>
              <Link
                to={`/workflows/${w.id}`}
                className="block rounded-xl bg-gray-800/50 border border-gray-700 p-4 hover:border-gray-600 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{w.name}</h2>
                      {w.is_template && <span className="text-xs px-2 py-0.5 rounded bg-amber-600/30 text-amber-300">Template</span>}
                    </div>
                    {w.description && (
                      <p className="text-sm text-gray-400 mt-1">{w.description}</p>
                    )}
                  </div>
                  <PencilIcon className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Create workflow</h3>
            <button
              type="button"
              onClick={() => handleCreate()}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white mb-2"
            >
              <PlusIcon className="w-5 h-5" /> Blank workflow
            </button>
            {templates.length > 0 && (
              <>
                <p className="text-sm text-gray-400 mt-3 mb-2">Or from template:</p>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleCreate(t.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white mb-2"
                  >
                    <DocumentDuplicateIcon className="w-5 h-5" /> {t.name}
                  </button>
                ))}
              </>
            )}
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
