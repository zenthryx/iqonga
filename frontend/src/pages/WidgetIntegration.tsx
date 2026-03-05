import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/api';
import { 
  CodeBracketIcon, 
  ClipboardDocumentIcon,
  EyeIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface WidgetSettings {
  id?: string;
  agent_id: string;
  widget_title: string;
  widget_subtitle: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  border_radius: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  show_agent_avatar: boolean;
  show_typing_indicator: boolean;
  enable_sound_notifications: boolean;
  voice_enabled: boolean;
  max_messages_per_session: number;
  session_timeout_minutes: number;
  welcome_message: string;
  offline_message: string;
  is_active: boolean;
}

interface EmbedCode {
  agentId: string;
  agentName: string;
  embedCode: string;
  instructions: string[];
}

interface Analytics {
  period: string;
  sessionStats: {
    total_sessions: string;
    completed_sessions: string;
    avg_session_duration_minutes: string;
  };
  messageStats: {
    total_messages: string;
    visitor_messages: string;
    agent_messages: string;
  };
  dailyActivity: Array<{
    date: string;
    sessions: string;
    completed_sessions: string;
  }>;
}

const WidgetIntegration: React.FC = () => {
  const { id: agentId } = useParams<{ id: string }>();
  console.log('WidgetIntegration - Raw agentId from useParams:', agentId);
  console.log('WidgetIntegration - agentId type:', typeof agentId);
  console.log('WidgetIntegration - agentId === "undefined":', agentId === 'undefined');
  const [activeTab, setActiveTab] = useState<'settings' | 'embed' | 'analytics'>('settings');
  const [settings, setSettings] = useState<WidgetSettings>({
    agent_id: agentId || '',
    widget_title: 'Chat with our AI Assistant',
    widget_subtitle: 'Ask me anything!',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    text_color: '#FFFFFF',
    background_color: '#1F2937',
    border_radius: 12,
    position: 'bottom-right',
    show_agent_avatar: true,
    show_typing_indicator: true,
    enable_sound_notifications: true,
    voice_enabled: true,
    max_messages_per_session: 50,
    session_timeout_minutes: 30,
    welcome_message: 'Hello! I\'m here to help. How can I assist you today?',
    offline_message: 'Sorry, I\'m currently offline. Please leave a message and I\'ll get back to you soon!',
    is_active: true
  });
  const [embedCode, setEmbedCode] = useState<EmbedCode | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('WidgetIntegration - agentId:', agentId);
    if (agentId && agentId !== 'undefined') {
      loadWidgetSettings();
      loadEmbedCode();
      loadAnalytics();
    }
  }, [agentId]);

  const loadWidgetSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/widget/settings/${agentId}`);
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading widget settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmbedCode = async () => {
    try {
      console.log('Loading embed code for agentId:', agentId);
      const response = await apiService.get(`/widget/embed/${agentId}`);
      console.log('Embed code response:', response);
      if (response.success) {
        setEmbedCode(response.data);
        console.log('Embed code set:', response.data);
      } else {
        console.error('Failed to load embed code:', response);
      }
    } catch (error) {
      console.error('Error loading embed code:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await apiService.get(`/widget/analytics/${agentId}?period=7d`);
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const saveSettings = async () => {
    if (!agentId || agentId === 'undefined') {
      toast.error('Invalid agent ID');
      return;
    }
    
    try {
      setSaving(true);
      console.log('Saving settings for agentId:', agentId);
      const response = await apiService.put(`/widget/settings/${agentId}`, settings);
      if (response.success) {
        toast.success('Widget settings saved successfully!');
        setSettings(response.data);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyEmbedCode = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode.embedCode);
      toast.success('Embed code copied to clipboard!');
    }
  };

  const previewWidget = () => {
    if (!embedCode) {
      toast.error('Embed code not loaded yet. Please wait a moment and try again.');
      return;
    }

    // Open preview in new window
    const previewWindow = window.open('', '_blank', 'width=400,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Preview</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
            .preview-content { text-align: center; margin-top: 100px; }
            .preview-note { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; color: #1976d2; }
            .debug-info { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="preview-content">
            <h2>Widget Preview</h2>
            <div class="preview-note">
              <strong>Note:</strong> This is a preview of how the widget will appear on your website.
            </div>
            <p>The chat widget should appear in the bottom-right corner.</p>
            <p>Look for the blue chat button and click it to start chatting!</p>
            <div class="debug-info">
              <div>Agent ID: ${embedCode.agentId}</div>
              <div>Agent Name: ${embedCode.agentName}</div>
              <div>Check browser console for any errors</div>
            </div>
          </div>
          ${embedCode.embedCode}
          <script>
            // Add some debugging
            console.log('Preview window loaded');
            console.log('Agent ID:', '${embedCode.agentId}');
            
            // Check if widget loaded after a delay
            setTimeout(() => {
              const widget = document.getElementById('ajentrix-chat-widget');
              if (widget) {
                console.log('✅ Widget found in DOM');
              } else {
                console.log('❌ Widget not found in DOM');
                console.log('Available elements:', document.querySelectorAll('*'));
              }
            }, 2000);
          </script>
        </body>
        </html>
      `);
      
      // Ensure the document is fully loaded before closing
      previewWindow.document.close();
    }
  };

  const handleSettingChange = (field: keyof WidgetSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!agentId || agentId === 'undefined') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Invalid Agent ID</div>
          <div className="text-gray-400">Please navigate to this page from an agent detail page.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Website Chat Widget</h1>
          <p className="text-gray-400 mt-1">
            Embed your AI agent on your website for visitors to chat with
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm ${
            settings.is_active 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {settings.is_active ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span>Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'embed'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CodeBracketIcon className="w-5 h-5" />
          <span>Embed Code</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ChartBarIcon className="w-5 h-5" />
          <span>Analytics</span>
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="glass-card p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Settings */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Basic Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Widget Title
                </label>
                <input
                  type="text"
                  value={settings.widget_title}
                  onChange={(e) => handleSettingChange('widget_title', e.target.value)}
                  className="input-field w-full"
                  placeholder="Chat with our AI Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Widget Subtitle
                </label>
                <input
                  type="text"
                  value={settings.widget_subtitle}
                  onChange={(e) => handleSettingChange('widget_subtitle', e.target.value)}
                  className="input-field w-full"
                  placeholder="Ask me anything!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={settings.welcome_message}
                  onChange={(e) => handleSettingChange('welcome_message', e.target.value)}
                  className="input-field w-full h-20"
                  placeholder="Hello! I'm here to help. How can I assist you today?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Offline Message
                </label>
                <textarea
                  value={settings.offline_message}
                  onChange={(e) => handleSettingChange('offline_message', e.target.value)}
                  className="input-field w-full h-20"
                  placeholder="Sorry, I'm currently offline. Please leave a message and I'll get back to you soon!"
                />
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Appearance</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-600"
                    />
                    <input
                      type="text"
                      value={settings.primary_color}
                      onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                      className="input-field flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-600"
                    />
                    <input
                      type="text"
                      value={settings.secondary_color}
                      onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                      className="input-field flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position
                </label>
                <select
                  value={settings.position}
                  onChange={(e) => handleSettingChange('position', e.target.value)}
                  className="input-field w-full"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Border Radius
                </label>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={settings.border_radius}
                  onChange={(e) => handleSettingChange('border_radius', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-400 mt-1">
                  {settings.border_radius}px
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white">Features</h4>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Show Agent Avatar</label>
                  <input
                    type="checkbox"
                    checked={settings.show_agent_avatar}
                    onChange={(e) => handleSettingChange('show_agent_avatar', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Show Typing Indicator</label>
                  <input
                    type="checkbox"
                    checked={settings.show_typing_indicator}
                    onChange={(e) => handleSettingChange('show_typing_indicator', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Enable Sound Notifications</label>
                  <input
                    type="checkbox"
                    checked={settings.enable_sound_notifications}
                    onChange={(e) => handleSettingChange('enable_sound_notifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Enable Voice Chat</label>
                  <input
                    type="checkbox"
                    checked={settings.voice_enabled}
                    onChange={(e) => handleSettingChange('voice_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">Widget Active</label>
                  <input
                    type="checkbox"
                    checked={settings.is_active}
                    onChange={(e) => handleSettingChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn-primary flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Embed Code Tab */}
      {activeTab === 'embed' && (
        <div className="glass-card p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Embed Code</h3>
              <div className="flex space-x-2">
                <button
                  onClick={previewWidget}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={copyEmbedCode}
                  className="btn-primary flex items-center space-x-2"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  <span>Copy Code</span>
                </button>
              </div>
            </div>

            {embedCode && (
              <>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    <code>{embedCode.embedCode}</code>
                  </pre>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-blue-400 mb-3">Integration Instructions</h4>
                  <ol className="space-y-2 text-gray-300">
                    {embedCode.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-400 font-medium">{index + 1}.</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-green-400 mb-2">Features</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Real-time chat with your AI agent</li>
                    <li>• Responsive design for mobile and desktop</li>
                    <li>• Customizable appearance and colors</li>
                    <li>• Session management and analytics</li>
                    <li>• Easy integration with any website</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="glass-card p-6">
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Widget Analytics</h3>
            
            {analytics ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {analytics.sessionStats.total_sessions}
                        </div>
                        <div className="text-sm text-gray-400">Total Sessions</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <ChartBarIcon className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {analytics.messageStats.total_messages}
                        </div>
                        <div className="text-sm text-gray-400">Total Messages</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <EyeIcon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {Math.round(parseFloat(analytics.sessionStats.avg_session_duration_minutes) || 0)}m
                        </div>
                        <div className="text-sm text-gray-400">Avg Session Duration</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Activity */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-white mb-4">Daily Activity (Last 7 Days)</h4>
                  <div className="space-y-2">
                    {analytics.dailyActivity.map((day, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                        <div className="text-sm text-gray-300">
                          {new Date(day.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-blue-400">{day.sessions} sessions</span>
                          <span className="text-green-400">{day.completed_sessions} completed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No analytics data available yet. Analytics will appear once visitors start using the widget.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetIntegration;
