import React from 'react';
import {
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  FileText,
  MessageSquare,
  Clock,
  User
} from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  subject: string;
  notes?: string;
  due_date?: string;
  completed_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type.toLowerCase()) {
      case 'email':
        return <Mail className={iconClass} />;
      case 'call':
        return <Phone className={iconClass} />;
      case 'meeting':
        return <Calendar className={iconClass} />;
      case 'task':
        return <CheckSquare className={iconClass} />;
      case 'note':
        return <FileText className={iconClass} />;
      default:
        return <MessageSquare className={iconClass} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return 'bg-blue-500';
      case 'call':
        return 'bg-green-500';
      case 'meeting':
        return 'bg-purple-500';
      case 'task':
        return 'bg-yellow-500';
      case 'note':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatActivityType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (activities.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No activities yet</p>
        <p className="text-gray-500 text-sm mt-1">Activities will appear here once logged</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-4">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-full ${getActivityColor(activity.type)} text-white flex-shrink-0`}>
              {getActivityIcon(activity.type)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-full bg-gray-700 mt-2" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">
                      {formatActivityType(activity.type)}
                    </span>
                    {activity.type === 'task' && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        activity.status === 'Completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {activity.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-400 text-sm mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDate(activity.created_at)}
                  </div>
                </div>
              </div>

              {/* Subject */}
              <p className="text-white mb-2">{activity.subject}</p>

              {/* Notes/Description */}
              {activity.notes && (
                <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                  {activity.notes}
                </p>
              )}

              {/* Task due date */}
              {activity.type === 'task' && activity.due_date && (
                <div className="mt-2 flex items-center text-gray-400 text-sm">
                  <Calendar className="w-3 h-3 mr-1" />
                  Due: {new Date(activity.due_date).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
