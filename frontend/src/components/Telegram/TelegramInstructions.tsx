import React, { useState } from 'react';

const TelegramInstructions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'platform' | 'personal'>('platform');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Telegram Setup Instructions</h2>
          <p className="text-gray-600">Choose your preferred method to connect Telegram groups to your AI agents</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('platform')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'platform'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤖 Platform Bot (Recommended)
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'personal'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👤 Personal Bot (Advanced)
            </button>
          </nav>
        </div>

        {/* Platform Bot Instructions */}
        {activeTab === 'platform' && (
          <div className="p-6">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="text-blue-500 mr-2">ℹ️</div>
                <h3 className="text-lg font-semibold text-blue-900">Easy Setup with Platform Bot</h3>
              </div>
              <p className="text-blue-800">
                Use our shared bot @ajentrixai_bot - no need to create your own bot!
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Add Platform Bot to Your Group</h4>
                  <p className="text-gray-600 mb-3">
                    Add <code className="bg-gray-100 px-2 py-1 rounded">@ajentrixai_bot</code> to your Telegram group
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>In your Telegram group:</strong><br/>
                      • Type: @ajentrixai_bot<br/>
                      • Select the bot and click "Add to Group"<br/>
                      • Make the bot an admin (recommended for full functionality)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Get Your Chat ID</h4>
                  <p className="text-gray-600 mb-3">Forward any message from your group to @userinfobot to get the chat ID</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Steps:</strong><br/>
                      • Forward any message from your group to @userinfobot<br/>
                      • Copy the negative number (e.g., -1001234567890)<br/>
                      • This is your Chat ID
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Connect in Your Dashboard</h4>
                  <p className="text-gray-600 mb-3">Enter the Chat ID in your Telegram settings</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      • Go to "Telegram Settings" in your dashboard<br/>
                      • Choose "Platform Bot" option<br/>
                      • Enter your Chat ID<br/>
                      • Click "Connect Group"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">✅ Advantages of Platform Bot:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• No need to create your own bot</li>
                <li>• Easier setup process</li>
                <li>• Consistent branding across all groups</li>
                <li>• We handle bot maintenance and updates</li>
              </ul>
            </div>
          </div>
        )}

        {/* Personal Bot Instructions */}
        {activeTab === 'personal' && (
          <div className="p-6">
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="text-green-500 mr-2">🔧</div>
                <h3 className="text-lg font-semibold text-green-900">Advanced Setup with Personal Bot</h3>
              </div>
              <p className="text-green-800">
                Create your own bot for maximum control and privacy
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Create Your Bot</h4>
                  <p className="text-gray-600 mb-3">Message @BotFather on Telegram to create a new bot</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Chat with @BotFather:</strong><br/>
                      • Send: <code>/newbot</code><br/>
                      • Choose a name: "My AI Agent Bot"<br/>
                      • Choose a username: "my_ai_agent_bot" (must end with 'bot')<br/>
                      • Copy the bot token (e.g., 123456789:ABCdefGHI...)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Add Your Bot to Group</h4>
                  <p className="text-gray-600 mb-3">Add your newly created bot to your Telegram group</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      • In your group, type: @your_bot_username<br/>
                      • Select your bot and click "Add to Group"<br/>
                      • Optionally make it an admin for better functionality
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Get Chat ID</h4>
                  <p className="text-gray-600 mb-3">Same as platform bot - forward a message to @userinfobot</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      • Forward any message from your group to @userinfobot<br/>
                      • Copy the Chat ID (negative number)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Connect in Dashboard</h4>
                  <p className="text-gray-600 mb-3">Enter both bot token and chat ID</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      • Go to "Telegram Settings"<br/>
                      • Choose "Personal Bot" option<br/>
                      • Enter your bot token and chat ID<br/>
                      • Click "Connect Group"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">🔒 Advantages of Personal Bot:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Full control over your bot</li>
                <li>• No shared rate limits with other users</li>
                <li>• Custom bot name and profile picture</li>
                <li>• Enhanced privacy and security</li>
                <li>• Can customize bot settings and commands</li>
              </ul>
            </div>
          </div>
        )}

        {/* Rate Limits Info */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Telegram Rate Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <div className="font-medium text-gray-900">Per Chat Limit</div>
              <div className="text-2xl font-bold text-blue-600">20</div>
              <div className="text-gray-600">messages per minute</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="font-medium text-gray-900">Global Limit</div>
              <div className="text-2xl font-bold text-green-600">30</div>
              <div className="text-gray-600">messages per second</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="font-medium text-gray-900">Daily Limit</div>
              <div className="text-2xl font-bold text-purple-600">∞</div>
              <div className="text-gray-600">no daily limit</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Rate-limited messages are automatically queued and sent when limits reset
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelegramInstructions;
