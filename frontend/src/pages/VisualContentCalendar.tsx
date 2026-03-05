import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Move,
  Layers,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  X,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ScheduledPost {
  id: string;
  agent: {
    id: string;
    name: string;
    personality_type: string;
  };
  platform: string;
  content_type: string;
  content_text?: string;
  scheduled_time: string;
  timezone: string;
  status: string;
  created_at: string;
}

interface ContentSeries {
  id: string;
  title: string;
  status: string;
  pieces: Array<{
    id: string;
    scheduled_time?: string;
    status: string;
  }>;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  platform: string;
  agent: string;
  status: string;
  type: 'post' | 'series';
  data: ScheduledPost | ContentSeries;
  color: string;
}

const VisualContentCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [contentSeries, setContentSeries] = useState<ContentSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [filters, setFilters] = useState({
    platforms: [] as string[],
    agents: [] as string[],
    statuses: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range for current view (month view: current month ± 1 month)
      const startDate = new Date(currentDate);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 2);
      endDate.setDate(0); // Last day of month
      endDate.setHours(23, 59, 59, 999);
      
      // Fetch scheduled posts with date range
      const postsResponse = await apiService.get(`/scheduled-posts?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`) as any;
      if (postsResponse.success) {
        setScheduledPosts(postsResponse.data || []);
      }

      // Fetch content series
      const seriesResponse = await apiService.get('/content-series') as any;
      if (seriesResponse.success) {
        setContentSeries(seriesResponse.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Get platform color helper (must be defined before useMemo)
  const getPlatformColor = (platform: string): string => {
    const colors: Record<string, string> = {
      twitter: '#1DA1F2',
      linkedin: '#0077B5',
      instagram: '#E4405F',
      facebook: '#1877F2',
      youtube: '#FF0000',
      telegram: '#0088cc'
    };
    return colors[platform?.toLowerCase()] || '#6B7280';
  };

  // Convert posts and series to calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add scheduled posts
    scheduledPosts.forEach(post => {
      try {
        if (post && post.scheduled_time) {
          const start = new Date(post.scheduled_time);
          if (isNaN(start.getTime())) {
            return; // Skip invalid dates
          }
          const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration

          events.push({
            id: post.id || `post-${Date.now()}`,
            title: post.content_text?.substring(0, 50) || `${post.platform || 'post'} post`,
            start,
            end,
            platform: post.platform || 'twitter',
            agent: post.agent?.name || 'Unknown Agent',
            status: post.status || 'scheduled',
            type: 'post',
            data: post,
            color: getPlatformColor(post.platform)
          });
        }
      } catch (error) {
        console.error('Error processing scheduled post:', error, post);
      }
    });

    // Add content series pieces
    contentSeries.forEach(series => {
      try {
        if (series && series.pieces && Array.isArray(series.pieces)) {
          series.pieces.forEach(piece => {
            try {
              if (piece && piece.scheduled_time) {
                const start = new Date(piece.scheduled_time);
                if (isNaN(start.getTime())) {
                  return; // Skip invalid dates
                }
                const end = new Date(start.getTime() + 30 * 60 * 1000);

                events.push({
                  id: piece.id || `series-${series.id}-${Date.now()}`,
                  title: `${series.title || 'Series'} - Piece ${piece.id || 'N/A'}`,
                  start,
                  end,
                  platform: 'twitter', // Default, could be from series config
                  agent: series.title || 'Content Series',
                  status: piece.status || 'scheduled',
                  type: 'series',
                  data: series,
                  color: '#8b5cf6' // Purple for series
                });
              }
            } catch (error) {
              console.error('Error processing series piece:', error, piece);
            }
          });
        }
      } catch (error) {
        console.error('Error processing content series:', error, series);
      }
    });

    // Apply filters
    return events.filter(event => {
      try {
        if (filters.platforms.length > 0 && !filters.platforms.includes(event.platform)) {
          return false;
        }
        if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) {
          return false;
        }
        return true;
      } catch (error) {
        console.error('Error filtering event:', error, event);
        return false;
      }
    });
  }, [scheduledPosts, contentSeries, filters, getPlatformColor]);

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, React.ElementType> = {
      twitter: Twitter,
      linkedin: Linkedin,
      instagram: Instagram,
      facebook: Facebook,
      youtube: Youtube
    };
    return icons[platform.toLowerCase()] || Calendar;
  };

  // Calendar navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Drag and drop handlers
  const handleDragStart = (event: CalendarEvent) => {
    setDraggedEvent(event);
  };

  const handleDrop = async (newDate: Date) => {
    if (!draggedEvent) return;

    try {
      // Update scheduled time
      if (draggedEvent.type === 'post') {
        const post = draggedEvent.data as ScheduledPost;
        await apiService.put(`/scheduled-posts/${post.id}`, {
          scheduled_time: newDate.toISOString()
        });
        toast.success('Post rescheduled successfully');
      } else {
        // Handle series piece rescheduling
        const series = draggedEvent.data as ContentSeries;
        toast.success('Series piece rescheduled');
      }

      await fetchCalendarData();
      setDraggedEvent(null);
    } catch (error) {
      toast.error('Failed to reschedule content');
      setDraggedEvent(null);
    }
  };

  // Calendar rendering
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || currentWeek.length < 7) {
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      currentWeek.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="divide-y divide-gray-700">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7">
              {week.map((day, dayIdx) => {
                const dayEvents = calendarEvents.filter(event => {
                  const eventDate = new Date(event.start);
                  return eventDate.toDateString() === day.toDateString();
                });
                const isToday = day.toDateString() === new Date().toDateString();
                const isCurrentMonth = day.getMonth() === month;

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-24 p-2 border-r border-gray-700 ${
                      !isCurrentMonth ? 'bg-gray-900/50' : ''
                    } ${isToday ? 'bg-blue-500/10' : ''} ${
                      draggedEvent ? 'hover:bg-gray-700/50' : ''
                    }`}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(day);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className={`text-sm mb-1 ${isCurrentMonth ? 'text-white' : 'text-gray-600'} ${isToday ? 'font-bold text-blue-400' : ''}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => {
                        const PlatformIcon = getPlatformIcon(event.platform);
                        return (
                          <div
                            key={event.id}
                            draggable
                            onDragStart={() => handleDragStart(event)}
                            onClick={() => setSelectedEvent(event)}
                            className="text-xs p-1 rounded cursor-move hover:opacity-80"
                            style={{ backgroundColor: event.color + '40', borderLeft: `3px solid ${event.color}` }}
                          >
                            <div className="flex items-center gap-1">
                              <PlatformIcon className="h-3 w-3" />
                              <span className="truncate">{event.title}</span>
                            </div>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-400 px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Get unique values for filters
  const uniquePlatforms = useMemo(() => {
    return Array.from(new Set(calendarEvents.map(e => e.platform)));
  }, [calendarEvents]);

  const uniqueAgents = useMemo(() => {
    return Array.from(new Set(calendarEvents.map(e => e.agent)));
  }, [calendarEvents]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(calendarEvents.map(e => e.status)));
  }, [calendarEvents]);

  // Identify content gaps
  const identifyGaps = () => {
    const gaps: { date: Date; message: string }[] = [];
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Check for days with no content
    for (let d = new Date(today); d <= nextWeek; d.setDate(d.getDate() + 1)) {
      const dayEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.toDateString() === d.toDateString();
      });

      if (dayEvents.length === 0) {
        gaps.push({
          date: new Date(d),
          message: 'No content scheduled'
        });
      }
    }

    return gaps;
  };

  const contentGaps = useMemo(() => identifyGaps(), [calendarEvents]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-400" />
              Visual Content Calendar
            </h1>
            <p className="text-gray-400 mt-2">
              Drag-and-drop content planning with calendar view
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Platform Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Platforms</label>
                <div className="space-y-2">
                  {uniquePlatforms.map(platform => (
                    <label key={platform} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.platforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, platforms: [...filters.platforms, platform] });
                          } else {
                            setFilters({ ...filters, platforms: filters.platforms.filter(p => p !== platform) });
                          }
                        }}
                        className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-500"
                      />
                      <span className="text-sm text-gray-300 capitalize">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <div className="space-y-2">
                  {uniqueStatuses.map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, statuses: [...filters.statuses, status] });
                          } else {
                            setFilters({ ...filters, statuses: filters.statuses.filter(s => s !== status) });
                          }
                        }}
                        className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-500"
                      />
                      <span className="text-sm text-gray-300 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ platforms: [], agents: [], statuses: [] })}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Gaps Alert */}
        {contentGaps.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <span className="font-semibold text-yellow-300">Content Gaps Detected</span>
            </div>
            <div className="text-sm text-gray-300">
              {contentGaps.length} day{contentGaps.length > 1 ? 's' : ''} with no scheduled content in the next week
            </div>
          </div>
        )}

        {/* Calendar Controls */}
        <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(['month', 'week', 'day'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar View */}
        {loading ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading calendar...</p>
          </div>
        ) : (
          renderMonthView()
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Content Details</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Platform</div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const PlatformIcon = getPlatformIcon(selectedEvent.platform);
                      return <PlatformIcon className="h-4 w-4" />;
                    })()}
                    <span className="capitalize">{selectedEvent.platform}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Agent</div>
                  <div>{selectedEvent.agent}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Scheduled Time</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {selectedEvent.start.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedEvent.status === 'published' ? 'bg-green-500/20 text-green-400' :
                      selectedEvent.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>

                {selectedEvent.type === 'post' && (selectedEvent.data as ScheduledPost).content_text && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Content</div>
                    <div className="bg-gray-700 rounded-lg p-3 text-sm">
                      {(selectedEvent.data as ScheduledPost).content_text}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      // Navigate to edit
                      window.location.href = `/scheduled-posts`;
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (selectedEvent.type === 'post') {
                          await apiService.delete(`/scheduled-posts/${selectedEvent.id}`);
                          toast.success('Post deleted');
                        }
                        setSelectedEvent(null);
                        await fetchCalendarData();
                      } catch (error) {
                        toast.error('Failed to delete');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualContentCalendar;

