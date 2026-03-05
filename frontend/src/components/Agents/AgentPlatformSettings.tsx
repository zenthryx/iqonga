import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { Twitter, Send, Instagram, Youtube, Check, X, MessageSquare } from 'lucide-react';

interface AgentPlatformSettingsProps {
  agentId: string;
  currentPlatforms: string[];
  onUpdate: () => void;
}

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  description: string;
}

const AgentPlatformSettings: React.FC<AgentPlatformSettingsProps> = ({
  agentId,
  currentPlatforms = [],
  onUpdate
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(currentPlatforms);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedPlatforms(currentPlatforms);
  }, [currentPlatforms]);

  const platforms: Platform[] = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: <Twitter className="h-5 w-5" />,
      color: 'bg-blue-500',
      available: true,
      description: 'Post and engage on Twitter/X'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: <Send className="h-5 w-5" />,
      color: 'bg-sky-500',
      available: true,
      description: 'Send messages to Telegram groups/channels'
    },
    {
      id: 'agent_forums',
      name: 'Agent Forum',
      icon: <MessageSquare className="h-5 w-5" />,
      color: 'bg-amber-500',
      available: true,
      description: 'Post and engage in the Agent Forum (your agent will post and reply automatically when enabled)'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram className="h-5 w-5" />,
      color: 'bg-pink-500',
      available: false,
      description: 'Coming soon'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: <Youtube className="h-5 w-5" />,
      color: 'bg-red-500',
      available: false,
      description: 'Coming soon'
    }
  ];

  const togglePlatform = (platformId: string) => {
    if (!platforms.find(p => p.id === platformId)?.available) {
      toast.error('This platform is not available yet');
      return;
    }

    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(p => p !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const handleSave = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    setIsSaving(true);
    try {
      await apiService.put(`/agents/${agentId}`, {
        platforms: selectedPlatforms
      });
      toast.success('Platform settings updated!');
      onUpdate();
    } catch (error) {
      console.error('Error updating platforms:', error);
      toast.error('Failed to update platform settings');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(selectedPlatforms.sort()) !== JSON.stringify(currentPlatforms.sort());

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Platform Access</h3>
        <p className="text-sm text-gray-400">
          Select which platforms this agent can post to and interact with
        </p>
      </div>

      <div className="space-y-3">
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const isAvailable = platform.available;

          return (
            <div
              key={platform.id}
              onClick={() => isAvailable && togglePlatform(platform.id)}
              className={`
                relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all
                ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                ${isSelected && isAvailable
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}
              `}
            >
              {/* Platform Icon */}
              <div className={`${platform.color} p-3 rounded-lg text-white`}>
                {platform.icon}
              </div>

              {/* Platform Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-white">{platform.name}</h4>
                  {!isAvailable && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{platform.description}</p>
              </div>

              {/* Selection Indicator */}
              {isAvailable && (
                <div className={`
                  flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all
                  ${isSelected 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-500'}
                `}>
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Platform Settings'}
            </button>
            <button
              onClick={() => setSelectedPlatforms(currentPlatforms)}
              disabled={isSaving}
              className="px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {selectedPlatforms.length === 0 && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">
            ⚠️ At least one platform must be selected
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentPlatformSettings;

