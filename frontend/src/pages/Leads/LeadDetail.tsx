import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { salesApi, Lead, Activity } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import ActivityTimeline from '../../components/sales/ActivityTimeline';
import EmailComposeModal from '../../components/sales/EmailComposeModal';
import ScheduleMeetingModal from '../../components/sales/ScheduleMeetingModal';
import salesCadenceApi from '../../services/salesCadenceApi';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  TrendingUp,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  Tag,
  Plus,
  Loader,
  AlertCircle,
  Send,
  Play,
  X,
  Loader2
} from 'lucide-react';

const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showCadenceModal, setShowCadenceModal] = useState(false);
  const [cadences, setCadences] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) {
      loadLeadDetails(id);
    }
  }, [id]);

  useEffect(() => {
    if (showCadenceModal) {
      loadCadences();
    }
  }, [showCadenceModal]);

  const loadCadences = async () => {
    try {
      const data = await salesCadenceApi.getCadences({ is_active: true });
      setCadences(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load cadences');
    }
  };

  const handleEnroll = async (cadenceId: string) => {
    if (!id) return;
    
    try {
      setEnrolling(true);
      await salesCadenceApi.enrollLead(cadenceId, id);
      toast.success('Lead enrolled in cadence successfully');
      setShowCadenceModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to enroll lead');
    } finally {
      setEnrolling(false);
    }
  };

  const loadLeadDetails = async (leadId: string) => {
    try {
      setLoading(true);
      const [leadData, activitiesData] = await Promise.all([
        salesApi.getLead(leadId),
        salesApi.getLeadActivities(leadId)
      ]);
      
      setLead(leadData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load lead details:', error);
      toast.error('Failed to load lead details');
      navigate('/sales/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleQualify = async () => {
    if (!lead) return;

    try {
      setActionLoading(true);
      await salesApi.qualifyLead(lead.id, {
        notes: 'Qualified from lead detail page'
      });
      await loadLeadDetails(lead.id);
    } catch (error) {
      console.error('Failed to qualify lead:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!lead || !window.confirm('Convert this lead to a deal?')) {
      return;
    }

    try {
      setActionLoading(true);
      const deal = await salesApi.convertLeadToDeal(lead.id, {
        deal_name: `${lead.company_name || lead.first_name + ' ' + lead.last_name} - Deal`,
        amount: 0,
        currency: 'USD'
      });
      navigate(`/sales/deals/${deal.id}`);
    } catch (error) {
      console.error('Failed to convert lead:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lead || !window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await salesApi.deleteLead(lead.id);
      navigate('/sales/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'qualified':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'contacted':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'nurturing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'disqualified':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Lead Not Found</h2>
          <p className="text-gray-400 mb-4">The lead you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/sales/leads')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/sales/leads')}
          className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {lead.first_name} {lead.last_name}
            </h1>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(lead.lead_status)}`}>
                {lead.lead_status}
              </span>
              {lead.is_qualified && (
                <span className="flex items-center text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Qualified
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!lead.is_qualified && (
              <button
                onClick={handleQualify}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Qualify Lead
              </button>
            )}
            {lead.is_qualified && (
              <button
                onClick={handleConvert}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Convert to Deal
              </button>
            )}
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Email
            </button>
            <button
              onClick={() => setShowMeetingModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Meeting
            </button>
            <button
              onClick={() => setShowCadenceModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Enroll in Cadence
            </button>
            <Link
              to={`/sales/leads/${lead.id}/edit`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-400">Full Name</div>
                  <div className="text-white font-medium">
                    {lead.first_name} {lead.last_name}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-400">Email</div>
                  <a href={`mailto:${lead.email}`} className="text-blue-400 hover:text-blue-300">
                    {lead.email}
                  </a>
                </div>
              </div>

              {lead.phone && (
                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Phone</div>
                    <a href={`tel:${lead.phone}`} className="text-blue-400 hover:text-blue-300">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}

              {lead.company_name && (
                <div className="flex items-start">
                  <Building className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Company</div>
                    <div className="text-white font-medium">{lead.company_name}</div>
                  </div>
                </div>
              )}

              {lead.job_title && (
                <div className="flex items-start">
                  <Briefcase className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Job Title</div>
                    <div className="text-white">{lead.job_title}</div>
                  </div>
                </div>
              )}

              {lead.lead_source && (
                <div className="flex items-start">
                  <Tag className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Lead Source</div>
                    <div className="text-white">{lead.lead_source}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lead Score */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Lead Score</h2>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Overall Score</div>
                <div className={`text-4xl font-bold ${getScoreColor(lead.lead_score)}`}>
                  {lead.lead_score}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Out of 100</div>
              </div>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  lead.lead_score >= 80 ? 'bg-green-500' :
                  lead.lead_score >= 60 ? 'bg-yellow-500' :
                  lead.lead_score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${lead.lead_score}%` }}
              />
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Activity Timeline</h2>
              <Link
                to={`/sales/activities/new?lead_id=${lead.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Activity
              </Link>
            </div>
            
            <ActivityTimeline activities={activities} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/sales/activities/new?lead_id=${lead.id}&type=email`}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Log Email
              </Link>
              <Link
                to={`/sales/activities/new?lead_id=${lead.id}&type=call`}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Phone className="w-4 h-4 mr-2" />
                Log Call
              </Link>
              <Link
                to={`/sales/activities/new?lead_id=${lead.id}&type=meeting`}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Log Meeting
              </Link>
            </div>
          </div>

          {/* Lead Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Lead Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-400">Lead ID</div>
                <div className="text-white font-mono">{lead.id.substring(0, 8)}...</div>
              </div>
              <div>
                <div className="text-gray-400">Created</div>
                <div className="text-white">
                  {new Date(lead.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Last Updated</div>
                <div className="text-white">
                  {new Date(lead.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              {lead.last_activity_at && (
                <div>
                  <div className="text-gray-400">Last Activity</div>
                  <div className="text-white">
                    {new Date(lead.last_activity_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Compose Modal */}
      <EmailComposeModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        leadId={lead?.id}
        recipientEmail={lead?.email || ''}
        recipientName={`${lead?.first_name || ''} ${lead?.last_name || ''}`.trim()}
        companyName={lead?.company_name || ''}
        leadData={lead}
        onEmailSent={() => {
          setShowEmailModal(false);
          if (id) loadLeadDetails(id); // Refresh activities after email sent
        }}
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        leadId={lead?.id}
        leadEmail={lead?.email || ''}
        leadName={`${lead?.first_name || ''} ${lead?.last_name || ''}`.trim()}
        onMeetingScheduled={() => {
          setShowMeetingModal(false);
          if (id) loadLeadDetails(id); // Refresh activities after meeting scheduled
        }}
      />

      {/* Enroll in Cadence Modal */}
      {showCadenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Enroll in Sales Cadence</h3>
              <button
                onClick={() => setShowCadenceModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {cadences.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No active cadences</h3>
                <p className="text-gray-400 mb-4">Create a cadence first to enroll this lead</p>
                <Link
                  to="/sales/cadences/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Cadence
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cadences.map((cadence) => (
                  <div
                    key={cadence.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{cadence.cadence_name}</h4>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {cadence.description || 'No description'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                          <span>{cadence.total_steps || 0} steps</span>
                          <span>{cadence.active_enrollments || 0} active</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEnroll(cadence.id)}
                        disabled={enrolling}
                        className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center"
                      >
                        {enrolling ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Enroll
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;
