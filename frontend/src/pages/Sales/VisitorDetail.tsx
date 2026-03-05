import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  Loader2,
  Users,
  Building2,
  Mail,
  Globe,
  Calendar,
  TrendingUp,
  Eye,
  MousePointerClick,
  FileText,
  Video,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import visitorIntelligenceApi from '@/services/visitorIntelligenceApi';

const VisitorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [visitorData, setVisitorData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadVisitorDetails();
    }
  }, [id]);

  const loadVisitorDetails = async () => {
    try {
      setLoading(true);
      const data = await visitorIntelligenceApi.getVisitorDetails(id!);
      setVisitorData(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load visitor details');
      navigate('/sales/visitors');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm('Convert this visitor to a lead?')) {
      return;
    }

    try {
      await visitorIntelligenceApi.convertVisitorToLead(id!, 'manual', 'manual');
      toast.success('Visitor converted to lead successfully');
      loadVisitorDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to convert visitor');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400 bg-green-500/20 border-green-500/50';
    if (score >= 50) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'page_view':
        return <Eye className="w-4 h-4" />;
      case 'click':
        return <MousePointerClick className="w-4 h-4" />;
      case 'form_submit':
        return <FileText className="w-4 h-4" />;
      case 'video_play':
        return <Video className="w-4 h-4" />;
      case 'chat_start':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!visitorData || !visitorData.visitor) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Visitor not found</h3>
          <Link
            to="/sales/visitors"
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Visitors
          </Link>
        </div>
      </div>
    );
  }

  const { visitor, sessions, pageViews, events } = visitorData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/sales/visitors"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {visitor.first_name && visitor.last_name
                ? `${visitor.first_name} ${visitor.last_name}`
                : visitor.email || 'Anonymous Visitor'}
            </h1>
            <p className="text-gray-400">
              {visitor.company_name || visitor.company_domain || 'No company identified'}
            </p>
          </div>
        </div>
        {!visitor.converted_to_lead && (
          <button
            onClick={handleConvert}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Target className="w-5 h-5 mr-2" />
            Convert to Lead
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Overall Score</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className={`text-2xl font-bold px-3 py-1 rounded-full border inline-block ${getScoreColor(visitor.visitor_score || 0)}`}>
            {visitor.visitor_score || 0}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Intent Score</span>
            <Target className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{visitor.intent_score || 0}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Engagement Score</span>
            <Eye className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{visitor.engagement_score || 0}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Visits</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{visitor.total_visits || 1}</div>
        </div>
      </div>

      {/* Visitor Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
          <div className="space-y-3">
            {visitor.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{visitor.email}</span>
              </div>
            )}
            {visitor.company_name && (
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{visitor.company_name}</span>
              </div>
            )}
            {visitor.company_domain && (
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{visitor.company_domain}</span>
              </div>
            )}
            {visitor.job_title && (
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{visitor.job_title}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Visit History</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">First Visit</span>
              <span className="text-gray-300">
                {visitor.first_visit_at
                  ? new Date(visitor.first_visit_at).toLocaleString()
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Last Visit</span>
              <span className="text-gray-300">
                {visitor.last_visit_at
                  ? new Date(visitor.last_visit_at).toLocaleString()
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Sessions</span>
              <span className="text-gray-300">{sessions?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Page Views</span>
              <span className="text-gray-300">{pageViews?.length || 0}</span>
            </div>
            {visitor.converted_to_lead && (
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-green-400 font-medium">Converted to Lead</span>
                <span className="text-gray-300">
                  {visitor.converted_at
                    ? new Date(visitor.converted_at).toLocaleDateString()
                    : '—'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions */}
      {sessions && sessions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Sessions</h2>
          <div className="space-y-3">
            {sessions.map((session: any) => (
              <div
                key={session.id}
                className="p-4 bg-white/5 border border-white/10 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-white font-medium">
                      {new Date(session.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>{session.page_views || 0} pages</span>
                    <span>{session.duration_seconds ? `${Math.round(session.duration_seconds / 60)} min` : '—'}</span>
                    {session.source && <span>{session.source}</span>}
                  </div>
                </div>
                {session.entry_page && (
                  <div className="text-sm text-gray-400">
                    Entry: <span className="text-gray-300">{session.entry_page}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page Views */}
      {pageViews && pageViews.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Page Views</h2>
          <div className="space-y-2">
            {pageViews.slice(0, 10).map((pv: any) => (
              <div
                key={pv.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">{pv.page_title || pv.page_path}</div>
                  <div className="text-sm text-gray-400">{pv.page_url}</div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  {pv.time_on_page > 0 && <span>{pv.time_on_page}s</span>}
                  {pv.scroll_depth > 0 && <span>{pv.scroll_depth}% scroll</span>}
                  <span>{new Date(pv.viewed_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {events && events.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Events</h2>
          <div className="space-y-2">
            {events.slice(0, 10).map((event: any) => (
              <div
                key={event.id}
                className="flex items-center space-x-3 p-3 bg-white/5 border border-white/10 rounded-lg"
              >
                <div className="text-blue-400">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">{event.event_name || event.event_type}</div>
                  {event.event_value && (
                    <div className="text-sm text-gray-400">{event.event_value}</div>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(event.occurred_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorDetail;

