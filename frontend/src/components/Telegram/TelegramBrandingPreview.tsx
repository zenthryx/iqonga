import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Agent {
  id: string;
  name: string;
  personality_type: string;
  description: string;
  avatar_url?: string;
}

interface TelegramBrandingPreviewProps {
  agent: Agent;
  onClose: () => void;
}

const TelegramBrandingPreview: React.FC<TelegramBrandingPreviewProps> = ({
  agent,
  onClose
}) => {
  const [sampleMessage, setSampleMessage] = useState('');
  const [brandedMessage, setBrandedMessage] = useState('');

  useEffect(() => {
    // Generate a sample message based on agent personality
    const sampleMessages: Record<string, string> = {
      'professional': 'Thank you for your interest in our services. I\'m here to help you with any questions you might have.',
      'casual': 'Hey there! 👋 Thanks for reaching out! What can I help you with today?',
      'expert': 'I\'m here to provide expert insights and guidance. What specific information are you looking for?'
    };

    const defaultMessage = (sampleMessages as any)[agent.personality_type] || sampleMessages['professional'];
    setSampleMessage(defaultMessage);
    setBrandedMessage(defaultMessage);
  }, [agent]);

  const updateBrandedMessage = (message: string) => {
    setBrandedMessage(message);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Telegram Branding Preview</h2>
              <p className="text-gray-300">See how {agent.name} will appear in Telegram groups</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Agent Info */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                {agent.avatar_url ? (
                  <img 
                    src={agent.avatar_url} 
                    alt={agent.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white">{agent.name}</h3>
                  <p className="text-gray-300 capitalize">{agent.personality_type} AI Agent</p>
                  <p className="text-gray-400 text-sm mt-1">{agent.description}</p>
                </div>
              </div>
            </div>

            {/* Branding Explanation */}
            <div className="bg-blue-900 p-4 rounded-lg">
              <h4 className="font-medium text-blue-100 mb-2">How Branding Works</h4>
              <div className="text-sm text-blue-200 space-y-2">
                <p>• <strong>Bot Username:</strong> @ajentrixai_bot (cannot be changed)</p>
                <p>• <strong>Display Name:</strong> Agent name appears in chat interface automatically</p>
                <p>• <strong>Personality:</strong> Responses match your agent's {agent.personality_type} style</p>
                <p>• <strong>Automatic:</strong> All messages and responses are sent by your agent</p>
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sample Message
                </label>
                <textarea
                  value={sampleMessage}
                  onChange={(e) => {
                    setSampleMessage(e.target.value);
                    updateBrandedMessage(e.target.value);
                  }}
                  className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Enter a sample message to see how it will appear..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How it appears in Telegram
                </label>
                <div className="bg-gray-600 p-4 rounded-lg border border-gray-500">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {agent.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-sm text-white">{agent.name}</div>
                      <div className="text-xs text-gray-300">via @ajentrixai_bot</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-100 whitespace-pre-wrap">
                    {brandedMessage}
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-white mb-3">Branding Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center text-gray-300">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Automatic message branding
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Personality-based responses
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Agent name in all messages
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-300">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Automatic engagement
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Keyword triggers
                  </div>
                  <div className="flex items-center text-gray-300">
                    <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Rate limiting & delays
                  </div>
                </div>
              </div>
            </div>

            {/* Limitations */}
            <div className="bg-yellow-900 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-100 mb-2">Telegram Limitations</h4>
              <div className="text-sm text-yellow-200 space-y-1">
                <p>• Bot username (@ajentrixai_bot) cannot be changed</p>
                <p>• Bot display name in group member list cannot be customized</p>
                <p>• All branding is done through message content and formatting</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            >
              Close Preview
            </button>
            <button
              onClick={() => {
                toast.success('Branding preview saved! Your agent will use this branding in Telegram.');
                onClose();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got It!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramBrandingPreview;
