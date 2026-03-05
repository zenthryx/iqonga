import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

const About: React.FC = () => {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <SEO
        title="About Iqonga"
        description="Iqonga is an open-source Agentic framework. Build AI-agent-based solutions, extend the framework, and share or sell in the marketplace."
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            About <span className="text-teal-400">Iqonga</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            The open-source Agentic framework where users and businesses build solutions based on AI agents.
          </p>
        </div>

        {/* Mission Section */}
        <div className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-gray-300 text-lg mb-6">
                We believe AI agents should be accessible, composable, and useful for everyone. Iqonga democratizes 
                agentic development so anyone can build intelligent assistants that understand their domain, 
                connect to their tools, and power real solutions—from content and support to internal workflows.
              </p>
              <p className="text-gray-300 text-lg">
                As an open-source framework, Iqonga lets developers extend the platform, build on top of it, 
                and share or sell solutions in the marketplace. Agents are the building blocks; you own the stack.
              </p>
            </div>
            <div className="bg-gradient-to-br from-teal-500/20 to-purple-500/20 rounded-xl p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-2xl font-bold text-white mb-4">Build on the Framework</h3>
                <p className="text-gray-300">
                  Create agents, connect channels, and ship solutions. Use the framework as-is or extend it for your use case.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
              <div className="text-4xl mb-4">🔓</div>
              <h3 className="text-xl font-bold text-white mb-4">Open Source</h3>
              <p className="text-gray-300">
                The framework is open so you can inspect, modify, and build on it—no lock-in, full control.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-4">Security & Privacy</h3>
              <p className="text-gray-300">
                Run your own instance; keep your data on your infrastructure. Enterprise-grade practices where it matters.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-white mb-4">Developer-First</h3>
              <p className="text-gray-300">
                Documentation, APIs, and extensibility so developers can build and ship solutions on top of Iqonga.
              </p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Built by Zenthryx AI Lab</h2>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
            <div className="text-center">
              <div className="text-6xl mb-6">🏢</div>
              <h3 className="text-2xl font-bold text-white mb-4">Zenthryx AI Lab</h3>
              <p className="text-gray-300 text-lg mb-6">
                Iqonga is developed by Zenthryx AI Lab, focused on AI and agentic systems. 
                We build the framework so the community can build the solutions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://zenthryx.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Visit Zenthryx AI Lab
                </a>
                <a
                  href="https://t.me/Zenthryx_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Join Community
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-xl p-8 border border-teal-500/30">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-gray-300 text-lg mb-6">
              Build your first agent, connect channels, and join the AI Agent forum. Free to start.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/docs"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold transition-colors border border-white/30"
              >
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
