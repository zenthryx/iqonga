import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { getGuideUrl } from '@/utils/domain';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface TeamMember {
  id: string;
  team_id: string;
  agent_id: string;
  agent_name: string;
  avatar_url: string | null;
  sort_order: number;
  role_label: string | null;
}

interface AgentTeam {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
}

interface Agent {
  id: string;
  name: string;
}

const AgentTeams: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [team, setTeam] = useState<AgentTeam | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addAgentId, setAddAgentId] = useState('');

  useEffect(() => {
    fetchTeams();
    fetchAgents();
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchTeam(id);
    } else {
      setTeam(null);
      setLoading(false);
    }
  }, [id]);

  const fetchTeams = async () => {
    try {
      const res: any = await apiService.get('/agent-teams');
      if (res?.success && res?.data) setTeams(res.data);
    } catch {
      toast.error('Failed to load teams');
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

  const fetchTeam = async (teamId: string) => {
    setLoading(true);
    try {
      const res: any = await apiService.get(`/agent-teams/${teamId}`);
      if (res?.success && res?.data) setTeam(res.data);
      else setTeam(null);
    } catch {
      toast.error('Team not found');
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res: any = await apiService.post('/agent-teams', { name: 'New team', description: '' });
      if (res?.success && res?.data?.id) {
        toast.success('Team created');
        navigate(`/teams/${res.data.id}`);
      }
    } catch {
      toast.error('Failed to create team');
    }
  };

  const handleUpdate = async (payload: { name?: string; description?: string }) => {
    if (!team) return;
    try {
      await apiService.put(`/agent-teams/${team.id}`, payload);
      toast.success('Saved');
      setTeam((t) => (t ? { ...t, ...payload } : null));
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!team || !window.confirm('Delete this team?')) return;
    try {
      await apiService.delete(`/agent-teams/${team.id}`);
      toast.success('Team deleted');
      navigate('/teams');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleAddMember = async () => {
    if (!team || !addAgentId) {
      toast.error('Select an agent');
      return;
    }
    try {
      await apiService.post(`/agent-teams/${team.id}/members`, { agent_id: addAgentId });
      toast.success('Agent added to team');
      setShowAddMember(false);
      setAddAgentId('');
      fetchTeam(team.id);
    } catch {
      toast.error('Failed to add agent');
    }
  };

  const handleRemoveMember = async (agentId: string) => {
    if (!team || !window.confirm('Remove this agent from the team?')) return;
    try {
      await apiService.delete(`/agent-teams/${team.id}/members/${agentId}`);
      toast.success('Agent removed');
      fetchTeam(team.id);
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (id && id !== 'new' && loading && !team) {
    return <div className="p-6 text-gray-400">Loading team…</div>;
  }

  if (id && id !== 'new' && team) {
    const members = team.members || [];
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link to="/teams" className="hover:text-white">Teams</Link>
          <ArrowRightIcon className="w-4 h-4" />
          <span className="text-white">{team.name}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{team.name}</h1>
            {team.description && (
              <p className="text-gray-400 mt-1">{team.description}</p>
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
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <PlusIcon className="w-5 h-5" /> Add agent
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
          <input
            type="text"
            value={team.name}
            onChange={(e) => setTeam((t) => (t ? { ...t, name: e.target.value } : null))}
            onBlur={() => handleUpdate({ name: team.name })}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Short name for this team (e.g. Content writers, Support).</p>
          <label className="block text-sm font-medium text-gray-300 mt-3 mb-2">Description (optional)</label>
          <input
            type="text"
            value={team.description || ''}
            onChange={(e) => setTeam((t) => (t ? { ...t, description: e.target.value } : null))}
            onBlur={() => handleUpdate({ description: team.description || '' })}
            className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">What this team is for; used when picking agents in workflow steps.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5" /> Members
          </h2>
          <p className="text-xs text-gray-500 mb-2">Add agents to this team. In workflows you assign one agent per step; teams help you organize which agents to use.</p>
          {members.length === 0 ? (
            <p className="text-gray-400">No agents in this team. Add agents to use this team in workflows.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m, i) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-gray-800/50 border border-gray-700 p-3"
                >
                  <span className="text-gray-300">
                    {i + 1}. {m.agent_name}
                    {m.role_label && <span className="text-gray-500 ml-2">({m.role_label})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.agent_id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Use workflows to run a sequence of steps with different agents. You can assign a workflow to use agents from this team when defining workflow steps.
        </p>

        {showAddMember && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-white mb-4">Add agent to team</h3>
              <p className="text-xs text-gray-500 mb-3">Choose an agent to add. They can be assigned to workflow steps later.</p>
              <select
                value={addAgentId}
                onChange={(e) => setAddAgentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 text-white mb-4"
              >
                <option value="">Select agent</option>
                {agents.filter((a) => !(team.members || []).some((m) => m.agent_id === a.id)).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddMember(false); setAddAgentId(''); }}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
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
          <h1 className="text-3xl font-bold text-white">Agent teams</h1>
          <p className="text-gray-400 mt-1">Group agents for multi-agent workflows.</p>
          <a href={getGuideUrl('agent-teams')} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300 mt-1 inline-block">View guide →</a>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <PlusIcon className="w-5 h-5" /> New team
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : teams.length === 0 ? (
        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-8 text-center">
          <p className="text-gray-400 mb-4">No teams yet.</p>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <PlusIcon className="w-5 h-5" /> Create team
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {teams.map((t) => (
            <li key={t.id}>
              <Link
                to={`/teams/${t.id}`}
                className="block rounded-xl bg-gray-800/50 border border-gray-700 p-4 hover:border-gray-600 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{t.name}</h2>
                    {t.description && (
                      <p className="text-sm text-gray-400 mt-1">{t.description}</p>
                    )}
                  </div>
                  <PencilIcon className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AgentTeams;
