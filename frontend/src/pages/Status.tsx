import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  description: string;
  lastUpdated: string;
  uptime?: string;
}

const Status: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      id: 'api',
      name: 'API Services',
      status: 'operational',
      description: 'Core API endpoints and authentication services',
      lastUpdated: '2024-01-15T10:30:00Z',
      uptime: '99.9%'
    },
    {
      id: 'ai-generation',
      name: 'AI Content Generation',
      status: 'operational',
      description: 'AI-powered content generation and image creation',
      lastUpdated: '2024-01-15T10:30:00Z',
      uptime: '99.8%'
    },
    {
      id: 'social-platforms',
      name: 'Social Media Platforms',
      status: 'operational',
      description: 'Twitter, Instagram, and LinkedIn integrations',
      lastUpdated: '2024-01-15T10:30:00Z',
      uptime: '99.5%'
    },
    {
      id: 'database',
      name: 'Database Services',
      status: 'operational',
      description: 'User data and content storage',
      lastUpdated: '2024-01-15T10:30:00Z',
      uptime: '99.9%'
    },
    {
      id: 'cdn',
      name: 'Content Delivery',
      status: 'operational',
      description: 'Static assets and image delivery',
      lastUpdated: '2024-01-15T10:30:00Z',
      uptime: '99.8%'
    },
    {
      id: 'analytics',
      name: 'Analytics Services',
      status: 'operational',
      description: 'Performance tracking and reporting',
      lastUpdated: '2024-01-15T10:30:00Z',
      uptime: '99.6%'
    }
  ]);

  const [incidents, setIncidents] = useState([
    {
      id: 'incident-1',
      title: 'Scheduled Maintenance - AI Services',
      status: 'resolved',
      impact: 'minor',
      description: 'Planned maintenance window for AI model updates',
      startTime: '2024-01-14T02:00:00Z',
      endTime: '2024-01-14T04:00:00Z',
      affectedServices: ['AI Content Generation']
    },
    {
      id: 'incident-2',
      title: 'Twitter API Rate Limiting',
      status: 'resolved',
      impact: 'minor',
      description: 'Temporary rate limiting issues with Twitter API',
      startTime: '2024-01-12T15:30:00Z',
      endTime: '2024-01-12T16:45:00Z',
      affectedServices: ['Social Media Platforms']
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'outage':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      case 'maintenance':
        return <ClockIcon className="w-5 h-5 text-blue-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'degraded':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'outage':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'maintenance':
        return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-600';
      case 'major':
        return 'bg-orange-600';
      case 'minor':
        return 'bg-yellow-600';
      case 'maintenance':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const overallStatus = services.every(s => s.status === 'operational') ? 'operational' : 
                       services.some(s => s.status === 'outage') ? 'outage' : 'degraded';

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Iqonga Status</h1>
          <p className="text-xl text-gray-300 mb-6">
            Real-time status of all Iqonga services and systems
          </p>
          
          {/* Overall Status */}
          <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${getStatusColor(overallStatus)}`}>
            {getStatusIcon(overallStatus)}
            <span className="ml-2 font-semibold capitalize">
              {overallStatus === 'operational' ? 'All Systems Operational' : 
               overallStatus === 'outage' ? 'Service Outage' : 'Degraded Performance'}
            </span>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>

        {/* Services Status */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Service Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div key={service.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                  {getStatusIcon(service.status)}
                </div>
                <p className="text-gray-300 text-sm mb-4">{service.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status:</span>
                    <span className={`capitalize ${getStatusColor(service.status).split(' ')[0]}`}>
                      {service.status}
                    </span>
                  </div>
                  {service.uptime && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Uptime:</span>
                      <span className="text-green-400">{service.uptime}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="text-gray-300">{formatDate(service.lastUpdated)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Recent Incidents</h2>
          {incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className={`w-3 h-3 rounded-full ${getImpactColor(incident.impact)} mr-3`}></div>
                        <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                        <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                          incident.status === 'resolved' ? 'bg-green-900/20 text-green-400' : 'bg-yellow-900/20 text-yellow-400'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">{incident.description}</p>
                      <div className="text-sm text-gray-400">
                        <div className="flex flex-wrap gap-4">
                          <span>Started: {formatDate(incident.startTime)}</span>
                          {incident.endTime && (
                            <span>Resolved: {formatDate(incident.endTime)}</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className="text-gray-400">Affected Services: </span>
                          <span className="text-white">{incident.affectedServices.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Recent Incidents</h3>
              <p className="text-gray-300">All systems are running smoothly with no recent issues reported.</p>
            </div>
          )}
        </div>

        {/* Status Legend */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Status Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-gray-300">Operational</span>
            </div>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-gray-300">Degraded Performance</span>
            </div>
            <div className="flex items-center">
              <XCircleIcon className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-gray-300">Service Outage</span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-gray-300">Maintenance</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">Need Help?</h3>
            <p className="text-gray-300 mb-4">
              If you're experiencing issues not reflected in this status page, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Contact Support
              </a>
              <a
                href="https://t.me/Zenthryx_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Join Community
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Last updated: {formatDate(new Date().toISOString())}</p>
          <p className="mt-1">
            Status page powered by Iqonga • 
            <a href="/docs" className="text-blue-400 hover:text-blue-300 ml-1">Documentation</a> • 
            <a href="/faq" className="text-blue-400 hover:text-blue-300 ml-1">FAQ</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Status;
