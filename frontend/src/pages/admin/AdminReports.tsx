import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const AdminReports: React.FC = () => {
  const [reportType, setReportType] = useState('users');
  const [dateRange, setDateRange] = useState('30d');
  const [format, setFormat] = useState('csv');
  const [generating, setGenerating] = useState(false);

  const reportTypes = [
    { id: 'users', name: 'Users Report', description: 'User accounts, activity, and statistics' },
    { id: 'agents', name: 'Agents Report', description: 'AI agents and their performance' },
    { id: 'content', name: 'Content Report', description: 'Generated content across all types' },
    { id: 'credits', name: 'Credits Report', description: 'Credit transactions and balances' },
    { id: 'integrations', name: 'Integrations Report', description: 'Platform connections and status' },
    { id: 'api-usage', name: 'API Usage Report', description: 'API usage by provider and cost' }
  ];

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const response = await apiService.post('/admin/reports/generate', {
        report_type: reportType,
        date_range: dateRange,
        format
      }, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv' && response instanceof Blob) {
        // Download CSV file
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report downloaded successfully');
      } else if (response.success) {
        toast.success('Report generated successfully');
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reports & Exports</h1>
        <p className="text-gray-400 mt-1">Generate and export platform data reports</p>
      </div>

      {/* Report Type Selection */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Report Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                reportType === type.id
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center mb-2">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-400" />
                <div className="text-sm font-medium text-white">{type.name}</div>
              </div>
              <div className="text-xs text-gray-400">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Options */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Report Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Export Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel (XLSX)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <DocumentArrowDownIcon className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <DocumentArrowDownIcon className="h-5 w-5" />
              Generate & Download Report
            </>
          )}
        </button>
      </div>

      {/* Report Preview Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start">
          <ChartBarIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-300 mb-1">Report Information</p>
            <p className="text-sm text-gray-400">
              The {reportTypes.find(t => t.id === reportType)?.name.toLowerCase()} will include all relevant data for the selected date range.
              Large reports may take a few moments to generate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;

