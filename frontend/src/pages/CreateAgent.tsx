import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AvatarGenerator from '../components/AvatarGenerator';
import PaymentModal from '../components/Payment/PaymentModal';
import { useAuthStore } from '@/store/authStore';
import { agentService } from '@/services/agentService';

interface AgentConfig {
  name: string;
  archetype: string;
  tone: number;
  humorStyle: string;
  customHumorStyle?: string;
  intelligence: string;
  customIntelligence?: string;
  controversyLevel: number;
  targetTopics: string;
  avoidTopics: string;
  guidelines: string;
  replyFrequency: string;
  postFrequency: string;
  customPostFrequency?: string;
  platforms: string[];
  telegramGroup?: string;
  avatarUrl?: string;
  preferred_voice_type?: string;
  preferred_music_language?: string;
  // Controversy dimensions (doc: Opinion Strength, Disagreement, Hot Take)
  opinionStrength?: number;
  disagreementWillingness?: number;
  hotTakeFrequency?: number;
  // Expertise depth: generalist (0) → specialist (100)
  expertiseDepth?: number;
  // Interaction style: 0 = collaborative/supportive/responsive, 100 = competitive/critical/self-directed
  interactionCollaborativeCompetitive?: number;
  interactionSupportiveCritical?: number;
  interactionResponsiveSelfDirected?: number;
  referenceStyle?: string;
  guidelinePresets?: string[];
}

const personalityArchetypes = [
  // Original 6 personalities
  {
    id: 'witty_troll',
    name: 'Witty Troll',
    description: 'Playful roasting without cruelty',
    emoji: '😈',
    traits: ['Sarcastic', 'Clever', 'Mischievous', 'Non-abusive']
  },
  {
    id: 'tech_sage',
    name: 'Tech Sage',
    description: 'Wisdom with dry humor',
    emoji: '🧘',
    traits: ['Knowledgeable', 'Philosophical', 'Dry humor', 'Insightful']
  },
  {
    id: 'hype_beast',
    name: 'Hype Beast',
    description: 'Enthusiastic but grounded',
    emoji: '🚀',
    traits: ['Energetic', 'Optimistic', 'Trendy', 'Motivational']
  },
  {
    id: 'honest_critic',
    name: 'Honest Critic',
    description: 'Direct but fair feedback',
    emoji: '🎭',
    traits: ['Direct', 'Analytical', 'Fair', 'Witty']
  },
  {
    id: 'quirky_observer',
    name: 'Quirky Observer',
    description: 'Unique perspectives on life',
    emoji: '🔍',
    traits: ['Observant', 'Unique', 'Thoughtful', 'Curious']
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Define your own',
    emoji: '🎨',
    traits: ['Customizable', 'Unique', 'Personal', 'Creative']
  },
  
  // New 6 personalities
  {
    id: 'brand_storyteller',
    name: 'Brand Storyteller',
    description: 'Narrative-driven content and visual storytelling',
    emoji: '📖',
    traits: ['Narrative', 'Visual', 'Emotional', 'Engaging']
  },
  {
    id: 'community_problem_solver',
    name: 'Community Problem-Solver',
    description: 'Proactive in identifying and addressing pain points',
    emoji: '🛠️',
    traits: ['Proactive', 'Solution-focused', 'Supportive', 'Practical']
  },
  {
    id: 'growth_strategist',
    name: 'Growth Strategist',
    description: 'Business development and market expansion insights',
    emoji: '📈',
    traits: ['Strategic', 'Business-focused', 'Partnership-oriented', 'Growth-minded']
  },
  {
    id: 'trend_analyst',
    name: 'Trend Analyst',
    description: 'Industry trends and market predictions',
    emoji: '📊',
    traits: ['Analytical', 'Forward-thinking', 'Trend-aware', 'Strategic']
  },
  {
    id: 'engagement_specialist',
    name: 'Engagement Specialist',
    description: 'Building genuine relationships and fostering community',
    emoji: '🤝',
    traits: ['Community-focused', 'Interactive', 'Relationship-building', 'Engaging']
  },
  {
    id: 'product_evangelist',
    name: 'Product Evangelist',
    description: 'Explaining complex products in accessible ways',
    emoji: '🎯',
    traits: ['Technical', 'Educational', 'Product-focused', 'Accessible']
  },
  // More archetypes (Contrarian, Data Nerd, Visionary, Pragmatist, Storyteller, Skeptic)
  {
    id: 'contrarian',
    name: 'The Contrarian',
    description: 'Challenges consensus, devil\'s advocate',
    emoji: '🔄',
    traits: ['Skeptical', 'Devil\'s advocate', 'Thought-provoking']
  },
  {
    id: 'data_nerd',
    name: 'The Data Nerd',
    description: 'Every argument backed by numbers',
    emoji: '📊',
    traits: ['Analytical', 'Precise', 'Evidence-based']
  },
  {
    id: 'visionary',
    name: 'The Visionary',
    description: 'Big-picture, future-focused, bold predictions',
    emoji: '🔮',
    traits: ['Ambitious', 'Forward-thinking', 'Idealistic']
  },
  {
    id: 'pragmatist',
    name: 'The Pragmatist',
    description: 'Focuses on implementation and reality',
    emoji: '⚙️',
    traits: ['Realistic', 'Grounded', 'Action-oriented']
  },
  {
    id: 'storyteller',
    name: 'The Storyteller',
    description: 'Explains through narratives and metaphors',
    emoji: '📖',
    traits: ['Creative', 'Relatable', 'Illustrative']
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    description: '"Prove it" mentality',
    emoji: '❓',
    traits: ['Critical', 'Questioning', 'Evidence-demanding']
  }
];

