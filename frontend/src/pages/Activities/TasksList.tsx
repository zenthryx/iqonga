import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesApi, Activity } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import {
  CheckSquare,
  Plus,
  Calendar,
  User,
  Filter,
  Search,
  Loader,
  Check,
  Clock,
  AlertCircle,
  ArrowRight,
  Trash2
} from 'lucide-react';

const TasksList: React.FC = () => {
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    date_from: '',
    date_to: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [filters, pagination.page]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await salesApi.getActivities(
        {
          type: 'task',
          status: filters.status || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined
        },
        pagination.page,
        pagination.limit
      );
      
      let tasksData = response.data;

      // Client-side search filtering if needed
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        tasksData = tasksData.filter(task =>
          task.subject?.toLowerCase().includes(searchLower) ||
          task.notes?.toLowerCase().includes(searchLower)
        );
      }

      setTasks(tasksData);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await salesApi.completeTask(taskId);
      // Reload tasks to reflect the change
      await loadTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      setActionLoading(taskId);
      await salesApi.deleteActivity(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/50',
          icon: Check
        };
      case 'In Progress':
        return {
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/50',
          icon: Clock
        };
      case 'Pending':
      default:
        return {
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          border: 'border-gray-500/50',
          icon: Clock
        };
    }
  };

  const getPriorityBadge = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return { label: 'Overdue', color: 'text-red-400', icon: AlertCircle };
    } else if (daysUntilDue === 0) {
      return { label: 'Due Today', color: 'text-orange-400', icon: AlertCircle };
    } else if (daysUntilDue <= 2) {
      return { label: 'Due Soon', color: 'text-yellow-400', icon: Clock };
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Calculate statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    overdue: tasks.filter(t => {
      if (t.status === 'Completed' || !t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tasks Management</h1>
          <p className="text-gray-400">Manage your sales tasks and to-dos</p>
        </div>
        <Link
          to="/sales/activities/new?type=task"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Tasks</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Pending</div>
          <div className="text-2xl font-bold text-gray-400">{stats.pending}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">In Progress</div>
          <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="From date"
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No tasks found</h3>
            <p className="text-gray-400 mb-4">
              {filters.search || filters.status 
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'
              }
            </p>
            <Link
              to="/sales/activities/new?type=task"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {tasks.map((task) => {
              const statusBadge = getStatusBadge(task.status);
              const priorityBadge = task.due_date ? getPriorityBadge(task.due_date) : null;
              const StatusIcon = statusBadge.icon;

              return (
                <div
                  key={task.id}
                  className="p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    {/* Complete Checkbox */}
                    <button
                      onClick={() => task.status !== 'Completed' && handleCompleteTask(task.id)}
                      disabled={task.status === 'Completed' || actionLoading === task.id}
                      className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        task.status === 'Completed'
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-500 hover:border-blue-500'
                      } ${actionLoading === task.id ? 'opacity-50' : ''}`}
                    >
                      {actionLoading === task.id ? (
                        <Loader className="w-3 h-3 text-white animate-spin" />
                      ) : task.status === 'Completed' ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : null}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold mb-1 ${
                            task.status === 'Completed' 
                              ? 'text-gray-500 line-through' 
                              : 'text-white'
                          }`}>
                            {task.subject}
                          </h3>
                          {task.notes && (
                            <p className="text-gray-400 text-sm mb-2">{task.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {/* Status Badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} flex items-center`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {task.status}
                        </span>

                        {/* Priority Badge */}
                        {priorityBadge && task.status !== 'Completed' && (
                          <span className={`flex items-center ${priorityBadge.color} font-medium`}>
                            <priorityBadge.icon className="w-4 h-4 mr-1" />
                            {priorityBadge.label}
                          </span>
                        )}

                        {/* Due Date */}
                        {task.due_date && (
                          <span className="flex items-center text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(task.due_date)} at {formatTime(task.due_date)}
                          </span>
                        )}

                        {/* Associated with */}
                        {(task.lead_id || task.deal_id) && (
                          <span className="flex items-center text-gray-400">
                            <User className="w-4 h-4 mr-1" />
                            {task.lead_id ? 'Lead' : 'Deal'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {task.lead_id && (
                        <Link
                          to={`/sales/leads/${task.lead_id}`}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="View Lead"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      )}
                      {task.deal_id && (
                        <Link
                          to={`/sales/deals/${task.deal_id}`}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="View Deal"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={actionLoading === task.id}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete Task"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && tasks.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} tasks
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksList;

