import React, { useState, useEffect } from 'react';

interface AIAgent {
  id: string;
  name: string;
  personality_type: string;
  voice_tone: string;
  is_active: boolean;
}

interface AssignedDocument {
  id: string;
  title: string;
}

interface AgentKnowledgeAssignment {
  id?: string;
  agent_id: string;
  knowledge_scope: string[];
  custom_instructions: string;
  priority_level: number;
  is_active: boolean;
  agent_name?: string;
  documents?: AssignedDocument[];
  document_ids?: string[];
}

interface CompanyKnowledge {
  profile: any;
  products: any[];
  documents: any[];
  teamMembers: any[];
  achievements: any[];
  web3Details: any;
  customDataSchemas: number;
  customDataEntries: number;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  summary?: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
  assigned?: boolean;
}

const CompanyAgents: React.FC = () => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [assignments, setAssignments] = useState<AgentKnowledgeAssignment[]>([]);
  const [companyKnowledge, setCompanyKnowledge] = useState<CompanyKnowledge>({
    profile: null,
    products: [],
    documents: [],
    teamMembers: [],
    achievements: [],
    web3Details: null,
    customDataSchemas: 0,
    customDataEntries: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string>('');
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [assignmentForm, setAssignmentForm] = useState<AgentKnowledgeAssignment>({
    agent_id: '',
    knowledge_scope: [],
    custom_instructions: '',
    priority_level: 1,
    is_active: true,
    document_ids: []
  });
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');

  // Knowledge scope options
  const knowledgeOptions = [
    { id: 'company_profile', label: 'Company Profile', description: 'Basic company information, brand voice, and target audience' },
    { id: 'products_services', label: 'Products & Services', description: 'Detailed information about company offerings' },
    { id: 'knowledge_documents', label: 'Knowledge Documents', description: 'Uploaded documents and their AI-generated summaries' },
    { id: 'team_members', label: 'Team Members', description: 'Information about team members, roles, and expertise' },
    { id: 'achievements', label: 'Achievements', description: 'Company milestones, awards, and success stories' },
    { id: 'web3_details', label: 'Web3 Details', description: 'Blockchain project information, tokenomics, and DeFi details' },
    { id: 'custom_data', label: 'Custom Data', description: 'Industry-specific data schemas and business information' },
    { id: 'custom_instructions', label: 'Custom Instructions', description: 'Agent-specific guidance and instructions' }
  ];

  // Priority levels
  const priorityLevels = [
    { value: 1, label: 'Low Priority', description: 'Basic knowledge access' },
    { value: 2, label: 'Medium Priority', description: 'Standard knowledge access' },
    { value: 3, label: 'High Priority', description: 'Comprehensive knowledge access' },
    { value: 4, label: 'Critical Priority', description: 'Full knowledge access with custom instructions' }
  ];

  useEffect(() => {
    loadData();
    loadDocuments();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Load agents, assignments, and company knowledge in parallel
      const [agentsResponse, assignmentsResponse, knowledgeResponse] = await Promise.all([
        fetch('/api/company/agents', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/company/agent-knowledge', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/company/knowledge-overview', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        if (agentsData.success) {
          setAgents(agentsData.data.agents || []);
        }
      }

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        if (assignmentsData.success) {
          setAssignments(assignmentsData.data.assignments || []);
        }
      }

      if (knowledgeResponse.ok) {
        const knowledgeData = await knowledgeResponse.json();
        if (knowledgeData.success) {
          setCompanyKnowledge(knowledgeData.data);
        }
      }

    } catch (err) {
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (agentId?: string) => {
    try {
      setDocumentsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const url = agentId ? `/api/company/documents?agentId=${agentId}` : '/api/company/documents';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDocuments(data.data || []);
          if (agentId) {
            const assignedIds = (data.data || [])
              .filter((doc: KnowledgeDocument) => doc.assigned)
              .map((doc: KnowledgeDocument) => doc.id);
            setAssignmentForm(prev => ({ ...prev, document_ids: assignedIds }));
          }
        }
      }
    } catch (err) {
      console.error('Error loading documents', err);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleKnowledgeScopeChange = (scopeId: string, checked: boolean) => {
    setAssignmentForm(prev => ({
      ...prev,
      knowledge_scope: checked 
        ? [...prev.knowledge_scope, scopeId]
        : prev.knowledge_scope.filter(id => id !== scopeId)
    }));
  };

  const handleDocumentSelection = (documentId: string, checked: boolean) => {
    setAssignmentForm(prev => {
      const current = prev.document_ids || [];
      return {
        ...prev,
        document_ids: checked
          ? Array.from(new Set([...current, documentId]))
          : current.filter(id => id !== documentId)
      };
    });
  };

  const handleSelectAllDocuments = () => {
    setAssignmentForm(prev => ({
      ...prev,
      document_ids: documents.map(doc => doc.id)
    }));
  };

  const handleClearDocuments = () => {
    setAssignmentForm(prev => ({
      ...prev,
      document_ids: []
    }));
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignmentForm.agent_id) {
      setError('Please select an agent');
      return;
    }

    if (assignmentForm.knowledge_scope.length === 0) {
      setError('Please select at least one knowledge scope');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/company/assign-to-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...assignmentForm,
          assigned_documents: assignmentForm.document_ids || []
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Agent knowledge assignment created successfully!');
          setShowAssignmentForm(false);
          setAssignmentForm({
            agent_id: '',
            knowledge_scope: [],
            custom_instructions: '',
            priority_level: 1,
            is_active: true,
            document_ids: []
          });
          setSelectedAgent('');
          await loadData(); // Refresh data
        } else {
          setError(result.error || 'Failed to create assignment');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create assignment');
      }
    } catch (err) {
      setError('Error creating assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this knowledge assignment?')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`/api/company/agent-knowledge/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Knowledge assignment removed successfully!');
        await loadData(); // Refresh data
      } else {
        setError('Failed to remove assignment');
      }
    } catch (err) {
      setError('Error removing assignment');
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Unknown Agent';
  };

  const getKnowledgeScopeLabels = (scopeIds: string[]) => {
    return scopeIds.map(id => {
      const option = knowledgeOptions.find(opt => opt.id === id);
      return option ? option.label : id;
    });
  };

  const getPriorityLabel = (level: number) => {
    const priority = priorityLevels.find(p => p.value === level);
    return priority ? priority.label : `Level ${level}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading agent assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Agent Assignment</h2>
          <p className="text-gray-400">Connect your company knowledge to AI agents</p>
        </div>
        <button
          onClick={() => {
            setShowAssignmentForm(true);
            setAssignmentForm({
              agent_id: '',
              knowledge_scope: [],
              custom_instructions: '',
              priority_level: 1,
              is_active: true,
              document_ids: []
            });
            setSelectedAgent('');
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <span>+</span>
          <span>Assign Knowledge</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Company Knowledge Overview */}
      <div className="bg-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Company Knowledge Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏢</span>
              <div>
                <p className="text-white font-medium">Company Profile</p>
                <p className="text-gray-400 text-sm">
                  {companyKnowledge.profile ? 'Available' : 'Not configured'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-white font-medium">Products & Services</p>
                <p className="text-gray-400 text-sm">
                  {companyKnowledge.products.length} products available
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-white font-medium">Knowledge Documents</p>
                <p className="text-gray-400 text-sm">
                  {companyKnowledge.documents.length} documents available
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-white font-medium">Team Members</p>
                <p className="text-gray-400 text-sm">
                  {companyKnowledge.teamMembers.length} members available
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-white font-medium">Achievements</p>
                <p className="text-gray-400 text-sm">
                  {companyKnowledge.achievements.length} achievements available
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⛓️</span>
              <div>
                <p className="text-white font-medium">Web3 Details</p>
                <p className="text-gray-400 text-sm">
                  {companyKnowledge.web3Details ? 'Available' : 'Not configured'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-600 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🗄️</span>
              <div>
                <p className="text-white font-medium">Custom Data</p>
                <p className="text-gray-400 text-sm">
                  {companyKnowledge.customDataSchemas} schemas, {companyKnowledge.customDataEntries} entries
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Knowledge Form */}
      {showAssignmentForm && (
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">Assign Knowledge to Agent</h3>
            <button
              onClick={() => {
                setShowAssignmentForm(false);
                setAssignmentForm({
                  agent_id: '',
                  knowledge_scope: [],
                  custom_instructions: '',
                  priority_level: 1,
                  is_active: true,
                  document_ids: []
                });
                setSelectedAgent('');
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmitAssignment} className="space-y-6">
            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select AI Agent *
              </label>
              <select
                value={assignmentForm.agent_id}
                onChange={(e) => {
                  const newAgentId = e.target.value;
                  setAssignmentForm(prev => ({ ...prev, agent_id: newAgentId }));
                  setSelectedAgent(newAgentId);
                  if (newAgentId) {
                    loadDocuments(newAgentId);
                  } else {
                    loadDocuments();
                    setAssignmentForm(prev => ({ ...prev, document_ids: [] }));
                  }
                }}
                className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Choose an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.personality_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Knowledge Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Knowledge Scope *
              </label>
              <div className="space-y-3">
                {knowledgeOptions.map((option) => (
                  <label key={option.id} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignmentForm.knowledge_scope.includes(option.id)}
                      onChange={(e) => handleKnowledgeScopeChange(option.id, e.target.checked)}
                      className="mt-1 bg-gray-600 border-gray-500 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <p className="text-white font-medium">{option.label}</p>
                      <p className="text-gray-400 text-sm">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Knowledge Documents */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Knowledge Documents
                </label>
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <button
                    type="button"
                    onClick={handleSelectAllDocuments}
                    className="hover:text-white"
                  >
                    Select All
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={handleClearDocuments}
                    className="hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Choose which uploaded documents this agent can access. If none are selected, the agent won&apos;t use any documents.
              </p>

              {documents.length === 0 ? (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm text-gray-400">
                  No knowledge documents uploaded yet. Upload documents in the Knowledge Documents tab to enable agent-specific assignments.
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="max-h-64 overflow-y-auto border border-gray-600 rounded-lg divide-y divide-gray-700">
                    {documentsLoading ? (
                      <div className="p-4 text-center text-gray-400">Loading documents...</div>
                    ) : (
                      documents
                        .filter(doc => doc.title.toLowerCase().includes(documentSearch.toLowerCase()))
                        .map(doc => (
                          <label
                            key={doc.id}
                            className="flex items-start space-x-3 p-4 cursor-pointer hover:bg-gray-600/40 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={assignmentForm.document_ids?.includes(doc.id) || false}
                              onChange={(e) => handleDocumentSelection(doc.id, e.target.checked)}
                              className="mt-1 bg-gray-600 border-gray-500 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-white font-medium">{doc.title}</p>
                                {doc.assigned && selectedAgent && (
                                  <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
                                    Assigned
                                  </span>
                                )}
                              </div>
                              {doc.summary && (
                                <p className="text-gray-400 text-sm line-clamp-2 mt-1">{doc.summary}</p>
                              )}
                            </div>
                          </label>
                        ))
                    )}
                    {documents.filter(doc => doc.title.toLowerCase().includes(documentSearch.toLowerCase())).length === 0 && !documentsLoading && (
                      <div className="p-4 text-center text-gray-400">No documents match your search.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority Level
              </label>
              <select
                value={assignmentForm.priority_level}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, priority_level: parseInt(e.target.value) }))}
                className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {priorityLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Instructions
              </label>
              <textarea
                value={assignmentForm.custom_instructions}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, custom_instructions: e.target.value }))}
                rows={4}
                className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Provide specific instructions for how this agent should use company knowledge..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAssignmentForm(false);
                  setAssignmentForm({
                    agent_id: '',
                    knowledge_scope: [],
                    custom_instructions: '',
                    priority_level: 1,
                    is_active: true
                  });
                  setSelectedAgent('');
                }}
                className="px-6 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <span>Assign Knowledge</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Assignments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Current Assignments ({assignments.length})</h3>
        
        {assignments.length === 0 ? (
          <div className="text-center py-12 bg-gray-700 rounded-xl">
            <div className="text-gray-400 text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Agent Assignments</h3>
            <p className="text-gray-400 mb-4">Start by assigning company knowledge to your AI agents</p>
            <button
              onClick={() => setShowAssignmentForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create First Assignment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-gray-700 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-white">{getAgentName(assignment.agent_id)}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        assignment.is_active 
                          ? 'text-green-400 bg-green-900/20' 
                          : 'text-gray-400 bg-gray-900/20'
                      }`}>
                        {assignment.is_active ? '✅ Active' : '⏸️ Inactive'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-purple-400 bg-purple-900/20">
                        {getPriorityLabel(assignment.priority_level)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                      <div>
                        <span className="font-medium">Knowledge Scope:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getKnowledgeScopeLabels(assignment.knowledge_scope).map((label, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Priority:</span> {getPriorityLabel(assignment.priority_level)}
                      </div>
                      {assignment.documents && assignment.documents.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Documents:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {assignment.documents.map((doc) => (
                              <span key={doc.id} className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">
                                {doc.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => assignment.id && handleDeleteAssignment(assignment.id)}
                    className="text-red-400 hover:text-red-300 transition-colors ml-4"
                    title="Remove Assignment"
                  >
                    🗑️
                  </button>
                </div>

                {/* Custom Instructions */}
                {assignment.custom_instructions && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">Custom Instructions</h5>
                    <p className="text-gray-300 text-sm">{assignment.custom_instructions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyAgents;
