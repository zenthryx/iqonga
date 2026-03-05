import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  CheckSquare,
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  FileText,
  Award,
  Zap,
  CheckCircle2,
  ArrowRight,
  Filter,
  Search,
  Tag,
  Clock,
  Activity
} from 'lucide-react';

const SalesCRMFeature: React.FC = () => {
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Lead Management',
      description: 'Capture, organize, and nurture your sales leads with intelligent tracking and scoring',
      details: [
        'Create leads with comprehensive contact info',
        'Real-time duplicate detection by email',
        'Automatic lead scoring (0-100)',
        'BANT qualification tracking',
        'Lead source tracking (Website, Referral, etc.)',
        'Custom tags and notes organization'
      ]
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Visual Sales Pipeline',
      description: 'Drag-and-drop Kanban board to visualize and manage deals through every stage',
      details: [
        '7 pipeline stages (Lead → Closed Won/Lost)',
        'Drag & drop deal movement',
        'Multi-currency deal tracking',
        'Win probability calculation',
        'Weighted pipeline value',
        'Stage progression history'
      ]
    },
    {
      icon: <CheckSquare className="w-6 h-6" />,
      title: 'Activity & Task Tracking',
      description: 'Log every interaction and never miss a follow-up with comprehensive activity management',
      details: [
        'Log emails, calls, meetings, tasks, notes',
        'One-click task completion',
        'Priority levels (High, Medium, Low)',
        'Due date tracking with overdue detection',
        'Activity timeline for leads/deals',
        'Task assignment to team members'
      ]
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Sales Dashboard & Analytics',
      description: 'Make data-driven decisions with comprehensive sales insights and metrics',
      details: [
        'Total leads & qualified leads metrics',
        'Pipeline value tracking',
        'Close rate percentage',
        'Revenue chart over time',
        'Lead sources distribution',
        'Conversion funnel visualization'
      ]
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'BANT Qualification',
      description: 'Qualify leads systematically with Budget, Authority, Need, Timeline framework',
      details: [
        'Budget qualification checkbox',
        'Authority verification tracking',
        'Need assessment documentation',
        'Timeline entry and tracking',
        'Qualification notes and history',
        'Automatic qualified lead status'
      ]
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Advanced Search & Filters',
      description: 'Find leads and deals quickly with powerful search and filtering capabilities',
      details: [
        'Search by name, email, company',
        'Filter by status and source',
        'Filter by qualification status',
        'Minimum lead score filtering',
        'Activity type filtering',
        'Date range filtering'
      ]
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Deal Value Tracking',
      description: 'Track deal values with multi-currency support and win probability calculations',
      details: [
        'Multi-currency support (USD, EUR, GBP, etc.)',
        'Deal amount tracking',
        'Expected close date monitoring',
        'Win probability by stage',
        'Weighted value calculation',
        'Total pipeline value aggregation'
      ]
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Sales Forecasting',
      description: 'Predict future revenue based on pipeline data and win probabilities',
      details: [
        'Automatic win probability by stage',
        'Weighted pipeline value',
        'Close date tracking',
        'Revenue forecasting',
        'Pipeline by stage analysis',
        'Win/loss ratio tracking'
      ]
    },
    {
      icon: <Tag className="w-6 h-6" />,
      title: 'Custom Tags & Notes',
      description: 'Organize leads and deals with custom tags and detailed notes',
      details: [
        'Unlimited custom tags',
        'Tag-based filtering',
        'Detailed notes fields',
        'Note history tracking',
        'Tag color coding',
        'Quick tag search'
      ]
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Overdue Task Detection',
      description: 'Never miss a follow-up with automatic overdue task detection and highlighting',
      details: [
        'Automatic overdue detection',
        'Red highlighting for overdue tasks',
        'Due date reminders',
        'Task priority management',
        'Overdue task dashboard',
        'Task completion tracking'
      ]
    },
    {
      icon: <Activity className="w-6 h-6" />,
      title: 'Activity Timeline',
      description: 'Complete chronological history of all interactions with leads and deals',
      details: [
        'Chronological activity feed',
        'Activity type icons',
        'Timestamp tracking',
        'Activity search',
        'Activity filtering',
        'Export activity history'
      ]
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lead-to-Deal Conversion',
      description: 'Seamlessly convert qualified leads into deals with one click',
      details: [
        'One-click conversion',
        'Automatic data transfer',
        'Deal creation from lead',
        'Lead history preservation',
        'Conversion tracking',
        'Conversion rate analytics'
      ]
    }
  ];

  const useCases = [
    {
      title: 'Sales Teams',
      description: 'Manage your entire sales pipeline from prospecting to close with complete visibility',
      icon: '👥'
    },
    {
      title: 'Crypto Projects',
      description: 'Track investor leads, partnership deals, and community engagement opportunities',
      icon: '🚀'
    },
    {
      title: 'Agencies',
      description: 'Manage client leads, project deals, and ongoing client relationships in one place',
      icon: '🏢'
    },
    {
      title: 'Freelancers',
      description: 'Track project leads, proposal stages, and client communications efficiently',
      icon: '💼'
    }
  ];

  const stats = [
    { label: 'Lead Score Range', value: '0-100' },
    { label: 'Pipeline Stages', value: '7' },
    { label: 'Activity Types', value: '5' },
    { label: 'Multi-Currency', value: 'Yes' }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-blue-600/20 to-purple-600/20" />
        <div className="relative bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-2xl p-8 md:p-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <TrendingUp className="w-8 h-8 text-green-300" />
            </div>
            <div className="bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
              <span className="text-green-300 text-sm font-medium">✅ Available Now</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Sales & CRM
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            Complete sales management solution integrated directly into Ajentrix. Manage your entire sales pipeline 
            from lead capture to deal close, with powerful automation, intelligent insights, and seamless integration 
            with your marketing activities.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/sales/dashboard"
              className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Go to Sales Dashboard
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/how-to"
              className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors"
            >
              View How-To Guide
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* What Makes It Special */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
          <Zap className="w-6 h-6 mr-3 text-green-400" />
          What Makes Our Sales & CRM Special
        </h2>
        <div className="grid md:grid-cols-2 gap-6 text-gray-300">
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Built-In Integration:</span> Fully integrated with Ajentrix's email, calendar, and marketing features - no external tools needed.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Intelligent Lead Scoring:</span> Automatic lead scoring based on engagement, qualification status, and activity history.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Visual Pipeline:</span> Drag-and-drop Kanban board makes deal management intuitive and efficient.
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">No Extra Cost:</span> Included with your Ajentrix subscription - no per-user fees or contact limits.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Real-Time Insights:</span> Live dashboard with key metrics, charts, and forecasting to guide your sales strategy.
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Simple Yet Powerful:</span> Easy to use for individuals, powerful enough for teams with assignment and collaboration features.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-8">Complete Feature Set</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-green-500/30 transition-all duration-300"
            >
              <div className="bg-green-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-green-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
              <ul className="space-y-2">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-4">Perfect For</h2>
        <p className="text-gray-400 mb-8">Our Sales & CRM is designed for various business types and use cases</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-green-500/30 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{useCase.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{useCase.title}</h3>
              <p className="text-sm text-gray-400">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-white mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-300">1</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Capture Leads</h4>
            <p className="text-sm text-gray-400">Add leads manually or import from various sources</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-300">2</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Qualify & Score</h4>
            <p className="text-sm text-gray-400">Use BANT framework and automatic scoring</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-300">3</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Manage Pipeline</h4>
            <p className="text-sm text-gray-400">Move deals through stages with drag & drop</p>
          </div>
          <div className="text-center">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-300">4</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Close Deals</h4>
            <p className="text-sm text-gray-400">Track activities and close deals successfully</p>
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-8">7-Stage Sales Pipeline</h2>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-gray-500/20 to-gray-600/10 border border-gray-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">1. Lead</h4>
                <span className="text-xs bg-gray-500/30 px-2 py-1 rounded">10%</span>
              </div>
              <p className="text-sm text-gray-400">Initial contact made</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">2. Qualified</h4>
                <span className="text-xs bg-yellow-500/30 px-2 py-1 rounded">25%</span>
              </div>
              <p className="text-sm text-gray-400">BANT criteria met</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">3. Meeting</h4>
                <span className="text-xs bg-blue-500/30 px-2 py-1 rounded">40%</span>
              </div>
              <p className="text-sm text-gray-400">Discovery meeting scheduled</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">4. Proposal</h4>
                <span className="text-xs bg-purple-500/30 px-2 py-1 rounded">60%</span>
              </div>
              <p className="text-sm text-gray-400">Proposal sent</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">5. Negotiation</h4>
                <span className="text-xs bg-orange-500/30 px-2 py-1 rounded">80%</span>
              </div>
              <p className="text-sm text-gray-400">Terms being discussed</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">6. Closed Won</h4>
                <span className="text-xs bg-green-500/30 px-2 py-1 rounded">100%</span>
              </div>
              <p className="text-sm text-gray-400">Deal successfully closed</p>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">7. Closed Lost</h4>
                <span className="text-xs bg-red-500/30 px-2 py-1 rounded">0%</span>
              </div>
              <p className="text-sm text-gray-400">Deal lost - document reasons</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon - Phase 2 */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-8">
        <h2 className="text-3xl font-bold text-white mb-4 flex items-center">
          <Zap className="w-6 h-6 mr-3 text-purple-400" />
          Coming Soon - Phase 2 (Q1 2026)
        </h2>
        <p className="text-gray-300 mb-6">
          We're actively developing these advanced features:
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-purple-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Email Integration:</span>
                <p className="text-sm text-gray-400 mt-1">Send emails directly from lead/deal pages with templates and tracking</p>
              </div>
            </div>
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-purple-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Calendar Integration:</span>
                <p className="text-sm text-gray-400 mt-1">Schedule meetings from CRM with automatic logging</p>
              </div>
            </div>
            <div className="flex items-start">
              <BarChart3 className="w-5 h-5 text-purple-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Advanced Analytics:</span>
                <p className="text-sm text-gray-400 mt-1">Custom reports, date ranges, and export to CSV/PDF</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <Award className="w-5 h-5 text-purple-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Custom Lead Scoring:</span>
                <p className="text-sm text-gray-400 mt-1">Configure your own scoring rules and criteria</p>
              </div>
            </div>
            <div className="flex items-start">
              <Zap className="w-5 h-5 text-purple-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Bulk Actions:</span>
                <p className="text-sm text-gray-400 mt-1">Bulk assign, update, and export leads/deals</p>
              </div>
            </div>
            <div className="flex items-start">
              <Activity className="w-5 h-5 text-purple-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Sales Cadences:</span>
                <p className="text-sm text-gray-400 mt-1">Automated email sequences and follow-up workflows</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-2xl p-8 md:p-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Start Managing Your Sales Pipeline Today</h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Sales & CRM is included with your Ajentrix subscription. Start capturing leads, managing deals, 
          and closing more sales right now.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/sales/dashboard"
            className="inline-flex items-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            Open Sales Dashboard
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link
            to="/sales/leads/new"
            className="inline-flex items-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors text-lg"
          >
            Add Your First Lead
            <Users className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SalesCRMFeature;

