import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-6">
      <div className="max-w-lg mx-auto text-center">
        {/* 404 Animation/Graphic */}
        <div className="mb-8">
          <div className="relative">
            <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
              404
            </div>
            <div className="absolute inset-0 text-8xl font-bold text-purple-500/20 blur-sm">
              404
            </div>
          </div>
          
          {/* Floating AI Agent Icons */}
          <div className="relative flex justify-center space-x-4 mb-8">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-bounce delay-0">
              <span className="text-white font-bold">?</span>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-bounce delay-200">
              <span className="text-white font-bold">!</span>
            </div>
            <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center animate-bounce delay-400">
              <span className="text-white font-bold">?</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-400 mb-6">
            Oops! It looks like this page got lost in the AI multiverse. 
            Even our smartest agents couldn't locate it.
          </p>
          
          {/* Helpful Actions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard" className="btn-primary">
                🏠 Back to Dashboard
              </Link>
              <Link to="/agents" className="btn-secondary">
                🤖 View AI Agents
              </Link>
            </div>
            
            <div className="text-center">
              <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm">
                ← Return to Homepage
              </Link>
            </div>
          </div>
        </div>

        {/* Helpful Links */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <Link
            to="/agents/create"
            className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
          >
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create Agent</span>
            </div>
          </Link>
          
          <Link
            to="/marketplace"
            className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
          >
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Marketplace</span>
            </div>
          </Link>
        </div>

        {/* Fun AI Message */}
        <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">AI</span>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-300">
                "I've searched through millions of data points, but this page seems to exist in a parallel dimension. 
                Perhaps you'd like to create a new AI agent instead?" 🤖
              </p>
            </div>
          </div>
        </div>

        {/* Technical Support */}
        <div className="mt-6 text-xs text-gray-500">
          <p>
            Still having trouble? Check our{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300">
              documentation
            </a>{' '}
            or{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300">
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 