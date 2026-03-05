import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Video,
  Plus,
  RefreshCw,
  Settings,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  ChevronRight,
  X,
  ExternalLink,
  Edit,
  Trash2,
  Save,
  UserPlus,
  UserMinus,
  Brain,
  Sparkles,
  Copy,
  Mail,
  Bell,
  Activity,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart3,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import ReminderSettings from '@/components/Calendar/ReminderSettings';
import SmartInsights from '@/components/Calendar/SmartInsights';

interface CalendarAccount {
  connected: boolean;
  email?: string;
  lastSync?: string;
  connectedAt?: string;
}

interface CalendarEvent {
  id: number;
  summary: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  attendees?: any[];
  meet_link?: string;
  html_link?: string;
  status: string;
}

interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  todayEvents: number;
  thisWeekEvents: number;
}

interface MeetingPrep {
  id: number;
  eventId: number;
  meetingSummary: string;
  attendeeContext: any[];
  relatedEmails: any[];
  pastMeetings: any[];
  discussionTopics: string[];
  suggestedQuestions: string[];
  preparationChecklist: string[];
  keyContext: string;
  estimatedPrepTime: number;
  generatedAt: string;
  expiresAt: string;
}

interface CalendarHealth {
  totalMeetings: number;
  totalHours: number;
  backToBackMeetings: number;
  conflictsCount: number;
  overallHealthScore: number;
  balanceScore: number;
  focusTimeScore: number;
  efficiencyScore: number;
}

interface SchedulingSuggestion {
  id: number;
  suggestion_type: string;
  priority: string;
  title: string;
  description: string;
  reasoning: string;
  suggested_action: any;
  status: string;
  created_at: string;
}

interface SchedulingConflict {
  id: number;
  conflict_type: string;
  severity: string;
  description: string;
  suggested_action: string;
  event_summary?: string;
  conflicting_event_summary?: string;
}

