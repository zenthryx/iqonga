import React from 'react';

const BetaTesting: React.FC = () => {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Beta Testing
            <span className="text-green-400 block">Program</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Join our exclusive beta testing program and help shape the future of AI-powered business automation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#apply" 
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Apply for Beta Access
            </a>
            <a 
              href="#features" 
              className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              View Features
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">What You'll Test</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our beta testing program covers the core Iqonga platform features that are ready for real-world testing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Agent Creation */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">AI Agent Creation</h3>
              <p className="text-gray-300 mb-4">
                Create and customize AI agents with unique personalities, knowledge bases, and conversation styles
              </p>
              <ul className="text-gray-400 space-y-2">
                <li>• Personality customization</li>
                <li>• Knowledge base management</li>
                <li>• Response templates</li>
                <li>• Agent training</li>
              </ul>
            </div>

            {/* Voice Chat System */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Voice Chat System</h3>
              <p className="text-gray-300 mb-4">
                Test our advanced voice chat capabilities with speech-to-text and text-to-speech integration
              </p>
              <ul className="text-gray-400 space-y-2">
                <li>• Real-time voice conversations</li>
                <li>• Speech-to-text processing</li>
                <li>• Text-to-speech responses</li>
                <li>• Voice customization</li>
              </ul>
            </div>

            {/* Widget Integration */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Widget Integration</h3>
              <p className="text-gray-300 mb-4">
                Embed AI chat widgets on your website with customizable appearance and behavior
              </p>
              <ul className="text-gray-400 space-y-2">
                <li>• Customizable design</li>
                <li>• Mobile responsive</li>
                <li>• Easy integration</li>
                <li>• Analytics tracking</li>
              </ul>
            </div>

            {/* WordPress Plugin */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">WordPress Plugin</h3>
              <p className="text-gray-300 mb-4">
                Test our WordPress plugin for seamless AI agent integration on WordPress websites
              </p>
              <ul className="text-gray-400 space-y-2">
                <li>• One-click installation</li>
                <li>• Admin dashboard</li>
                <li>• Shortcode support</li>
                <li>• Plugin updates</li>
              </ul>
            </div>

            {/* Analytics Dashboard */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Analytics Dashboard</h3>
              <p className="text-gray-300 mb-4">
                Monitor performance, track conversations, and analyze user engagement metrics
              </p>
              <ul className="text-gray-400 space-y-2">
                <li>• Conversation tracking</li>
                <li>• Performance metrics</li>
                <li>• User engagement</li>
                <li>• Custom reports</li>
              </ul>
            </div>

            {/* Credit System */}
            <div className="glass-card p-8">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Credit System</h3>
              <p className="text-gray-300 mb-4">
                Test our credit-based usage system for fair and transparent AI service pricing
              </p>
              <ul className="text-gray-400 space-y-2">
                <li>• Usage tracking</li>
                <li>• Credit management</li>
                <li>• Fair pricing</li>
                <li>• Transparent billing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Beta Testing Benefits</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Why join our beta testing program and what you'll get in return
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6">For Your Business</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Early Access</h4>
                    <p className="text-gray-400">Get access to cutting-edge AI technology before public release</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Free Credits</h4>
                    <p className="text-gray-400">Receive free credits to test all platform features</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Direct Support</h4>
                    <p className="text-gray-400">Priority support from our development team</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Influence Development</h4>
                    <p className="text-gray-400">Your feedback directly shapes the platform's future</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6">For Our Platform</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Real-World Testing</h4>
                    <p className="text-gray-400">Test features in actual business environments</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Quality Assurance</h4>
                    <p className="text-gray-400">Identify and fix issues before public launch</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">User Feedback</h4>
                    <p className="text-gray-400">Gather insights to improve user experience</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Community Building</h4>
                    <p className="text-era-400">Build a community of early adopters and advocates</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="apply" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">How to Apply</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Ready to join our beta testing program? Here's how to get started
            </p>
          </div>

          <div className="glass-card p-8">
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-4 mt-1">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Complete Application Form</h3>
                  <p className="text-gray-300 mb-4">
                    Fill out our beta testing application form with your business information and testing goals
                  </p>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm mb-2">Required Information:</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Business name and industry</li>
                      <li>• Website URL</li>
                      <li>• Contact information</li>
                      <li>• Testing objectives</li>
                      <li>• Expected usage volume</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-4 mt-1">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Review Process</h3>
                  <p className="text-gray-300 mb-4">
                    Our team will review your application and select beta testers based on specific criteria
                  </p>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm mb-2">Selection Criteria:</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Business type and industry fit</li>
                      <li>• Technical capability and requirements</li>
                      <li>• Testing commitment and availability</li>
                      <li>• Feedback quality and engagement</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-4 mt-1">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Onboarding & Setup</h3>
                  <p className="text-gray-300 mb-4">
                    Once selected, you'll receive onboarding materials and access to the beta platform
                  </p>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm mb-2">Onboarding Includes:</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Platform access credentials</li>
                      <li>• Setup documentation and guides</li>
                      <li>• Initial free credits</li>
                      <li>• Direct support channel access</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-4 mt-1">
                  <span className="text-white font-bold text-sm">4</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Testing & Feedback</h3>
                  <p className="text-gray-300 mb-4">
                    Start testing features and provide regular feedback through our dedicated channels
                  </p>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm mb-2">Feedback Channels:</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Weekly feedback surveys</li>
                      <li>• Direct support chat</li>
                    <li>• Community forum discussions</li>
                    <li>• <a href="https://t.me/Zenthryx_ai" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">Telegram group participation</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Beta Testing Requirements</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              What we expect from our beta testers and what you can expect from us
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Your Commitments</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Regular Testing</h4>
                    <p className="text-gray-400">Use the platform regularly and test different features</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Detailed Feedback</h4>
                    <p className="text-gray-400">Provide specific, actionable feedback on features and issues</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Bug Reporting</h4>
                    <p className="text-gray-400">Report bugs and issues promptly with detailed descriptions</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Community Participation</h4>
                    <p className="text-gray-400">Engage with other beta testers and share experiences</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Our Commitments</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Free Access</h4>
                    <p className="text-gray-400">Complete platform access with free credits during beta</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Priority Support</h4>
                    <p className="text-gray-400">Direct access to our development team for support</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Regular Updates</h4>
                    <p className="text-gray-400">Weekly updates on platform improvements and new features</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Recognition</h4>
                    <p className="text-gray-400">Recognition as a beta tester in our community</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Apply?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Join our beta testing program and help shape the future of AI-powered business automation
            </p>
            <div className="mb-8">
              <p className="text-gray-400 mb-4">Join our community for updates and discussions:</p>
              <a 
                href="https://t.me/Zenthryx_ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Join Telegram Group
              </a>
            </div>
          </div>

          <div className="glass-card p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-6">Apply for Beta Access</h3>
              <p className="text-gray-300 mb-8">
                Fill out our application form to join our exclusive beta testing program. 
                We're looking for businesses that are ready to test and provide feedback on our AI platform.
              </p>
              
              <div className="space-y-4">
                <a 
                  href="mailto:beta@zenthryx.ai?subject=Beta Testing Application&body=Hello Zenthryx Team,%0D%0A%0D%0AI am interested in joining your beta testing program.%0D%0A%0D%0ABusiness Name:%0D%0AIndustry:%0D%0AWebsite:%0D%0AContact Email:%0D%0A%0D%0ATesting Objectives:%0D%0A%0D%0AExpected Usage Volume:%0D%0A%0D%0AThank you!" 
                  className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
                >
                  Apply Now
                </a>
                
                <div className="text-gray-400 text-sm">
                  <p>Or contact us directly at <a href="mailto:beta@zenthryx.ai" className="text-green-400 hover:text-green-300">beta@zenthryx.ai</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Beta Testing Timeline</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our beta testing program runs for 1 month with regular milestones and updates
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mr-6 mt-1">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">Week 1-2: Foundation Testing</h3>
                <p className="text-gray-300 mb-4">
                  Focus on core platform features, AI agent creation, and basic functionality testing
                </p>
                <ul className="text-gray-400 space-y-2">
                  <li>• AI agent creation and customization</li>
                  <li>• Basic chat functionality</li>
                  <li>• Widget integration</li>
                  <li>• User interface testing</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mr-6 mt-1">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">Week 3: Advanced Features</h3>
                <p className="text-gray-300 mb-4">
                  Test advanced features including voice chat, analytics, and WordPress plugin
                </p>
                <ul className="text-gray-400 space-y-2">
                  <li>• Voice chat system</li>
                  <li>• Analytics dashboard</li>
                  <li>• WordPress plugin</li>
                  <li>• Credit system</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mr-6 mt-1">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">Week 4: Integration & Polish</h3>
                <p className="text-gray-300 mb-4">
                  Final testing phase focusing on integrations, performance, and user experience
                </p>
                <ul className="text-gray-400 space-y-2">
                  <li>• Performance optimization</li>
                  <li>• Integration testing</li>
                  <li>• User experience refinement</li>
                  <li>• Final feedback collection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Common questions about our beta testing program
            </p>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-4">How long does the beta testing program last?</h3>
              <p className="text-gray-300">
                The beta testing program runs for 1 month, with regular milestones and updates throughout the process.
              </p>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-4">Is there a cost to participate in beta testing?</h3>
              <p className="text-gray-300">
                No, beta testing is completely free. We provide free credits and full platform access during the testing period.
              </p>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-4">What happens after the beta testing period ends?</h3>
              <p className="text-gray-300">
                Beta testers will receive special pricing and early access to new features. You'll also be recognized as a founding member of our community.
              </p>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-4">How much time do I need to commit to beta testing?</h3>
              <p className="text-gray-300">
                We expect beta testers to spend 2-3 hours per week testing features and providing feedback. This can be flexible based on your schedule.
              </p>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-4">What if I encounter technical issues during testing?</h3>
              <p className="text-gray-300">
                Our development team provides priority support to all beta testers. You'll have direct access to our support channels for quick resolution.
              </p>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-white mb-4">Can I use the platform for my actual business during beta testing?</h3>
              <p className="text-gray-300">
                Yes! We encourage beta testers to use the platform for real business scenarios. This provides the most valuable feedback for our development team.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BetaTesting;
