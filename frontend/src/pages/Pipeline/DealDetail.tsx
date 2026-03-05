import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { salesApi, Deal, Lead, Activity } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import ActivityTimeline from '../../components/sales/ActivityTimeline';
import EmailComposeModal from '../../components/sales/EmailComposeModal';
import ScheduleMeetingModal from '../../components/sales/ScheduleMeetingModal';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  Building,
  Mail,
  Phone,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader,
  Plus,
  Eye,
  BarChart3,
  Clock,
  Tag,
  Send
} from 'lucide-react';

const DealDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeModalType, setCloseModalType] = useState<'won' | 'lost'>('won');
  const [lostReason, setLostReason] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadDealDetails(id);
    }
  }, [id]);

  const loadDealDetails = async (dealId: string) => {
    try {
      setLoading(true);
      const [dealData, activitiesData] = await Promise.all([
        salesApi.getDeal(dealId),
        salesApi.getDealActivities(dealId)
      ]);
      
      setDeal(dealData);
      setActivities(activitiesData);

      // Load lead if associated
      if (dealData.lead_id) {
        try {
          const leadData = await salesApi.getLead(dealData.lead_id);
          setLead(leadData);
        } catch (error) {
          console.error('Failed to load associated lead:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load deal details:', error);
      toast.error('Failed to load deal details');
      navigate('/sales/pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deal || !window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await salesApi.deleteDeal(deal.id);
      navigate('/sales/pipeline');
    } catch (error) {
      console.error('Failed to delete deal:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseWon = async () => {
    if (!deal) return;

    try {
      setActionLoading(true);
      const updatedDeal = await salesApi.closeDealWon(deal.id);
      setDeal(updatedDeal);
      setShowCloseModal(false);
      // Reload activities to show the close activity
      const newActivities = await salesApi.getDealActivities(deal.id);
      setActivities(newActivities);
    } catch (error) {
      console.error('Failed to close deal as won:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseLost = async () => {
    if (!deal || !lostReason.trim()) {
      toast.error('Please provide a reason for losing this deal');
      return;
    }

    try {
      setActionLoading(true);
      const updatedDeal = await salesApi.closeDealLost(deal.id, lostReason);
      setDeal(updatedDeal);
      setShowCloseModal(false);
      setLostReason('');
      // Reload activities
      const newActivities = await salesApi.getDealActivities(deal.id);
      setActivities(newActivities);
    } catch (error) {
      console.error('Failed to close deal as lost:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openCloseModal = (type: 'won' | 'lost') => {
    setCloseModalType(type);
    setShowCloseModal(true);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'won':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'lost':
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
          <p className="text-gray-400">Loading deal details...</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Deal Not Found</h2>
          <p className="text-gray-400 mb-4">The deal you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/sales/pipeline')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Pipeline
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
          onClick={() => navigate('/sales/pipeline')}
          className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pipeline
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{deal.deal_name}</h1>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(deal.deal_status)}`}>
                {deal.deal_status}
              </span>
              <span className="text-gray-400 text-sm">
                Created {formatDate(deal.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {deal.deal_status === 'Open' && (
              <>
                <button
                  onClick={() => openCloseModal('won')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Close Won
                </button>
                <button
                  onClick={() => openCloseModal('lost')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Close Lost
                </button>
              </>
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
            <Link
              to={`/sales/deals/${deal.id}/edit`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Overview */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Deal Overview</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Deal Value
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(deal.amount, deal.currency)}
                </div>
              </div>

              <div>
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Win Probability
                </div>
                <div className="text-2xl font-bold text-white">
                  {deal.win_probability}%
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${deal.win_probability}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <Calendar className="w-4 h-4 mr-1" />
                  Expected Close
                </div>
                <div className="text-lg font-semibold text-white">
                  {formatDate(deal.close_date)}
                </div>
              </div>

              <div>
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Weighted Value
                </div>
                <div className="text-lg font-semibold text-white">
                  {formatCurrency(deal.amount * (deal.win_probability / 100), deal.currency)}
                </div>
              </div>

              <div>
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <Clock className="w-4 h-4 mr-1" />
                  Days in Pipeline
                </div>
                <div className="text-lg font-semibold text-white">
                  {Math.floor((new Date().getTime() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>

              <div>
                <div className="flex items-center text-gray-400 text-sm mb-2">
                  <Tag className="w-4 h-4 mr-1" />
                  Stage
                </div>
                <div className="text-lg font-semibold text-white">
                  Stage {deal.stage_id?.substring(0, 8)}
                </div>
              </div>
            </div>

            {deal.deal_status === 'Lost' && deal.lost_reason && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                <h3 className="text-red-400 font-semibold mb-1">Lost Reason</h3>
                <p className="text-gray-300">{deal.lost_reason}</p>
              </div>
            )}
          </div>

          {/* Contact Information */}
          {lead && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Contact Information</h2>
                <Link
                  to={`/sales/leads/${lead.id}`}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Lead
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Contact Name</div>
                    <div className="text-white font-medium">
                      {lead.first_name} {lead.last_name}
                    </div>
                  </div>
                </div>

                {lead.email && (
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-400">Email</div>
                      <a href={`mailto:${lead.email}`} className="text-blue-400 hover:text-blue-300">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}

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
                    <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-400">Job Title</div>
                      <div className="text-white">{lead.job_title}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <TrendingUp className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-400">Lead Score</div>
                    <div className="text-white font-medium">{lead.lead_score}/100</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Activity Timeline</h2>
              <Link
                to={`/sales/activities/new?deal_id=${deal.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Activity
              </Link>
            </div>
            
            <ActivityTimeline activities={activities} />
          </div>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/sales/activities/new?deal_id=${deal.id}&type=email`}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Log Email
              </Link>
              <Link
                to={`/sales/activities/new?deal_id=${deal.id}&type=call`}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Phone className="w-4 h-4 mr-2" />
                Log Call
              </Link>
              <Link
                to={`/sales/activities/new?deal_id=${deal.id}&type=meeting`}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Log Meeting
              </Link>
            </div>
          </div>

          {/* Deal Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Deal Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-400">Deal ID</div>
                <div className="text-white font-mono">{deal.id.substring(0, 8)}...</div>
              </div>
              <div>
                <div className="text-gray-400">Created</div>
                <div className="text-white">{formatDate(deal.created_at)}</div>
              </div>
              <div>
                <div className="text-gray-400">Last Updated</div>
                <div className="text-white">{formatDate(deal.updated_at)}</div>
              </div>
              {lead && (
                <div>
                  <div className="text-gray-400">Lead Source</div>
                  <div className="text-white">{lead.lead_source || 'Unknown'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Close Deal Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              {closeModalType === 'won' ? 'Close Deal as Won' : 'Close Deal as Lost'}
            </h3>
            
            {closeModalType === 'won' ? (
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Are you sure you want to mark this deal as won? This will record the deal value as revenue.
                </p>
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                  <div className="text-green-400 font-semibold mb-1">Deal Value</div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(deal.amount, deal.currency)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Please provide a reason for losing this deal to help improve future sales:
                </p>
                <textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  rows={4}
                  placeholder="e.g., Lost to competitor, Budget constraints, Timing wasn't right..."
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setLostReason('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={closeModalType === 'won' ? handleCloseWon : handleCloseLost}
                disabled={actionLoading || (closeModalType === 'lost' && !lostReason.trim())}
                className={`px-4 py-2 ${
                  closeModalType === 'won' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white rounded-lg font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {actionLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {closeModalType === 'won' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Won
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Mark as Lost
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Compose Modal */}
      <EmailComposeModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        dealId={deal?.id}
        leadId={lead?.id}
        recipientEmail={lead?.email || ''}
        recipientName={`${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || ''}
        companyName={lead?.company_name || ''}
        leadData={lead}
        dealData={deal}
        onEmailSent={() => {
          setShowEmailModal(false);
          if (id) loadDealDetails(id); // Refresh activities after email sent
        }}
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        leadId={lead?.id}
        dealId={deal?.id}
        leadEmail={lead?.email || ''}
        leadName={`${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || ''}
        onMeetingScheduled={() => {
          setShowMeetingModal(false);
          if (id) loadDealDetails(id); // Refresh activities after meeting scheduled
        }}
      />
    </div>
  );
};

export default DealDetail;