const Calendar: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [account, setAccount] = useState<CalendarAccount>({ connected: false });
  const [stats, setStats] = useState<CalendarStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    todayEvents: 0,
    thisWeekEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [view, setView] = useState<'upcoming' | 'today' | 'week'>('upcoming');

  // Create event form state
  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    addMeetLink: false
  });
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Edit event state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    summary: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    attendees: [] as any[]
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');

  // AI Meeting Prep state
  const [showMeetingPrep, setShowMeetingPrep] = useState(false);
  const [meetingPrep, setMeetingPrep] = useState<MeetingPrep | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [prepError, setPrepError] = useState('');
  const [emailingPrep, setEmailingPrep] = useState(false);

  // Reminder Settings state
  const [showReminderSettings, setShowReminderSettings] = useState(false);

  // Smart Scheduling state
  const [showSmartInsights, setShowSmartInsights] = useState(false);
  const [calendarHealth, setCalendarHealth] = useState<CalendarHealth | null>(null);
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    checkAccountStatus();
    
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      alert('✅ Calendar connected successfully!');
      window.history.replaceState({}, '', '/calendar');
      checkAccountStatus();
    } else if (params.get('error')) {
      alert(`❌ Failed to connect calendar: ${params.get('error')}`);
      window.history.replaceState({}, '', '/calendar');
    }
  }, []);

  useEffect(() => {
    if (account.connected) {
      fetchStats();
      fetchUpcomingEvents();
      fetchTodayEvents();
    }
  }, [account.connected]);

  const checkAccountStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/calendar/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccount(data);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/calendar/auth', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        alert('Failed to initiate calendar connection');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      alert('Failed to connect calendar');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your calendar? You can reconnect anytime.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/calendar/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Calendar disconnected successfully!');
        setAccount({ connected: false });
        setStats({ totalEvents: 0, upcomingEvents: 0, todayEvents: 0, thisWeekEvents: 0 });
        setUpcomingEvents([]);
        setTodayEvents([]);
      } else {
        alert('Failed to disconnect calendar');
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      alert('Failed to disconnect calendar');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maxResults: 100, daysAhead: 90 })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Synced ${data.synced} events successfully`);
        fetchStats();
        fetchUpcomingEvents();
        fetchTodayEvents();
      } else {
        const error = await response.json();
        alert(`Sync failed: ${error.error || 'Please try reconnecting'}`);
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      alert('Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/calendar/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/calendar/events/upcoming?limit=20&daysAhead=30', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUpcomingEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
  };

  const fetchTodayEvents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/calendar/events/today', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTodayEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching today events:', error);
    }
  };

  const fetchSmartInsights = async () => {
    try {
      setLoadingInsights(true);
      const token = localStorage.getItem('authToken');

      // Fetch calendar health
      const healthResponse = await fetch('/api/smart-scheduling/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setCalendarHealth(healthData.health);
      }

      // Fetch suggestions
      const suggestionsResponse = await fetch('/api/smart-scheduling/suggestions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        setSuggestions(suggestionsData.suggestions || []);
      }

      // Fetch conflicts
      const conflictsResponse = await fetch('/api/smart-scheduling/conflicts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (conflictsResponse.ok) {
        const conflictsData = await conflictsResponse.json();
        setConflicts(conflictsData.conflicts || []);
      }

    } catch (error) {
      console.error('Error fetching smart insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleAnalyzeCalendar = async () => {
    try {
      setLoadingInsights(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/smart-scheduling/analyze', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchSmartInsights();
        alert('✅ Calendar analyzed successfully!');
      }
    } catch (error) {
      console.error('Error analyzing calendar:', error);
      alert('❌ Failed to analyze calendar');
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleDismissSuggestion = async (suggestionId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/smart-scheduling/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Refresh suggestions
      await fetchSmartInsights();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const handleAcceptSuggestion = async (suggestionId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/smart-scheduling/suggestions/${suggestionId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Refresh suggestions
      await fetchSmartInsights();
      alert('✅ Suggestion accepted!');
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventForm.summary || !eventForm.startTime || !eventForm.endTime) {
      alert('Please fill in title, start time, and end time');
      return;
    }

    try {
      setCreatingEvent(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: eventForm.summary,
          description: eventForm.description,
          location: eventForm.location,
          startTime: new Date(eventForm.startTime).toISOString(),
          endTime: new Date(eventForm.endTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          addMeetLink: eventForm.addMeetLink
        })
      });

      if (response.ok) {
        alert('✅ Event created successfully!');
        setShowCreateModal(false);
        setEventForm({
          summary: '',
          description: '',
          location: '',
          startTime: '',
          endTime: '',
          addMeetLink: false
        });
        fetchStats();
        fetchUpcomingEvents();
        fetchTodayEvents();
      } else {
        const error = await response.json();
        alert(`Failed to create event: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;

    // Convert dates to datetime-local format
    const formatDateTimeLocal = (dateString: string) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setEditForm({
      summary: selectedEvent.summary || '',
      description: selectedEvent.description || '',
      location: selectedEvent.location || '',
      startTime: formatDateTimeLocal(selectedEvent.start_time),
      endTime: formatDateTimeLocal(selectedEvent.end_time),
      attendees: selectedEvent.attendees || []
    });
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent || !editForm.summary || !editForm.startTime || !editForm.endTime) {
      alert('Please fill in title, start time, and end time');
      return;
    }

    try {
      setSavingEvent(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: editForm.summary,
          description: editForm.description,
          location: editForm.location,
          startTime: new Date(editForm.startTime).toISOString(),
          endTime: new Date(editForm.endTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          attendees: editForm.attendees
        })
      });

      if (response.ok) {
        alert('✅ Event updated successfully!');
        setIsEditMode(false);
        setShowEventDetailModal(false);
        setSelectedEvent(null);
        fetchStats();
        fetchUpcomingEvents();
        fetchTodayEvents();
      } else {
        const error = await response.json();
        alert(`Failed to update event: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setNewAttendeeEmail('');
  };

  const handleCancelEvent = async () => {
    if (!selectedEvent) return;

    if (!confirm('Are you sure you want to cancel this event? This will notify all attendees.')) {
      return;
    }

    try {
      setDeletingEvent(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/calendar/events/${selectedEvent.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('✅ Event cancelled successfully!');
        setShowEventDetailModal(false);
        setSelectedEvent(null);
        setIsEditMode(false);
        fetchStats();
        fetchUpcomingEvents();
        fetchTodayEvents();
      } else {
        const error = await response.json();
        alert(`Failed to cancel event: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event');
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    if (!confirm('Are you sure you want to permanently delete this event? This cannot be undone.')) {
      return;
    }

    try {
      setDeletingEvent(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Event deleted successfully!');
        setShowEventDetailModal(false);
        setSelectedEvent(null);
        setIsEditMode(false);
        fetchStats();
        fetchUpcomingEvents();
        fetchTodayEvents();
      } else {
        const error = await response.json();
        alert(`Failed to delete event: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleAddAttendee = () => {
    const email = newAttendeeEmail.trim();
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (editForm.attendees.some((a: any) => (a.email || a) === email)) {
      alert('This attendee is already invited');
      return;
    }

    setEditForm({
      ...editForm,
      attendees: [...editForm.attendees, { email, responseStatus: 'needsAction' }]
    });
    setNewAttendeeEmail('');
  };

  const handleRemoveAttendee = (email: string) => {
    setEditForm({
      ...editForm,
      attendees: editForm.attendees.filter((a: any) => (a.email || a) !== email)
    });
  };

  const handleGenerateMeetingPrep = async () => {
    if (!selectedEvent) return;

    try {
      setLoadingPrep(true);
      setPrepError('');
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/meeting-prep/events/${selectedEvent.id}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMeetingPrep(data.prep);
        setShowMeetingPrep(true);
      } else {
        const error = await response.json();
        setPrepError(error.error || 'Failed to generate meeting prep');
        alert(`Failed to generate meeting prep: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating meeting prep:', error);
      setPrepError('Failed to generate meeting prep');
      alert('Failed to generate meeting prep');
    } finally {
      setLoadingPrep(false);
    }
  };

  const handleCopyPrepToClipboard = () => {
    if (!meetingPrep || !selectedEvent) return;

    const prepText = `
🤖 AI MEETING PREP
📅 ${selectedEvent.summary}
⏰ ${formatEventDate(selectedEvent.start_time)} at ${formatEventTime(selectedEvent.start_time, selectedEvent.end_time, selectedEvent.is_all_day)}

📝 MEETING SUMMARY
${meetingPrep.meetingSummary}

${meetingPrep.discussionTopics.length > 0 ? `💬 DISCUSSION TOPICS
${meetingPrep.discussionTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

` : ''}${meetingPrep.suggestedQuestions.length > 0 ? `❓ SUGGESTED QUESTIONS
${meetingPrep.suggestedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

` : ''}${meetingPrep.preparationChecklist.length > 0 ? `✅ PREPARATION CHECKLIST
${meetingPrep.preparationChecklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

` : ''}⏱️ ESTIMATED PREP TIME: ${meetingPrep.estimatedPrepTime} minutes
`.trim();

    navigator.clipboard.writeText(prepText);
    alert('✅ Meeting prep copied to clipboard!');
  };

  const handleEmailMeetingPrep = async () => {
    if (!selectedEvent) return;

    try {
      setEmailingPrep(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/meeting-prep/events/${selectedEvent.id}/email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\n\nSent to: ${data.emailSentTo}`);
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || 'Failed to send email'}`);
      }
    } catch (error) {
      console.error('Error emailing meeting prep:', error);
      alert('❌ Failed to send email. Please try again.');
    } finally {
      setEmailingPrep(false);
    }
  };

  const formatEventTime = (startTime: string, endTime: string, isAllDay: boolean) => {
    if (isAllDay) {
      return 'All day';
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const timeFormat: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    };

    return `${start.toLocaleTimeString('en-US', timeFormat)} - ${end.toLocaleTimeString('en-US', timeFormat)}`;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Tomorrow';
    } else if (days < 7) {
      return `${days} days`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not connected view
  if (!account.connected) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <CalendarIcon className="h-16 w-16 text-purple-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">AI Calendar</h1>
          <p className="text-gray-400 text-lg">
            Connect your Google Calendar for smart scheduling and AI meeting prep
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Connect Your Google Calendar</h2>
          <p className="text-gray-300 mb-6">
            Connect your calendar to unlock powerful features:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
              <div>
                <h3 className="font-semibold text-white">View Upcoming Events</h3>
                <p className="text-sm text-gray-400">See all your meetings in one place</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
              <div>
                <h3 className="font-semibold text-white">Create Events</h3>
                <p className="text-sm text-gray-400">Schedule meetings with Google Meet links</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
              <div>
                <h3 className="font-semibold text-white">Today's Schedule</h3>
                <p className="text-sm text-gray-400">Quick overview of your day</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
              <div>
                <h3 className="font-semibold text-white">AI Meeting Prep</h3>
                <p className="text-sm text-gray-400">Get prepared with AI insights (Coming Soon)</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2"
          >
            {connecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <CalendarIcon className="h-5 w-5" />
                <span>Connect Google Calendar</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-blue-400" />
            Secure Connection
          </h3>
          <p className="text-sm text-gray-300">
            We use OAuth 2.0 to securely connect to your Google Calendar. We never store your Google password.
            You can disconnect at any time.
          </p>
        </div>
      </div>
    );
  }

  // Connected view
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <CalendarIcon className="h-6 w-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">AI Calendar</h1>
              <p className="text-sm text-gray-400">{account.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>New Event</span>
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <button
             onClick={() => setShowSmartInsights(true)}
             className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 text-cyan-300 rounded-lg border border-cyan-500/20"
             title="Smart Scheduling Insights"
           >
             <Activity className="h-4 w-4" />
             <span>Smart Insights</span>
           </button>
            <button
              onClick={() => setShowReminderSettings(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg"
              title="Reminder Settings"
            >
              <Bell className="h-4 w-4" />
              <span>Reminders</span>
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg"
              title="Disconnect Calendar"
            >
              <Settings className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Stats */}
        <div className="w-64 bg-white/5 backdrop-blur-sm border-r border-white/10 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Statistics</h2>
          
          <div className="space-y-3 mb-6">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Events</span>
                <span className="text-xl font-bold text-purple-400">{stats.totalEvents}</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Upcoming</span>
                <span className="text-xl font-bold text-blue-400">{stats.upcomingEvents}</span>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Today</span>
                <span className="text-xl font-bold text-green-400">{stats.todayEvents}</span>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">This Week</span>
                <span className="text-xl font-bold text-orange-400">{stats.thisWeekEvents}</span>
              </div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4 mt-6">Views</h2>
          <div className="space-y-2">
            <button
              onClick={() => setView('upcoming')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg ${
                view === 'upcoming' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Upcoming</span>
            </button>

            <button
              onClick={() => setView('today')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg ${
                view === 'today' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Today</span>
            </button>

            <button
              onClick={() => setView('week')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg ${
                view === 'week' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>This Week</span>
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            {view === 'upcoming' && 'Upcoming Events'}
            {view === 'today' && "Today's Schedule"}
            {view === 'week' && 'This Week'}
          </h2>

          {view === 'today' && todayEvents.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No events scheduled for today</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-purple-400 hover:text-purple-300"
              >
                Create your first event
              </button>
            </div>
          )}

          {view === 'upcoming' && upcomingEvents.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No upcoming events</p>
              <button
                onClick={handleSync}
                className="mt-4 text-purple-400 hover:text-purple-300"
              >
                Sync calendar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {view === 'upcoming' && upcomingEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventDetailModal(true);
                }}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{event.summary}</h3>
                    
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatEventDate(event.start_time)} at {formatEventTime(event.start_time, event.end_time, event.is_all_day)}</span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{event.attendees.length} attendees</span>
                        </div>
                      )}

                      {event.meet_link && (
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4 text-blue-400" />
                          <a
                            href={event.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Join Google Meet
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}

            {view === 'today' && todayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventDetailModal(true);
                }}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{event.summary}</h3>
                    
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatEventTime(event.start_time, event.end_time, event.is_all_day)}</span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {event.meet_link && (
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4 text-blue-400" />
                          <a
                            href={event.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Join Google Meet
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plus className="h-6 w-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Create New Event</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Event Title *</label>
                <input
                  type="text"
                  value={eventForm.summary}
                  onChange={(e) => setEventForm({ ...eventForm, summary: e.target.value })}
                  placeholder="Team Meeting"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">End Time *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Location (optional)</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Conference Room A or Virtual"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Description (optional)</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Meeting agenda, notes, etc."
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="addMeetLink"
                  checked={eventForm.addMeetLink}
                  onChange={(e) => setEventForm({ ...eventForm, addMeetLink: e.target.checked })}
                  className="w-4 h-4 bg-white/5 border-white/10 rounded"
                />
                <label htmlFor="addMeetLink" className="text-sm text-gray-300 flex items-center space-x-2">
                  <Video className="h-4 w-4 text-blue-400" />
                  <span>Add Google Meet video conferencing</span>
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400">
                  * Required fields
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingEvent}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                  >
                    {creatingEvent ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Create Event</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-lg max-w-2xl w-full">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-6 w-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Event Details</h2>
                </div>
                <button
                  onClick={() => {
                    setShowEventDetailModal(false);
                    setSelectedEvent(null);
                    setShowMeetingPrep(false);
                    setMeetingPrep(null);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Action Buttons (View Mode) */}
              {!isEditMode && (
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleEditClick}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={handleGenerateMeetingPrep}
                      disabled={loadingPrep}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-lg font-semibold"
                    >
                      {loadingPrep ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          <span>AI Meeting Prep</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEvent}
                      disabled={deletingEvent}
                      className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded-lg font-semibold"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel Event</span>
                    </button>
                    <button
                      onClick={handleDeleteEvent}
                      disabled={deletingEvent}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold"
                    >
                      {deletingEvent ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* AI Meeting Prep Panel */}
              {showMeetingPrep && meetingPrep && !isEditMode && (
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-600/30 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-300" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                          <span>AI Meeting Prep</span>
                          <Sparkles className="h-4 w-4 text-yellow-400" />
                        </h3>
                        <p className="text-sm text-gray-400">Generated {new Date(meetingPrep.generatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleCopyPrepToClipboard}
                        className="p-2 hover:bg-purple-600/30 text-purple-300 rounded-lg"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowMeetingPrep(false)}
                        className="p-2 hover:bg-purple-600/30 text-purple-300 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Meeting Summary */}
                  <div className="bg-black/20 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-300 mb-2">📝 MEETING SUMMARY</h4>
                    <p className="text-white">{meetingPrep.meetingSummary}</p>
                  </div>

                  {/* Key Context */}
                  {meetingPrep.keyContext && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-300 mb-2">🔑 KEY CONTEXT</h4>
                      <p className="text-white text-sm">{meetingPrep.keyContext}</p>
                    </div>
                  )}

                  {/* Attendee Context */}
                  {meetingPrep.attendeeContext.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">👥 ATTENDEE INSIGHTS</h4>
                      <div className="space-y-2">
                        {meetingPrep.attendeeContext.map((attendee: any, index: number) => (
                          <div key={index} className="text-sm text-white">
                            <span className="font-medium">{attendee.email}</span>
                            <span className="text-gray-400"> - {attendee.pastMeetingsCount} past meetings, {attendee.recentEmailsCount} recent emails</span>
                            {attendee.lastInteraction && (
                              <span className="text-gray-400"> • Last: {new Date(attendee.lastInteraction).toLocaleDateString()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discussion Topics */}
                  {meetingPrep.discussionTopics.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">💬 DISCUSSION TOPICS</h4>
                      <ul className="space-y-2">
                        {meetingPrep.discussionTopics.map((topic: string, index: number) => (
                          <li key={index} className="flex items-start space-x-2 text-white text-sm">
                            <span className="text-purple-400 font-semibold">{index + 1}.</span>
                            <span>{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Questions */}
                  {meetingPrep.suggestedQuestions.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">❓ SUGGESTED QUESTIONS</h4>
                      <ul className="space-y-2">
                        {meetingPrep.suggestedQuestions.map((question: string, index: number) => (
                          <li key={index} className="flex items-start space-x-2 text-white text-sm">
                            <span className="text-pink-400 font-semibold">{index + 1}.</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preparation Checklist */}
                  {meetingPrep.preparationChecklist.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">✅ PREPARATION CHECKLIST</h4>
                      <ul className="space-y-2">
                        {meetingPrep.preparationChecklist.map((item: string, index: number) => (
                          <li key={index} className="flex items-start space-x-2 text-white text-sm">
                            <input type="checkbox" className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Related Emails */}
                  {meetingPrep.relatedEmails.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">📧 RELATED EMAILS ({meetingPrep.relatedEmails.length})</h4>
                      <div className="space-y-2">
                        {meetingPrep.relatedEmails.slice(0, 5).map((email: any, index: number) => (
                          <div key={index} className="text-sm">
                            <p className="text-white font-medium">{email.subject}</p>
                            <p className="text-gray-400">From: {email.from} • {new Date(email.date).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Meetings */}
                  {meetingPrep.pastMeetings.length > 0 && (
                    <div className="bg-black/20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">📅 PAST MEETINGS ({meetingPrep.pastMeetings.length})</h4>
                      <div className="space-y-2">
                        {meetingPrep.pastMeetings.map((meeting: any, index: number) => (
                          <div key={index} className="text-sm">
                            <p className="text-white font-medium">{meeting.title}</p>
                            <p className="text-gray-400">{new Date(meeting.date).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estimated Prep Time */}
                  <div className="flex items-center justify-between pt-4 border-t border-purple-500/30">
                    <div className="flex items-center space-x-2 text-purple-300">
                      <Clock className="h-5 w-5" />
                      <span className="text-sm font-semibold">Estimated Prep Time: {meetingPrep.estimatedPrepTime} minutes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleCopyPrepToClipboard}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy All</span>
                      </button>
                      <button
                        onClick={handleEmailMeetingPrep}
                        disabled={emailingPrep}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                      >
                        {emailingPrep ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Email Me</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Title */}
              {!isEditMode ? (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedEvent.summary}</h3>
                  {selectedEvent.status && (
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedEvent.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      selectedEvent.status === 'tentative' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedEvent.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={editForm.summary}
                    onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    placeholder="Event title"
                    required
                  />
                </div>
              )}

              {/* Time */}
              {!isEditMode ? (
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Time</p>
                    <p className="text-white font-medium">
                      {formatEventDate(selectedEvent.start_time)} at {formatEventTime(selectedEvent.start_time, selectedEvent.end_time, selectedEvent.is_all_day)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Start Time *</label>
                    <input
                      type="datetime-local"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">End Time *</label>
                    <input
                      type="datetime-local"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Location */}
              {!isEditMode ? (
                selectedEvent.location && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Location</p>
                      <p className="text-white">{selectedEvent.location}</p>
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Location (optional)</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    placeholder="Conference Room A or Virtual"
                  />
                </div>
              )}

              {/* Description */}
              {!isEditMode ? (
                selectedEvent.description && (
                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 mb-2">Description</p>
                      <p className="text-white whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Description (optional)</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="Meeting agenda, notes, etc."
                  />
                </div>
              )}

              {/* Attendees */}
              {!isEditMode ? (
                selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Attendees ({selectedEvent.attendees.length})</p>
                      <div className="space-y-1">
                        {selectedEvent.attendees.map((attendee: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-white">{attendee.email || attendee}</span>
                            {attendee.responseStatus && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                attendee.responseStatus === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                attendee.responseStatus === 'declined' ? 'bg-red-500/20 text-red-400' :
                                attendee.responseStatus === 'tentative' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {attendee.responseStatus}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <label className="block text-sm text-gray-300 mb-3">Attendees (optional)</label>
                  
                  {/* Add Attendee */}
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="email"
                      value={newAttendeeEmail}
                      onChange={(e) => setNewAttendeeEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                      placeholder="attendee@example.com"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttendee}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Attendee List */}
                  {editForm.attendees.length > 0 && (
                    <div className="space-y-2 bg-white/5 border border-white/10 rounded-lg p-4">
                      {editForm.attendees.map((attendee: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-white">{attendee.email || attendee}</span>
                            {attendee.responseStatus && attendee.responseStatus !== 'needsAction' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                attendee.responseStatus === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                attendee.responseStatus === 'declined' ? 'bg-red-500/20 text-red-400' :
                                attendee.responseStatus === 'tentative' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {attendee.responseStatus}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(attendee.email || attendee)}
                            className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Google Meet Link */}
              {selectedEvent.meet_link && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Video className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">Google Meet</p>
                        <p className="text-sm text-gray-400">Video conference available</p>
                      </div>
                    </div>
                    <a
                      href={selectedEvent.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                    >
                      <span>Join Meeting</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Google Calendar Link */}
              {selectedEvent.html_link && (
                <div className="pt-4 border-t border-white/10">
                  <a
                    href={selectedEvent.html_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 text-purple-400 hover:text-purple-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View in Google Calendar</span>
                  </a>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex justify-end pt-4 space-x-3">
                {isEditMode ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEvent || !editForm.summary || !editForm.startTime || !editForm.endTime}
                      className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                    >
                      {savingEvent ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowEventDetailModal(false);
                        setSelectedEvent(null);
                        setShowMeetingPrep(false);
                        setMeetingPrep(null);
                        setIsEditMode(false);
                      }}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold"
                    >
                      Close
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Settings Modal */}
      {showReminderSettings && (
        <ReminderSettings onClose={() => setShowReminderSettings(false)} />
      )}

      {/* Smart Insights Modal */}
      {showSmartInsights && (
        <SmartInsights
          onClose={() => setShowSmartInsights(false)}
          calendarHealth={calendarHealth}
          suggestions={suggestions}
          conflicts={conflicts}
          loading={loadingInsights}
          onAnalyze={handleAnalyzeCalendar}
          onDismissSuggestion={handleDismissSuggestion}
          onAcceptSuggestion={handleAcceptSuggestion}
        />
      )}
    </div>
  );
};

export default Calendar;

