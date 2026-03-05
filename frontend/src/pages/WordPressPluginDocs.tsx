import React from 'react';

const WordPressPluginDocs: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <section className="py-20 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            WordPress Plugin
            <span className="text-green-400 block">Documentation</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Complete guide to installing, configuring, and using the Ajentrix WordPress Plugin
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            
            {/* Getting Started */}
            <div className="glass-card p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Getting Started</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">What is the Ajentrix WordPress Plugin?</h3>
                  <p className="text-gray-300 mb-4">
                    The Ajentrix WordPress Plugin allows you to deploy AI-powered voice-enabled chatbots on your WordPress website. 
                    It integrates seamlessly with your existing Ajentrix AI agents to provide 24/7 customer support and engagement.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Key Features</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>AI-powered chat functionality with your custom agents</li>
                    <li>Voice chat with speech-to-text and text-to-speech</li>
                    <li>Easy WordPress admin integration</li>
                    <li>Customizable widget appearance and positioning</li>
                    <li>Analytics and conversation tracking</li>
                    <li>Mobile responsive design</li>
                    <li>Shortcode support for flexible placement</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Installation */}
            <div className="glass-card p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Installation</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Method 1: WordPress Admin Upload</h3>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2">
                    <li>Download the plugin ZIP file from <a href="/wordpress-plugin" className="text-green-400 hover:text-green-300">our download page</a></li>
                    <li>Go to your WordPress Admin → Plugins → Add New</li>
                    <li>Click "Upload Plugin" button</li>
                    <li>Select the downloaded ZIP file</li>
                    <li>Click "Install Now" and then "Activate"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Method 2: Manual Upload</h3>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2">
                    <li>Download and extract the plugin ZIP file</li>
                    <li>Upload the extracted folder to <code className="bg-gray-800 px-2 py-1 rounded text-green-400">/wp-content/plugins/</code></li>
                    <li>Go to WordPress Admin → Plugins</li>
                    <li>Find "Ajentrix AI Agent" and click "Activate"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Requirements</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>WordPress 5.0 or higher</li>
                    <li>PHP 7.4 or higher</li>
                    <li>Ajentrix account and API key</li>
                    <li>Modern browser with microphone support (for voice chat)</li>
                    <li>HTTPS enabled (required for voice chat)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="glass-card p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Configuration</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Getting Your API Key</h3>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2">
                    <li>Sign up or log in to your <a href="/dashboard" className="text-green-400 hover:text-green-300">Ajentrix Dashboard</a></li>
                    <li>Go to Settings → API Keys</li>
                    <li>Click "Generate New API Key"</li>
                    <li>Copy the generated API key (keep it secure!)</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Plugin Settings</h3>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2">
                    <li>Go to WordPress Admin → Ajentrix → Settings</li>
                    <li>Enter your API key in the "API Key" field</li>
                    <li>Click "Test Connection" to verify</li>
                    <li>Select your default AI agent from the dropdown</li>
                    <li>Configure widget appearance and behavior</li>
                    <li>Click "Save Settings"</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Widget Settings</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li><strong>Enable Widget:</strong> Show/hide the chat widget on your website</li>
                    <li><strong>Position:</strong> Choose where the widget appears (bottom-right, bottom-left, etc.)</li>
                    <li><strong>Colors:</strong> Customize primary and text colors to match your brand</li>
                    <li><strong>Mobile Support:</strong> Enable/disable widget on mobile devices</li>
                    <li><strong>Voice Chat:</strong> Enable/disable voice functionality</li>
                    <li><strong>Auto Open:</strong> Automatically open the widget when visitors arrive</li>
                    <li><strong>Powered By:</strong> Show/hide "Powered by Ajentrix" link</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="glass-card p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Usage</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Automatic Widget</h3>
                  <p className="text-gray-300 mb-4">
                    Once configured, the chat widget will automatically appear on your website based on your settings. 
                    Visitors can click the widget to start chatting with your AI agent.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Shortcode Usage</h3>
                  <p className="text-gray-300 mb-4">
                    You can also place the chat widget anywhere using shortcodes:
                  </p>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h4 className="text-white font-semibold mb-2">Basic Usage:</h4>
                    <code className="text-green-400">[ajentrix_chat]</code>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h4 className="text-white font-semibold mb-2">With Custom Agent:</h4>
                    <code className="text-green-400">[ajentrix_chat agent_id="your-agent-id"]</code>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h4 className="text-white font-semibold mb-2">With Custom Colors:</h4>
                    <code className="text-green-400">[ajentrix_chat color="#FF6B6B" text_color="#FFFFFF"]</code>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h4 className="text-white font-semibold mb-2">Inline Position:</h4>
                    <code className="text-green-400">[ajentrix_chat position="inline"]</code>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Voice Chat</h3>
                  <p className="text-gray-300 mb-4">
                    If voice chat is enabled, visitors can click the microphone button to speak with your AI agent. 
                    The plugin will convert speech to text, process it with your AI agent, and convert the response back to speech.
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>Requires HTTPS for security</li>
                    <li>Needs microphone permissions from the visitor</li>
                    <li>Works on modern browsers (Chrome, Firefox, Safari, Edge)</li>
                    <li>Uses OpenAI Whisper for speech-to-text</li>
                    <li>Uses OpenAI TTS for text-to-speech</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="glass-card p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Analytics</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Viewing Analytics</h3>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2">
                    <li>Go to WordPress Admin → Ajentrix → Analytics</li>
                    <li>View conversation statistics</li>
                    <li>Monitor response times</li>
                    <li>Track user satisfaction</li>
                    <li>Analyze chat trends</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Available Metrics</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li><strong>Total Conversations:</strong> Number of chat sessions started</li>
                    <li><strong>Messages Sent:</strong> Total messages exchanged</li>
                    <li><strong>Average Response Time:</strong> How quickly your AI responds</li>
                    <li><strong>Satisfaction Rate:</strong> User satisfaction percentage</li>
                    <li><strong>Conversation Trends:</strong> Activity over time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="glass-card p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Troubleshooting</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Common Issues</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Widget not appearing</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1">
                        <li>Check if widget is enabled in settings</li>
                        <li>Verify API key and agent selection</li>
                        <li>Check for JavaScript errors in browser console</li>
                        <li>Ensure HTTPS is enabled</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Voice chat not working</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1">
                        <li>Ensure microphone permissions are granted</li>
                        <li>Check browser compatibility</li>
                        <li>Verify voice chat is enabled in settings</li>
                        <li>Ensure HTTPS is enabled</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Connection errors</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1">
                        <li>Verify API key is correct</li>
                        <li>Check internet connection</li>
                        <li>Ensure Ajentrix service is available</li>
                        <li>Check WordPress error logs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Debug Mode</h3>
                  <p className="text-gray-300 mb-4">
                    Enable debug mode in settings for detailed logging:
                  </p>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2">
                    <li>Go to Ajentrix → Settings</li>
                    <li>Enable "Debug Mode"</li>
                    <li>Check browser console for detailed logs</li>
                    <li>Check WordPress error logs</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Getting Help</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>Check our <a href="/docs" className="text-green-400 hover:text-green-300">documentation</a></li>
                    <li>Visit our <a href="/support" className="text-green-400 hover:text-green-300">support page</a></li>
                    <li>Contact us at <a href="mailto:support@iqonga.org" className="text-green-400 hover:text-green-300">support@iqonga.org</a></li>
                    <li>Join our <a href="/community" className="text-green-400 hover:text-green-300">community forum</a></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="glass-card p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Support & Resources</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Documentation</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li><a href="/docs" className="text-green-400 hover:text-green-300">Complete Documentation</a></li>
                    <li><a href="/api-docs" className="text-green-400 hover:text-green-300">API Reference</a></li>
                    <li><a href="/examples" className="text-green-400 hover:text-green-300">Code Examples</a></li>
                    <li><a href="/tutorials" className="text-green-400 hover:text-green-300">Video Tutorials</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Community</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li><a href="/community" className="text-green-400 hover:text-green-300">Community Forum</a></li>
                    <li><a href="/discord" className="text-green-400 hover:text-green-300">Discord Server</a></li>
                    <li><a href="/github" className="text-green-400 hover:text-green-300">GitHub Repository</a></li>
                    <li><a href="/twitter" className="text-green-400 hover:text-green-300">Twitter Updates</a></li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default WordPressPluginDocs;