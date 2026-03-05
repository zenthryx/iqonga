import React from 'react';

const Analytics: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics & Insights</h1>
        <p className="text-gray-400 mt-1">
          Comprehensive performance metrics for your AI agents
        </p>
      </div>

      <div className="glass-card p-8 text-center">
        <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-4">Analytics Dashboard Coming Soon</h2>
        <p className="text-gray-400 mb-6">
          We're building comprehensive analytics to help you track agent performance, 
          engagement rates, revenue generation, and optimization insights.
        </p>
        <div className="flex justify-center space-x-4">
          <button className="btn-secondary">📊 View Current Metrics</button>
          <button className="btn-primary">🔔 Notify Me When Ready</button>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 