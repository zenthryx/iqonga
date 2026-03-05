import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import { getApiBaseUrl } from '@/utils/domain';

interface AgentConfig {
  name: string;
  personalityType: string;
  voiceTone: string;
  humorStyle: string;
  intelligenceLevel: string;
  controversyComfort: number;
  targetTopics: string[];
  avoidTopics: string[];
  platforms: string[];
  behavioralGuidelines: string[];
}

const PERSONALITY_TYPES = [
  {
    id: 'witty_troll',
    name: 'The Witty Troll',
    description: 'Playfully roasting with charm, never cruel',
    example: '"Just saw someone tweet \'I\'m not like other people.\' Yeah, other people usually have better grammar. 🤷‍♂️"'
  },
  {
    id: 'tech_sage',
    name: 'The Tech Sage',
    description: 'Wisdom with a side of dry humor',
    example: '"Everyone\'s building AI to replace humans. I\'m just here trying to build AI that can replace my LinkedIn posts."'
  },
  {
    id: 'hype_beast',
    name: 'The Hype Beast',
    description: 'Enthusiasm meets reality',
    example: '"🚀 GM! Today we\'re not just shipping code, we\'re shipping DREAMS! (Also debugging yesterday\'s nightmares but that\'s less quotable)"'
  },
  {
    id: 'honest_critic',
    name: 'The Honest Critic',
    description: 'Truth with a touch of sass',
    example: '"Hot take: Your \'disruptive\' startup isn\'t disrupting anything except my faith in humanity\'s business sense."'
  }
];

export default function AgentCreator() {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    personalityType: '',
    voiceTone: '',
    humorStyle: '',
    intelligenceLevel: '',
    controversyComfort: 30,
    targetTopics: [],
    avoidTopics: [],
    platforms: ['twitter'],
    behavioralGuidelines: []
  });

  const handleCreateAgent = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in first');
      return;
    }

    setLoading(true);
    try {
      // Generate agent avatar and metadata
      const agentsUrl = `${getApiBaseUrl().replace(/\/$/, '')}/agents`;
      const response = await fetch(agentsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(config)
      });

      const contentType = response.headers.get('content-type');
      const result = contentType?.includes('application/json')
        ? await response.json()
        : { success: false, error: response.status === 404 ? 'API not found. Is the backend running on the correct port?' : `Request failed (${response.status})` };

      if (result.success) {
        toast.success('AI Agent created successfully!');
        const agentId = result.data?.id ?? result.mintAddress;
        window.location.href = agentId ? `/agents/${agentId}` : '/agents';
      } else {
        toast.error(result.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Agent creation failed:', error);
      toast.error('Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Choose Your AI Agent Personality</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERSONALITY_TYPES.map((personality) => (
          <div
            key={personality.id}
            className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
              config.personalityType === personality.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => setConfig({ ...config, personalityType: personality.id })}
          >
            <h3 className="text-lg font-semibold mb-2">{personality.name}</h3>
            <p className="text-gray-600 mb-3">{personality.description}</p>
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm italic">{personality.example}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setStep(2)}
          disabled={!config.personalityType}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Configure Agent Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            placeholder="e.g., The Witty Troll, Tech Sage"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice Tone
          </label>
          <select
            value={config.voiceTone}
            onChange={(e) => setConfig({ ...config, voiceTone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select tone...</option>
            <option value="sarcastic_charming">Sarcastic but Charming</option>
            <option value="wise_dry">Wise with Dry Humor</option>
            <option value="enthusiastic_grounded">Enthusiastic but Grounded</option>
            <option value="direct_fair">Direct but Fair</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Humor Style
          </label>
          <select
            value={config.humorStyle}
            onChange={(e) => setConfig({ ...config, humorStyle: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select humor style...</option>
            <option value="wordplay">Wordplay & Puns</option>
            <option value="observational">Observational Comedy</option>
            <option value="self_deprecating">Self-Deprecating</option>
            <option value="dry_wit">Dry Wit & Sarcasm</option>
            <option value="absurdist">Absurdist Humor</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intelligence Level
          </label>
          <select
            value={config.intelligenceLevel}
            onChange={(e) => setConfig({ ...config, intelligenceLevel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select intelligence level...</option>
            <option value="street_smart">Street Smart - Practical wisdom</option>
            <option value="academic">Academic - Educated references</option>
            <option value="tech_savvy">Tech Savvy - Industry knowledge</option>
            <option value="pop_culture">Pop Culture - Current trends</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Controversy Comfort Level: {config.controversyComfort}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={config.controversyComfort}
          onChange={(e) => setConfig({ ...config, controversyComfort: Number(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Play It Safe</span>
          <span>Stir The Pot</span>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep(1)}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
        >
          Previous
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!config.name || !config.voiceTone || !config.humorStyle || !config.intelligenceLevel}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Topics & Guidelines</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Topics (comma separated)
        </label>
        <textarea
          value={config.targetTopics.join(', ')}
          onChange={(e) => setConfig({ 
            ...config, 
            targetTopics: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
          })}
          placeholder="e.g., tech startups, productivity culture, social media trends"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Topics to Avoid (comma separated)
        </label>
        <textarea
          value={config.avoidTopics.join(', ')}
          onChange={(e) => setConfig({ 
            ...config, 
            avoidTopics: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
          })}
          placeholder="e.g., politics, personal tragedies, mental health"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Behavioral Guidelines
        </label>
        <textarea
          value={config.behavioralGuidelines.join('\n')}
          onChange={(e) => setConfig({ 
            ...config, 
            behavioralGuidelines: e.target.value.split('\n').filter(Boolean)
          })}
          placeholder="e.g., Be clever not cruel&#10;Punch up not down&#10;Keep it family-friendly"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platforms
        </label>
        <div className="space-y-2">
          {['twitter', 'instagram', 'linkedin'].map((platform) => (
            <label key={platform} className="flex items-center">
              <input
                type="checkbox"
                checked={config.platforms.includes(platform)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConfig({ ...config, platforms: [...config.platforms, platform] });
                  } else {
                    setConfig({ ...config, platforms: config.platforms.filter(p => p !== platform) });
                  }
                }}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 capitalize">{platform}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep(2)}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
        >
          Previous
        </button>
        <button
          onClick={handleCreateAgent}
          disabled={loading || config.targetTopics.length === 0}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {loading ? 'Creating AI Agent...' : 'Create AI Agent'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div className={`w-12 h-1 mx-2 ${
                  step > stepNum ? 'bg-purple-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
} 