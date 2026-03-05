import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface TelegramSetupProps {
  onComplete: () => void;
}

const TelegramSetup: React.FC<TelegramSetupProps> = ({ onComplete }) => {
  const [setupType, setSetupType] = useState<'platform' | 'personal' | null>(null);
  const [formData, setFormData] = useState({
    chatId: '',
    botToken: '', // Only used for personal bot
  });

  const PLATFORM_BOT_USERNAME = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || '@your_platform_bot';

  const connectPlatformBot = async () => {
    if (!formData.chatId) {
      toast.error('Please enter the chat ID');
      return;
    }

    try {
      const response = await fetch('/api/telegram/connect-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          chatId: formData.chatId,
          usePlatformBot: true
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        onComplete();
      } else {
        toast.error(data.error || 'Failed to connect group');
      }
    } catch (error) {
      console.error('Error connecting platform bot:', error);
      toast.error('Failed to connect group');
    }
  };

  const connectPersonalBot = async () => {
    if (!formData.botToken || !formData.chatId) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          botToken: formData.botToken,
          chatId: formData.chatId,
          usePlatformBot: false
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        onComplete();
      } else {
        toast.error(data.error || 'Failed to connect group');
      }
    } catch (error) {
      console.error('Error connecting personal bot:', error);
      toast.error('Failed to connect group');
    }
  };

  if (!setupType) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Telegram Setup Method</h2>
          <p className="text-gray-600 mb-6">How would you like to connect your Telegram groups?</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Bot Option */}
            <div 
              onClick={() => setSetupType('platform')}
              className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Use Platform Bot</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Simple setup - just add our bot to your group
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>✅ Easy setup</div>
                  <div>✅ No bot creation needed</div>
                  <div>⚠️ Shared rate limits</div>
                </div>
              </div>
            </div>

            {/* Personal Bot Option */}
            <div 
              onClick={() => setSetupType('personal')}
              className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Use Personal Bot</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create your own bot for maximum control
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>✅ Full control</div>
                  <div>✅ No rate limit conflicts</div>
                  <div>⚠️ Requires bot creation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => setSetupType(null)}
            className="text-gray-400 hover:text-gray-600 mr-4"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {setupType === 'platform' ? 'Platform Bot Setup' : 'Personal Bot Setup'}
          </h2>
        </div>

        {setupType === 'platform' ? (
          <div>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Platform Bot Setup:</h4>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Add {PLATFORM_BOT_USERNAME} to your Telegram group</li>
                <li>Make the bot an admin (recommended for best functionality)</li>
                <li>Forward any message from the group to @userinfobot to get the chat ID</li>
                <li>Enter the chat ID below</li>
              </ol>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chat ID
              </label>
              <input
                type="text"
                value={formData.chatId}
                onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                placeholder="-1001234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Group IDs are negative numbers (e.g., -1001234567890)
              </p>
            </div>

            <button
              onClick={connectPlatformBot}
              disabled={!formData.chatId}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect with Platform Bot
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Personal Bot Setup:</h4>
              <ol className="list-decimal list-inside text-sm text-green-800 space-y-1">
                <li>Message @BotFather on Telegram</li>
                <li>Send /newbot and follow the instructions</li>
                <li>Copy the bot token (looks like: 123456789:ABCdefGHI...)</li>
                <li>Add your bot to the Telegram group</li>
                <li>Forward any message from the group to @userinfobot to get the chat ID</li>
                <li>Enter both the bot token and chat ID below</li>
              </ol>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Token
                </label>
                <input
                  type="password"
                  value={formData.botToken}
                  onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGHI..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                  placeholder="-1001234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Group IDs are negative numbers (e.g., -1001234567890)
                </p>
              </div>
            </div>

            <button
              onClick={connectPersonalBot}
              disabled={!formData.botToken || !formData.chatId}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect with Personal Bot
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramSetup;
