import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Move, Filter, AlertCircle, Palette, Eye, Layers, Clock } from 'lucide-react';

const VisualContentCalendarFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/20 rounded-full mb-6">
            <Calendar className="h-10 w-10 text-cyan-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Visual Content Calendar</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Plan and manage all your scheduled content with a visual calendar interface. Drag-and-drop rescheduling, color-coding, and content gap identification.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Calendar className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Calendar Views</h3>
            <p className="text-gray-300">
              Month, week, and day calendar views. See all your scheduled content at a glance with intuitive navigation.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Move className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Drag-and-Drop Rescheduling</h3>
            <p className="text-gray-300">
              Reschedule posts by simply dragging them to new dates. No need to open edit modals - quick and intuitive.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Palette className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Color-Coding</h3>
            <p className="text-gray-300">
              Posts colored by platform: Twitter (blue), LinkedIn (blue), Instagram (pink), Facebook (blue), YouTube (red). Quick visual identification.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Layers className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Series Visualization</h3>
            <p className="text-gray-300">
              See content series pieces on the calendar. Purple color indicates series content for easy identification.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <AlertCircle className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Content Gaps Identification</h3>
            <p className="text-gray-300">
              Automatically identify days with no scheduled content. Ensure consistent posting and fill content gaps.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Filter className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Advanced Filtering</h3>
            <p className="text-gray-300">
              Filter by platform, agent, or status. Focus on specific content types or view everything at once.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Eye className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Event Details</h3>
            <p className="text-gray-300">
              Click any event to view full details, edit content, or delete. Quick access to all post information.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Clock className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Date Range Optimization</h3>
            <p className="text-gray-300">
              Calendar automatically fetches relevant date ranges. Efficient loading with only necessary data.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Calendar className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Today Navigation</h3>
            <p className="text-gray-300">
              Quick "Today" button to jump to current date. Easy navigation between months with arrow controls.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Planning</h3>
              <p className="text-gray-300 mb-4">
                Visualize your entire content calendar. See content distribution, identify gaps, and plan ahead strategically.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Monthly content planning</li>
                <li>• Content distribution analysis</li>
                <li>• Gap identification and filling</li>
                <li>• Strategic content scheduling</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Quick Rescheduling</h3>
              <p className="text-gray-300 mb-4">
                Reschedule content quickly by dragging to new dates. Perfect for last-minute changes and content adjustments.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Drag-and-drop rescheduling</li>
                <li>• Quick date adjustments</li>
                <li>• No modal dialogs needed</li>
                <li>• Instant updates</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Multi-Platform Management</h3>
              <p className="text-gray-300 mb-4">
                Manage content across all platforms in one calendar view. See Twitter, LinkedIn, Instagram posts together.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Unified content view</li>
                <li>• Platform color-coding</li>
                <li>• Cross-platform planning</li>
                <li>• Consistent posting schedule</li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-3">Content Series Tracking</h3>
              <p className="text-gray-300 mb-4">
                Track content series pieces on the calendar. See how series are distributed and ensure proper sequencing.
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Series visualization</li>
                <li>• Progression tracking</li>
                <li>• Series scheduling</li>
                <li>• Content flow management</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-cyan-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">View Calendar</h3>
              <p className="text-gray-400 text-sm">
                Open Content Calendar to see all scheduled posts in month view. Posts appear on their scheduled dates.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-cyan-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Filter Content</h3>
              <p className="text-gray-400 text-sm">
                Use filters to focus on specific platforms, agents, or statuses. View only what you need.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-cyan-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Reschedule Posts</h3>
              <p className="text-gray-400 text-sm">
                Drag posts to new dates to reschedule. System automatically updates scheduled_time in the database.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-cyan-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Identify Gaps</h3>
              <p className="text-gray-400 text-sm">
                Review content gaps alert to see days with no scheduled content. Fill gaps to ensure consistent posting.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Plan Your Content?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Visualize and manage all your scheduled content with drag-and-drop calendar interface.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/content-calendar"
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Content Calendar
            </Link>
            <Link
              to="/how-to"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Learn How to Use
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualContentCalendarFeature;

