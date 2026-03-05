import React, { useState, useEffect } from 'react';
import { 
  MicrophoneIcon, 
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  Cog6ToothIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { toast } from 'react-hot-toast';

interface VoiceChatProps {
  agentId: string;
  userId?: number;
  className?: string;
  showTextChat?: boolean;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ 
  agentId, 
  userId, 
  className = "",
  showTextChat = true 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    enabled: true,
    auto_transcribe: true,
    voice_language: 'en-US',
    voice_speed: 1.0,
    voice_provider: 'openai'
  });

  const {
    isConnected,
    isRecording,
    isPlaying,
    isLoading,
 conversationId,
    messages,
    error,
    startConversation,
    endConversation,
    startRecording,
    stopRecording,
    sendTextMessage,
    loadMessages,
    getVoiceSettings,
    updateVoiceSettings,
    reconnect
  } = useVoiceChat(agentId, userId);

  // Load voice settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getVoiceSettings();
      if (settings) {
        setVoiceSettings(settings);
      }
    };
    loadSettings();
  }, []); // Empty dependency array - only run once on mount

  // Show errors
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Handle recording toggle
  const handleRecordingToggle = async () => {
    if (!isConnected) {
      toast.error('Voice chat not connected');
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      if (!conversationId) {
        await startConversation();
      }
      await startRecording();
    }
  };

  // Handle text message send
  const handleSendMessage = async () => {
    if (!textInput.trim()) return;
    
    await sendTextMessage(textInput.trim());
    setTextInput('');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format message time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get recording status color
  const getRecordingColor = () => {
    if (isRecording) return 'text-red-500';
    if (isPlaying) return 'text-blue-500';
    return 'text-gray-600';
  };

  return (
    <div className={`voice-chat-container ${className}`}>
      {/* Main Voice Chat Interface */}
      <div className="relative flex flex-col items-center space-y-4 p-6 bg-gray-900 rounded-lg border border-gray-700">
        {/* Connection Status */}
        <div className="flex items-center space-x-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-gray-300">
            {isConnected ? 'Voice chat connected' : 'Connecting...'}
          </span>
        </div>

        {/* Main Recording Button */}
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={handleRecordingToggle}
            disabled={!isConnected || isLoading}
            className={`
              relative group p-6 rounded-full transition-all duration-300 
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
              ${isConnected && !isLoading ? 'shadow-lg hover:shadow-xl' : 'opacity-50 cursor-not-allowed'}
            `}
          >
            <MicrophoneIcon className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-white'}`} />
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
            )}
            
            {/* Recording waveform animation */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping" />
            )}
          </button>

          {/* Status Text */}
          <div className="text-center">
            <p className={`text-sm font-medium ${getRecordingColor()}`}>
              {isLoading ? 'Loading...' : 
               isRecording ? 'Recording... Click to stop' : 
               isPlaying ? 'Playing response...' :
               isConnected ? 'Click to speak' : 
               'Connecting to voice chat...'}
            </p>
            
            {conversationId && (
              <p className="text-xs text-gray-400 mt-1">
                Conversation active
              </p>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-2">
          {/* Text Chat Toggle */}
          {showTextChat && (
            <button
              onClick={() => setShowChatHistory(true)}
              className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>

          {/* End Conversation */}
          {conversationId && (
            <button
              onClick={endConversation}
              className="p-2 text-gray-400 hover:text-red-400 bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Recent Messages Preview */}
        {messages.length > 0 && (
          <div className="w-full max-w-md">
            <div className="bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
              {messages.slice(-2).map((message, index) => (
                <div key={message.id} className="text-xs text-gray-300 mb-1">
                  <span className={`font-medium ${
                    message.role === 'user' ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {message.role === 'user' ? 'You' : 'AI'}:
                  </span>
                  <span className="ml-2">
                    {message.content.length > 50 
                      ? `${message.content.substring(0, 50)}...` 
                      : message.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat History Modal */}
      {showChatHistory && messages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl max-h-96 w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Chat History</h3>
              <button
                onClick={() => setShowChatHistory(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-64 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">{formatTime(message.created_at)}</p>
                    
                    {/* Audio controls for voice messages */}
                    {message.audio_url && (
                      <button className="mt-2 p-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30">
                        {message.role === 'agent' ? (
                          <>
                            <SpeakerWaveIcon className="w-3 h-3 inline mr-1" />
                            Play Audio
                          </>
                        ) : (
                          <>
                            <MicrophoneIcon className="w-3 h-3 inline mr-1" />
                            Voice Message
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Voice Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Voice Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice Provider
                </label>
                <select
                  value={voiceSettings.voice_provider}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, voice_provider: e.target.value }))}
                  className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600"
                >
                  <option value="openai">OpenAI TTS</option>
                  <option value="elevenlabs">ElevenLabs</option>
                </select>
              </div>

              {/* Voice Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Speech Speed: {voiceSettings.voice_speed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={voiceSettings.voice_speed}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, voice_speed: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={voiceSettings.voice_language}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, voice_language: e.target.value }))}
                  className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-600"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                </select>
              </div>

              {/* Auto Transcribe */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Auto-transcribe voice messages
                </label>
                <input
                  type="checkbox"
                  checked={voiceSettings.auto_transcribe}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, auto_transcribe: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={async () => {
                  const success = await updateVoiceSettings(voiceSettings);
                  if (success) {
                    toast.success('Voice settings saved');
                    setShowSettings(false);
                  } else {
                    toast.error('Failed to save settings');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Input Panel */}
      {showTextChat && (
        <div className="mt-4 w-full max-w-md">
          <div className="flex space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!textInput.trim() || !isConnected}
              className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