export default function CreateAgent() {
  const navigate = useNavigate();
  const { isWhitelisted, user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [agentConfigToPay, setAgentConfigToPay] = useState<any | null>(null);
  
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: '',
    archetype: '',
    tone: 50,
    humorStyle: 'wordplay',
    intelligence: 'street_smart',
    controversyLevel: 30,
    targetTopics: '',
    avoidTopics: '',
    guidelines: '',
    replyFrequency: 'moderate',
    postFrequency: '3-5',
    customPostFrequency: '',
    platforms: [],
    avatarUrl: '',
    preferred_voice_type: '',
    preferred_music_language: ''
  });

  const handleInputChange = (field: keyof AgentConfig, value: any) => {
    setAgentConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlatformToggle = (platform: string) => {
    setAgentConfig(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleAvatarGenerated = (avatarUrl: string) => {
    setAgentConfig(prev => ({
      ...prev,
      avatarUrl: avatarUrl
    }));
  };

  const toggleGuidelinePreset = (preset: string) => {
    setAgentConfig(prev => ({
      ...prev,
      guidelinePresets: prev.guidelinePresets?.includes(preset)
        ? (prev.guidelinePresets || []).filter(p => p !== preset)
        : [...(prev.guidelinePresets || []), preset]
    }));
  };

  const generatePersonalityPreview = () => {
    const selectedArchetype = personalityArchetypes.find(a => a.id === agentConfig.archetype);
    
    const samplePosts = {
      witty_troll: "Just watched someone try to 'hack productivity' by color-coding their to-do list in 47 different shades. Revolutionary! Next up: quantum-enhanced sticky notes. 🌈📝",
      tech_sage: "Everyone's building AI to make humans obsolete, but my smart home can't figure out I want the lights on when I walk into a room. Maybe we should master the basics first? 💡🤖",
      hype_beast: "🚀 Today's reminder: You're not behind, you're not late, you're exactly where you need to be! (Unless you're late for a meeting, then you should probably hurry) ⏰✨",
      honest_critic: "Hot take: Your revolutionary app idea already exists. It's called Google Sheets. Sometimes the boring solution is the right solution. 📊",
      quirky_observer: "Notice how everyone says 'think outside the box' but then gets uncomfortable when you actually do? Maybe the box is just really cozy. 📦🤔",
      custom: "Your AI agent will generate unique content based on your personality settings!",
      brand_storyteller: "Every brand has a story worth telling. Today, let's talk about how the smallest details can create the biggest impact. What's your brand's untold story? 📖✨",
      community_problem_solver: "I noticed many of you are struggling with the same issue. Let me share a solution that worked for others in our community. Sometimes the best answers come from those who've been there. 🛠️💡",
      growth_strategist: "The market is shifting, and smart businesses are adapting. Here's what I'm seeing in the data and how you can position yourself for the next wave of growth. 📈🎯",
      trend_analyst: "While everyone's focused on today's trends, I'm looking at what's coming next. The patterns are clear if you know where to look. Here's what I predict will be big in 6 months. 📊🔮",
      engagement_specialist: "Real connections happen in the comments, not just the posts. I'm here to build genuine relationships with each of you. What's on your mind today? Let's chat! 🤝💬",
      product_evangelist: "Complex doesn't have to mean complicated. Let me break down this new feature in simple terms and show you exactly how it can solve your problem. Ready to dive in? 🎯⚡",
      contrarian: "Everyone's saying X is the future. I'm here to ask: what if it's not? Let's look at the counterargument before we all jump on the bandwagon. 🔄",
      data_nerd: "Before we draw conclusions, here are the numbers: 73% in the survey, 2.4x lift in the test group. The data tells a different story than the hype. 📊",
      visionary: "In 5 years we won't be having this conversation the same way. Here's what I think replaces it—and why we should build for that world now. 🔮",
      pragmatist: "Sounds great on a slide. In reality you'll hit these three blockers. Here's how to get past them without rewriting the plan. ⚙️",
      storyteller: "Think of it like this: you're not buying a tool, you're buying the first chapter of a different story. Let me show you what that chapter looks like. 📖",
      skeptic: "I'd love to believe it. Show me the study, the methodology, and the replication—then we can talk. ❓"
    };

    return samplePosts[agentConfig.archetype as keyof typeof samplePosts] || samplePosts.custom;
  };

  const handleCreateAgentClick = () => {
    // Validation
    if (!agentConfig.name.trim()) {
      toast.error('Please enter an agent name');
      return;
    }
    
    if (!agentConfig.archetype) {
      toast.error('Please select a personality archetype');
      return;
    }
    
    if (agentConfig.platforms.length === 0 && !window.confirm('You haven’t selected any platform. You can add platforms later in Settings. Create anyway?')) {
      return;
    }

    const baseGuidelines = agentConfig.guidelines.split(',').map(g => g.trim()).filter(g => g);
    const allGuidelines = agentConfig.guidelinePresets?.length
      ? [...baseGuidelines, ...agentConfig.guidelinePresets]
      : baseGuidelines;

    const platformKeyMap: Record<string, string> = {
      'X (Twitter)': 'twitter',
      'Discord': 'discord',
      'Website': 'website',
      'Instagram': 'instagram',
    };
    const platformsForApi = agentConfig.platforms.map((p) => platformKeyMap[p] || p);

    // Prepare agent data for payment
    const agentData = {
      name: agentConfig.name,
      description: `${agentConfig.archetype} personality with ${agentConfig.intelligence} intelligence`,
      personality_type: agentConfig.archetype,
      voice_tone: String(agentConfig.tone),
      humor_style: agentConfig.humorStyle === 'custom' && agentConfig.customHumorStyle
        ? `custom: ${agentConfig.customHumorStyle}`
        : agentConfig.humorStyle,
      intelligence_level: agentConfig.intelligence === 'custom' && agentConfig.customIntelligence
        ? `custom: ${agentConfig.customIntelligence}`
        : agentConfig.intelligence,
      controversy_comfort: agentConfig.controversyLevel,
      platforms: platformsForApi,
      target_topics: agentConfig.targetTopics.split(',').map(t => t.trim()).filter(t => t),
      avoid_topics: agentConfig.avoidTopics.split(',').map(t => t.trim()).filter(t => t),
      behavioral_guidelines: allGuidelines,
      avatar_url: agentConfig.avatarUrl,
      preferred_voice_type: agentConfig.preferred_voice_type || null,
      preferred_music_language: agentConfig.preferred_music_language || null,
      opinion_strength: agentConfig.opinionStrength,
      disagreement_willingness: agentConfig.disagreementWillingness,
      hot_take_frequency: agentConfig.hotTakeFrequency,
      expertise_depth: agentConfig.expertiseDepth,
      interaction_collaborative_competitive: agentConfig.interactionCollaborativeCompetitive,
      interaction_supportive_critical: agentConfig.interactionSupportiveCritical,
      interaction_responsive_self_directed: agentConfig.interactionResponsiveSelfDirected,
      reference_style: agentConfig.referenceStyle
    };

    // Skip payment modal for testing - create agent directly
    handleCreateAgent(agentData);
    
    // Original payment flow (commented out for testing):
    // setAgentConfigToPay(agentData);
    // setIsPaymentModalOpen(true);
  };

  const handleCreateAgent = async (agentData: any) => {
    try {
      setIsCreating(true);
      
      // Create agent via API (payment disabled for testing)
      const response = await agentService.createAgent(agentData);
      
      if (response.success) {
        toast.success('Agent created successfully!');
        navigate('/agents');
      } else {
        throw new Error('Failed to create agent');
      }
    } catch (error: any) {
      console.error('Agent creation error:', error);
      toast.error(error.message || 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePaymentConfirmed = async () => {
    if (!agentConfigToPay) return;

    try {
      setIsCreating(true);

      // Iqonga v1: no wallet; create agent without payment
      const result = await agentService.createAgent(agentConfigToPay);
      
      if (result.success) {
        toast.success('🎉 AI Agent Created! Your personality-driven agent is ready!');
        navigate('/agents');
      } else {
        throw new Error('Failed to create agent');
      }
      
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      toast.error(error.message || 'Failed to create AI agent. Please try again.');
    } finally {
      setIsCreating(false);
      setIsPaymentModalOpen(false);
      setAgentConfigToPay(null);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          🎭 Create Your AI Agent
        </h1>
        <p className="text-gray-400 text-lg">
          Design a unique personality that will represent you across social platforms
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="glass-card p-8">
        {/* Step 1: Personality & Core Traits */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Step 1: Choose Personality</h2>
            
            {/* Agent Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Agent Name
              </label>
              <input
                type="text"
                value={agentConfig.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., The Witty Troll, Tech Sage"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Personality Archetypes */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Personality Archetype
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalityArchetypes.map((archetype) => (
                  <div
                    key={archetype.id}
                    onClick={() => handleInputChange('archetype', archetype.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      agentConfig.archetype === archetype.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{archetype.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-white">{archetype.name}</h3>
                        <p className="text-sm text-gray-400">{archetype.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {archetype.traits.map((trait) => (
                        <span
                          key={trait}
                          className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tone Slider */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Primary Tone
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={agentConfig.tone}
                  onChange={(e) => handleInputChange('tone', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Serious & Professional</span>
                  <span>Playful & Sarcastic</span>
                </div>
              </div>
            </div>

            {/* Humor Style */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Humor Style
              </label>
              <select
                value={agentConfig.humorStyle}
                onChange={(e) => handleInputChange('humorStyle', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="wordplay">Wordplay & Puns</option>
                <option value="observational">Observational Comedy</option>
                <option value="self_deprecating">Self-Deprecating</option>
                <option value="dry_wit">Dry Wit & Sarcasm</option>
                <option value="absurdist">Absurdist Humor</option>
                <option value="deadpan">Deadpan</option>
                <option value="witty_comebacks">Witty Comebacks</option>
                <option value="satire">Satire & Parody</option>
                <option value="warm_playful">Warm & Playful</option>
                <option value="minimal">Minimal / No humor</option>
                <option value="custom">Custom (describe below)</option>
              </select>
              {agentConfig.humorStyle === 'custom' && (
                <input
                  type="text"
                  value={agentConfig.customHumorStyle || ''}
                  onChange={(e) => handleInputChange('customHumorStyle', e.target.value)}
                  placeholder="e.g. Dad jokes, dark humor, puns only on Fridays"
                  className="mt-2 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
          </div>
        )}

        {/* Step 2: Intelligence & Behavior */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Step 2: Intelligence & Behavior</h2>
            
            {/* Intelligence Level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Intelligence Level
              </label>
              <select
                value={agentConfig.intelligence}
                onChange={(e) => handleInputChange('intelligence', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="street_smart">Street Smart - Practical wisdom</option>
                <option value="academic">Academic - Educated references</option>
                <option value="tech_savvy">Tech Savvy - Industry knowledge</option>
                <option value="pop_culture">Pop Culture - Current trends</option>
                <option value="analytical">Analytical - Data and logic first</option>
                <option value="creative">Creative - Ideas and possibilities</option>
                <option value="industry_expert">Industry Expert - Deep domain focus</option>
                <option value="generalist">Generalist - Broad, surface-level</option>
                <option value="custom">Custom (describe below)</option>
              </select>
              {agentConfig.intelligence === 'custom' && (
                <input
                  type="text"
                  value={agentConfig.customIntelligence || ''}
                  onChange={(e) => handleInputChange('customIntelligence', e.target.value)}
                  placeholder="e.g. Finance and markets, Gaming culture, Healthcare"
                  className="mt-2 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            {/* Controversy Comfort Level */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Controversy Comfort Level
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={agentConfig.controversyLevel}
                  onChange={(e) => handleInputChange('controversyLevel', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Play It Safe</span>
                  <span>Stir The Pot</span>
                </div>
              </div>
            </div>

            {/* Controversy Dimensions (optional) */}
            <div className="space-y-4 border border-gray-700 rounded-lg p-4 bg-gray-800/30">
              <h3 className="text-sm font-medium text-gray-300">Controversy Dimensions (optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Opinion Strength: Mild suggestions → Strong convictions</label>
                  <input type="range" min="0" max="100" value={agentConfig.opinionStrength ?? 50}
                    onChange={(e) => handleInputChange('opinionStrength', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Disagreement: Avoids conflict → Seeks debate</label>
                  <input type="range" min="0" max="100" value={agentConfig.disagreementWillingness ?? 50}
                    onChange={(e) => handleInputChange('disagreementWillingness', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hot Take Frequency: Rarely → Often provocative</label>
                  <input type="range" min="0" max="100" value={agentConfig.hotTakeFrequency ?? 30}
                    onChange={(e) => handleInputChange('hotTakeFrequency', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                </div>
              </div>
            </div>

            {/* Expertise Depth */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">Expertise Depth</label>
              <div className="space-y-2">
                <input type="range" min="0" max="100" value={agentConfig.expertiseDepth ?? 50}
                  onChange={(e) => handleInputChange('expertiseDepth', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Generalist — many topics at surface level</span>
                  <span>Specialist — deep in narrow areas</span>
                </div>
              </div>
            </div>

            {/* Interaction Style (with other agents) */}
            <div className="space-y-4 border border-gray-700 rounded-lg p-4 bg-gray-800/30">
              <h3 className="text-sm font-medium text-gray-300">Interaction Style (with other agents)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Collaborative ← → Competitive</label>
                  <input type="range" min="0" max="100" value={agentConfig.interactionCollaborativeCompetitive ?? 50}
                    onChange={(e) => handleInputChange('interactionCollaborativeCompetitive', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Supportive ← → Critical</label>
                  <input type="range" min="0" max="100" value={agentConfig.interactionSupportiveCritical ?? 50}
                    onChange={(e) => handleInputChange('interactionSupportiveCritical', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Responsive (replies often) ← → Self-directed (starts threads)</label>
                  <input type="range" min="0" max="100" value={agentConfig.interactionResponsiveSelfDirected ?? 50}
                    onChange={(e) => handleInputChange('interactionResponsiveSelfDirected', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider" />
                </div>
              </div>
            </div>

            {/* Reference Style */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Reference Style (how agent cites information)</label>
              <select
                value={agentConfig.referenceStyle ?? 'data_driven'}
                onChange={(e) => handleInputChange('referenceStyle', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="academic">Academic — formal citations, sources, research</option>
                <option value="anecdotal">Anecdotal — "In my experience...", "I've seen..."</option>
                <option value="data_driven">Data-driven — statistics, metrics, numbers</option>
                <option value="philosophical">Philosophical — principles, theories, frameworks</option>
                <option value="pop_culture">Pop culture — memes, current events, trending topics</option>
              </select>
            </div>

            {/* Target Topics */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Target Topics (comma separated)
              </label>
              <textarea
                value={agentConfig.targetTopics}
                onChange={(e) => handleInputChange('targetTopics', e.target.value)}
                placeholder="e.g., tech startups, productivity culture, social media trends"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Topics to Avoid */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Topics to Avoid (comma separated)
              </label>
              <textarea
                value={agentConfig.avoidTopics}
                onChange={(e) => handleInputChange('avoidTopics', e.target.value)}
                placeholder="e.g., politics, personal tragedies, mental health"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Behavioral Guidelines */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Behavioral Guidelines
              </label>
              <textarea
                value={agentConfig.guidelines}
                onChange={(e) => handleInputChange('guidelines', e.target.value)}
                placeholder="e.g., Be clever not cruel, Punch up not down, Keep it family-friendly"
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Guideline presets (from doc) */}
            <div className="space-y-3 border border-gray-700 rounded-lg p-4 bg-gray-800/30">
              <h3 className="text-sm font-medium text-gray-300">Add preset guidelines (optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Show, don\'t tell',
                  'Ask questions to explore topics',
                  'Use analogies to explain complex ideas',
                  'Challenge assumptions constructively',
                  'Lead with empathy',
                  'Steelman opponents\' arguments before responding',
                  'Admit when you don\'t know something',
                  'Change your mind when presented with evidence',
                  'Focus on ideas, not personal attacks',
                  'Prioritize accuracy over engagement',
                  'Favor nuance over hot takes',
                  'Question your own biases',
                  'Seek truth over being right'
                ].map((preset) => (
                  <label key={preset} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agentConfig.guidelinePresets?.includes(preset) ?? false}
                      onChange={() => toggleGuidelinePreset(preset)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <span>"{preset}"</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Music Generation Preferences (Optional) */}
            <div className="border-t border-gray-700 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Music Generation Preferences (Optional)</h3>
              <p className="text-sm text-gray-400 mb-4">
                Set a consistent voice type and language for music generated by this agent. These preferences will be used for all music created by this agent.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preferred Voice Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Preferred Voice Type
                  </label>
                  <select
                    value={agentConfig.preferred_voice_type || ''}
                    onChange={(e) => handleInputChange('preferred_voice_type', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Use Company Default</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="neutral">Neutral</option>
                    <option value="auto">Auto (Let AI Decide)</option>
                    <option value="tenor">Tenor</option>
                    <option value="alto">Alto</option>
                    <option value="bass">Bass</option>
                    <option value="soprano">Soprano</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Leave empty to use company profile setting
                  </p>
                </div>

                {/* Preferred Music Language */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Preferred Music Language
                  </label>
                  <select
                    value={agentConfig.preferred_music_language || ''}
                    onChange={(e) => handleInputChange('preferred_music_language', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Use Company Default</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                    <option value="ru">Russian</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Leave empty to use company profile setting
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Avatar Generation */}
        {currentStep === 3 && (
          <AvatarGenerator 
            agentConfig={{
              name: agentConfig.name,
              personality: agentConfig.archetype,
              specialization: agentConfig.intelligence
            }}
            onAvatarGenerated={handleAvatarGenerated}
          />
        )}

        {/* Step 4: Platforms & Activity */}
        {currentStep === 4 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white mb-6">Step 4: Platforms & Activity</h2>
            
            {/* Platform Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Select Platforms <span className="text-gray-500 font-normal">(recommended: at least one)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'X (Twitter)', label: 'X (Twitter)', icon: '🐦' },
                  { key: 'Discord', label: 'Discord', icon: '💬' },
                  { key: 'Website', label: 'Website', icon: '🌐' },
                  { key: 'Instagram', label: 'Instagram', icon: '📸' }
                ].map(({ key, label, icon }) => (
                  <div
                    key={key}
                    onClick={() => handlePlatformToggle(key)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 text-center ${
                      agentConfig.platforms.includes(key)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{icon}</div>
                    <span className="text-white font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Telegram Group Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Telegram Group (Optional)
              </label>
              <div className="space-y-2">
                <select
                  value={agentConfig.telegramGroup || ''}
                  onChange={(e) => handleInputChange('telegramGroup', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">No Telegram Group</option>
                  <option value="connect_later">Connect Telegram Group Later</option>
                </select>
                <p className="text-sm text-gray-400">
                  You can connect a Telegram group after creating the agent in the Telegram settings.
                </p>
              </div>
            </div>

            {/* Reply Activity Level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Reply Activity Level
              </label>
              <select
                value={agentConfig.replyFrequency}
                onChange={(e) => handleInputChange('replyFrequency', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="conservative">Conservative - Only reply when highly relevant</option>
                <option value="moderate">Moderate - Regular engagement</option>
                <option value="active">Active - Frequent replies</option>
                <option value="aggressive">Aggressive - Reply to most relevant content</option>
              </select>
            </div>

            {/* Posting Frequency */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Posting Frequency
              </label>
              <select
                value={agentConfig.postFrequency}
                onChange={(e) => handleInputChange('postFrequency', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="1-2">1-2 posts per day</option>
                <option value="3-5">3-5 posts per day</option>
                <option value="6-10">6-10 posts per day</option>
                <option value="custom">Custom schedule</option>
              </select>
              {agentConfig.postFrequency === 'custom' && (
                <input
                  type="text"
                  value={agentConfig.customPostFrequency || ''}
                  onChange={(e) => handleInputChange('customPostFrequency', e.target.value)}
                  placeholder="e.g. 2-4 per day, or 5-10 per week"
                  className="mt-2 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            {/* Preview Section */}
            {showPreview && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">🎭 Personality Preview</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-white">{agentConfig.name || 'Your AI Agent'}</h4>
                    <p className="text-sm text-gray-400">
                      {personalityArchetypes.find(a => a.id === agentConfig.archetype)?.name || 'No archetype selected'}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Sample Post:</h5>
                    <div className="bg-gray-900/50 rounded p-3 text-white text-sm">
                      "{generatePersonalityPreview()}"
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-12">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors"
            >
              Back
            </button>
          ) : <div />}

          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg shadow-lg hover:scale-105 transform transition-transform"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleCreateAgentClick}
              disabled={isCreating}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-lg shadow-lg hover:scale-105 transform transition-transform disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100"
            >
              {isCreating ? 'Creating Your Agent...' : '🚀 Create Agent (Free)'}
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setAgentConfigToPay(null);
        }}
        onConfirm={handlePaymentConfirmed}
        title="Confirm Agent Creation Payment"
        description="You are about to create a new AI Agent."
        amount=""
        currency=""
        isLoading={isCreating}
      />
    </div>
  );
}