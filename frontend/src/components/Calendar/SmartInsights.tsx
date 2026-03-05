import React from 'react';
import {
  X,
  Activity,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

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

interface SmartInsightsProps {
  onClose: () => void;
  calendarHealth: CalendarHealth | null;
  suggestions: SchedulingSuggestion[];
  conflicts: SchedulingConflict[];
  loading: boolean;
  onAnalyze: () => void;
  onDismissSuggestion: (id: number) => void;
  onAcceptSuggestion: (id: number) => void;
}

const SmartInsights: React.FC<SmartInsightsProps> = ({
  onClose,
  calendarHealth,
  suggestions,
  conflicts,
  loading,
  onAnalyze,
  onDismissSuggestion,
  onAcceptSuggestion
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-500/10';
      case 'high': return 'border-orange-500 bg-orange-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      case 'low': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-purple-500/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 px-6 py-4 border-b border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">📊 Smart Scheduling Insights</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
          {/* Analyze Button */}
          <div className="flex justify-between items-center">
            <p className="text-gray-400">
              AI-powered insights to optimize your calendar and improve productivity
            </p>
            <button
              onClick={onAnalyze}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5" />
                  <span>Analyze Calendar</span>
                </>
              )}
            </button>
          </div>

          {/* Calendar Health */}
          {calendarHealth && (
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <BarChart3 className="h-6 w-6 text-purple-400" />
                <h3 className="text-xl font-bold text-white">Calendar Health Score</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Overall Health */}
                <div className={`${getScoreBg(calendarHealth.overallHealthScore)} rounded-lg p-4 border border-purple-500/20`}>
                  <div className="text-sm text-gray-400 mb-1">Overall Health</div>
                  <div className={`text-3xl font-bold ${getScoreColor(calendarHealth.overallHealthScore)}`}>
                    {calendarHealth.overallHealthScore}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">out of 100</div>
                </div>

                {/* Balance Score */}
                <div className={`${getScoreBg(calendarHealth.balanceScore)} rounded-lg p-4 border border-purple-500/20`}>
                  <div className="text-sm text-gray-400 mb-1">Work Balance</div>
                  <div className={`text-3xl font-bold ${getScoreColor(calendarHealth.balanceScore)}`}>
                    {calendarHealth.balanceScore}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{calendarHealth.totalHours.toFixed(1)}h today</div>
                </div>

                {/* Focus Time */}
                <div className={`${getScoreBg(calendarHealth.focusTimeScore)} rounded-lg p-4 border border-purple-500/20`}>
                  <div className="text-sm text-gray-400 mb-1">Focus Time</div>
                  <div className={`text-3xl font-bold ${getScoreColor(calendarHealth.focusTimeScore)}`}>
                    {calendarHealth.focusTimeScore}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{calendarHealth.totalMeetings} meetings</div>
                </div>

                {/* Efficiency */}
                <div className={`${getScoreBg(calendarHealth.efficiencyScore)} rounded-lg p-4 border border-purple-500/20`}>
                  <div className="text-sm text-gray-400 mb-1">Efficiency</div>
                  <div className={`text-3xl font-bold ${getScoreColor(calendarHealth.efficiencyScore)}`}>
                    {calendarHealth.efficiencyScore}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{calendarHealth.backToBackMeetings} back-to-back</div>
                </div>
              </div>
            </div>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <h3 className="text-xl font-bold text-white">Scheduling Conflicts ({conflicts.length})</h3>
              </div>
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className={`${getSeverityColor(conflict.severity)} border-l-4 rounded-lg p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-semibold text-white uppercase px-2 py-1 bg-white/10 rounded">
                            {conflict.conflict_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-semibold text-white uppercase px-2 py-1 bg-red-500/30 rounded">
                            {conflict.severity}
                          </span>
                        </div>
                        <p className="text-white font-medium mb-1">{conflict.description}</p>
                        <p className="text-sm text-gray-400">💡 {conflict.suggested_action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lightbulb className="h-6 w-6 text-yellow-400" />
                <h3 className="text-xl font-bold text-white">AI Suggestions ({suggestions.length})</h3>
              </div>
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-gray-800/50 border border-blue-500/20 rounded-lg p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority}
                          </span>
                          <Target className="h-4 w-4 text-blue-400" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">{suggestion.title}</h4>
                        <p className="text-gray-300 mb-2">{suggestion.description}</p>
                        <p className="text-sm text-gray-400 italic">💡 {suggestion.reasoning}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => onAcceptSuggestion(suggestion.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => onDismissSuggestion(suggestion.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !calendarHealth && suggestions.length === 0 && conflicts.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-4">No insights yet</p>
              <p className="text-gray-500">Click "Analyze Calendar" to get AI-powered scheduling insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartInsights;

