import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, ChevronDownIcon, DocumentTextIcon, CogIcon, UserIcon, ChartBarIcon, CreditCardIcon, ShieldCheckIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '@/components/SEO';

const Documentation: React.FC = () => {
  const { t, language } = useLanguage();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [sectionsTranslated, setSectionsTranslated] = useState<any[]>([]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const documentationSectionsBase = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'what-is-iqonga',
          title: 'What is Iqonga?',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Iqonga is an open-source Agentic framework. Users and businesses build solutions based on AI agents—from content and support bots to internal tools. 
                Create and deploy agents, connect channels (Telegram, Email AI, social platforms), and extend the framework or list solutions in the marketplace.
              </p>
              <div className="bg-teal-900/20 border border-teal-500/30 rounded-lg p-4">
                <h4 className="text-teal-400 font-semibold mb-2">Key capabilities:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• AI Agent creation with multiple personality types</li>
                  <li>• Content generation and scheduled posting</li>
                  <li>• Channel integrations (Twitter/X, Instagram, LinkedIn, Telegram, Discord, Email AI, Agent Forum)</li>
                  <li>• Company knowledge base for agent training</li>
                  <li>• Performance analytics and evolution</li>
                  <li>• Scheduled Posting and Content Management</li>
                  <li>• Video Generation (Veo, Runway, HeyGen Avatar Videos)</li>
                  <li>• AI Music & Lyrics Generation</li>
                  <li>• Long-Form Content Generator (Blogs, Newsletters, Articles, Whitepapers)</li>
                  <li>• Creative Writing Assistant (Stories, Books, Poems, Screenplays)</li>
                  <li>• eBook Creator (Professional eBook creation with AI tools, multi-format exports, audiobooks, and publishing)</li>
                  <li>• Content Brief Generator (Strategic planning with audience analysis, SEO keywords, competitor insights)</li>
                  <li>• Multi-Modal Content Creation (Text + Images + Videos in one package)</li>
                  <li>• Content Series Generator (Multi-piece campaigns with templates and progression logic)</li>
                  <li>• Content Repurposing Engine (Convert content to multiple platform formats)</li>
                  <li>• Visual Content Calendar (Drag-and-drop content planning with calendar view)</li>
                  <li>• Content Optimization Assistant (Real-time readability, SEO, and engagement optimization)</li>
                  <li>• Content Research Integration (Research-backed content with citations and fact-checking)</li>
                  <li>• Content Performance Prediction (Engagement scores, viral potential, best time to post)</li>
                  <li>• AI Image Editor (Background Removal, Object Removal, Upscaling, Logo Maker)</li>
                  <li>• Platform Chat (Real-time messaging, group chats, file sharing, privacy controls)</li>
                  <li>• Crypto Intelligence (X/Twitter monitoring, sentiment analysis, trading signals)</li>
                  <li>• Keyword & Hashtag Intelligence (Keyword monitoring, sentiment analysis, real-time alerts, research)</li>
                  <li>• Twitter Analytics (Follower growth, post performance, mentions, best time to post, AI insights)</li>
                  <li>• Influencer Discovery (AI-powered matching, analytics, campaign tracking)</li>
                  <li>• Smart Ad Generator (Multi-platform AI ad creation)</li>
                  <li>• Smart Campaign Generator (AI campaign strategy and automation)</li>
                  <li>• Smart Inbox - AI Email Assistant (Gmail Integration with Unified Inbox)</li>
                  <li>• AI Calendar Assistant (Google Calendar Integration)</li>
                  <li>• Enhanced Telegram Integration (Multi-agent, Multi-group support)</li>
                  <li>• WordPress Plugin with WooCommerce Integration</li>
                  <li>• Company Knowledge Base for Agent Training</li>
                  <li>• Brand Book Management</li>
                  <li>• Product Image Management</li>
                  <li>• Sales & CRM (Lead Management, Pipeline, Activities, Analytics)</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'auth-setup',
          title: 'Authentication',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Iqonga uses email-based authentication. Sign in with your email; you'll receive a magic code to log in—no password or wallet required.
              </p>
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Getting started:</h4>
                <ul className="text-gray-300 space-y-2">
                  <li>• Enter your email on the sign-in page</li>
                  <li>• Receive a one-time code and enter it to log in</li>
                  <li>• Create agents and connect channels from the dashboard</li>
                </ul>
                <div className="bg-teal-900/20 border border-teal-500/30 rounded-lg p-4">
                  <p className="text-teal-400 font-semibold">ℹ️ Note:</p>
                  <p className="text-gray-300 text-sm">
                    Agent creation and core framework features are free. See the docs for self-hosting and deployment options.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'first-agent',
          title: 'Creating Your First AI Agent',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Follow these steps to create your first AI agent on Iqonga:
              </p>
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Step 1: Choose Personality Archetype</h4>
                  <p className="text-gray-300 text-sm">
                    Select from multiple personality types: Witty Troll, Tech Sage, Hype Beast, Honest Critic, Quirky Observer, Brand Storyteller, Community Problem Solver, Growth Strategist, Trend Analyst, Engagement Specialist, Product Evangelist, or create a Custom personality.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Step 2: Configure Personality & Voice</h4>
                  <p className="text-gray-300 text-sm">
                    Customize your agent's behavior, tone, humor style, intelligence level, controversy comfort, target topics, and behavioral guidelines.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Step 3: Select Platforms & Activity</h4>
                  <p className="text-gray-300 text-sm">
                    Choose which social media platforms your agent will operate on (Twitter, LinkedIn, Instagram, TikTok) and set posting frequency and reply activity levels.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Step 4: Generate Avatar & Create</h4>
                  <p className="text-gray-300 text-sm">
                    Generate an AI avatar for your agent and create it. Agent creation is currently FREE!
                  </p>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ai-agents',
      title: 'AI Agents',
      icon: <CogIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'personality-types',
          title: 'Agent Personality Types',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">🤖 Witty Troll</h4>
                  <p className="text-gray-300 text-sm">
                    Sarcastic, humorous, and engaging. Perfect for entertainment content and viral posts.
                  </p>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">🧠 Tech Sage</h4>
                  <p className="text-gray-300 text-sm">
                    Knowledgeable, analytical, and educational. Ideal for tech content and tutorials.
                  </p>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">🚀 Hype Beast</h4>
                  <p className="text-gray-300 text-sm">
                    Energetic, motivational, and trend-focused. Great for marketing and promotional content.
                  </p>
                </div>
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">⚖️ Honest Critic</h4>
                  <p className="text-gray-300 text-sm">
                    Balanced, objective, and thoughtful. Perfect for reviews and analytical content.
                  </p>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="text-yellow-400 font-semibold mb-2">🎭 Quirky Observer</h4>
                  <p className="text-gray-300 text-sm">
                    Unique perspective, creative insights. Great for thought-provoking content.
                  </p>
                </div>
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
                  <h4 className="text-cyan-400 font-semibold mb-2">📖 Brand Storyteller</h4>
                  <p className="text-gray-300 text-sm">
                    Narrative-focused, brand-building. Perfect for brand marketing and storytelling.
                  </p>
                </div>
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <h4 className="text-orange-400 font-semibold mb-2">🛠️ Community Problem Solver</h4>
                  <p className="text-gray-300 text-sm">
                    Helpful, solution-oriented. Ideal for customer support and community engagement.
                  </p>
                </div>
                <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-4">
                  <h4 className="text-pink-400 font-semibold mb-2">📈 Growth Strategist</h4>
                  <p className="text-gray-300 text-sm">
                    Business-focused, strategic insights. Great for B2B content and growth marketing.
                  </p>
                </div>
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
                  <h4 className="text-indigo-400 font-semibold mb-2">🔮 Trend Analyst</h4>
                  <p className="text-gray-300 text-sm">
                    Forward-thinking, trend-spotting. Perfect for industry analysis and predictions.
                  </p>
                </div>
                <div className="bg-teal-900/20 border border-teal-500/30 rounded-lg p-4">
                  <h4 className="text-teal-400 font-semibold mb-2">🤝 Engagement Specialist</h4>
                  <p className="text-gray-300 text-sm">
                    Relationship-building, community-focused. Ideal for engagement and relationship management.
                  </p>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                  <h4 className="text-emerald-400 font-semibold mb-2">⚡ Product Evangelist</h4>
                  <p className="text-gray-300 text-sm">
                    Product-focused, feature-explaining. Great for product marketing and demos.
                  </p>
                </div>
                <div className="bg-gray-800/20 border border-gray-500/30 rounded-lg p-4">
                  <h4 className="text-gray-400 font-semibold mb-2">🎨 Custom</h4>
                  <p className="text-gray-300 text-sm">
                    Create your own unique personality with full customization options.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'agent-evolution',
          title: 'Agent Evolution System',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Your AI agents evolve based on their performance and engagement metrics. The evolution system includes:
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">N</div>
                  <div>
                    <h4 className="text-white font-semibold">Novice</h4>
                    <p className="text-gray-400 text-sm">Starting level - Basic capabilities</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-semibold">A</div>
                  <div>
                    <h4 className="text-white font-semibold">Advanced</h4>
                    <p className="text-gray-400 text-sm">Improved performance and features</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">E</div>
                  <div>
                    <h4 className="text-white font-semibold">Expert</h4>
                    <p className="text-gray-400 text-sm">High-level capabilities and customization</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">L</div>
                  <div>
                    <h4 className="text-white font-semibold">Legendary</h4>
                    <p className="text-gray-400 text-sm">Maximum performance and unique abilities</p>
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'agent-management',
          title: 'Managing Your Agents',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Learn how to effectively manage your AI agents:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Agent Dashboard</h4>
                  <p className="text-gray-300 text-sm">
                    View all your agents, their performance metrics, and evolution status in one place.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Performance Tracking</h4>
                  <p className="text-gray-300 text-sm">
                    Monitor engagement rates, content performance, and evolution progress.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Agent Customization</h4>
                  <p className="text-gray-300 text-sm">
                    Update agent settings, personality traits, and content preferences.
                  </p>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'content-generation',
      title: 'Content Generation',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'ai-content-generator',
          title: 'AI Content Generator',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Generate high-quality content using our AI-powered content generator:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Types</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Social media posts (Twitter, Instagram, LinkedIn)</li>
                    <li>• Blog articles and long-form content</li>
                    <li>• Marketing copy and advertisements</li>
                    <li>• Product descriptions and reviews</li>
                    <li>• Educational content and tutorials</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Customization Options</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Tone and style selection</li>
                    <li>• Target audience specification</li>
                    <li>• Content length preferences</li>
                    <li>• Keyword integration</li>
                    <li>• Brand voice alignment</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'scheduled-posting',
          title: 'Scheduled Posting',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Automate your content distribution with our scheduling system:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Schedule Management</h4>
                  <p className="text-gray-300 text-sm">
                    Create posting schedules, set optimal times, and manage content calendars.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Platform Integration</h4>
                  <p className="text-gray-300 text-sm">
                    Post to multiple platforms simultaneously with platform-specific optimizations.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Queue</h4>
                  <p className="text-gray-300 text-sm">
                    Maintain a queue of ready-to-post content for consistent publishing.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'image-generation',
          title: 'Image Generation',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Create stunning visuals to accompany your content:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">AI Image Creation</h4>
                  <p className="text-gray-300 text-sm">
                    Generate custom images using AI based on text descriptions and style preferences.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Style Options</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Professional and corporate</li>
                    <li>• Creative and artistic</li>
                    <li>• Minimalist and clean</li>
                    <li>• Bold and vibrant</li>
                    <li>• Custom brand styles</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'video-generation',
          title: 'Video Generation',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Create professional videos using AI-powered video generation tools:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Veo Video Generation</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Text-to-video generation with Veo 3.1</li>
                    <li>• Fast and Standard modes</li>
                    <li>• Per-second billing for flexible pricing</li>
                    <li>• High-quality video output</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">RunwayML Integration</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Scene extension and video editing</li>
                    <li>• Video from ingredients (reference images)</li>
                    <li>• First & last frame interpolation</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">HeyGen Avatar Videos</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Text-to-avatar video generation</li>
                    <li>• Audio lip-sync for music videos</li>
                    <li>• Video translation with lip-sync</li>
                    <li>• Multiple avatar and voice options</li>
                    <li>• Per-minute billing for video translation</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'music-generation',
          title: 'Music & Lyrics Generation',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Generate original music tracks and song lyrics with AI:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">AI Music Generation</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Text-to-music with multiple providers</li>
                    <li>• Voice type selection (Male/Female/Neutral/Tenor/Alto/Bass/Soprano)</li>
                    <li>• Multi-language support (12+ languages)</li>
                    <li>• Genre customization (Pop, Rock, Hip-Hop, Afrobeat, Gospel, etc.)</li>
                    <li>• Agent personality-driven composition</li>
                    <li>• Company knowledge-aware music creation</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Lyrics Generation</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Topic and genre-based lyrics creation</li>
                    <li>• Agent personality integration</li>
                    <li>• Structure customization (verse-chorus, free-form)</li>
                    <li>• Mood and style control</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Music Video Generation</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Avatar lip-sync to music</li>
                    <li>• Custom backgrounds and aspect ratios</li>
                    <li>• Up to 30-minute video support</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'long-form-content',
          title: 'Long-Form Content Generator',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Create comprehensive long-form content including blogs, newsletters, articles, and whitepapers:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Types</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Blog Posts - SEO-optimized blog articles</li>
                    <li>• Newsletters - Email newsletters and updates</li>
                    <li>• Substack Articles - Substack-style long-form content</li>
                    <li>• Medium Articles - Medium publication articles</li>
                    <li>• Press Releases - Official press releases</li>
                    <li>• Whitepapers - In-depth research documents</li>
                    <li>• Case Studies - Detailed case studies</li>
                    <li>• General Articles - General long-form articles</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Target word count control (500-5000 words)</li>
                    <li>• Multiple tone options (professional, casual, friendly, etc.)</li>
                    <li>• SEO optimization</li>
                    <li>• Target audience specification</li>
                    <li>• Key points integration</li>
                    <li>• Draft saving and management</li>
                    <li>• Export to Markdown, HTML, TXT</li>
                    <li>• Agent personality-driven content</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'creative-writing',
          title: 'Creative Writing Assistant',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Generate creative content including stories, books, poems, and screenplays:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Types</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Short Stories - Short fiction stories</li>
                    <li>• Book Chapters - Individual book chapters with chapter management</li>
                    <li>• Poems - Poetry and verses</li>
                    <li>• Children's Books - Children's stories</li>
                    <li>• Screenplays - Scripts and screenplays</li>
                    <li>• Creative Nonfiction - Creative nonfiction</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Genre selection (Fiction, Fantasy, Sci-Fi, Mystery, Romance, etc.)</li>
                    <li>• Writing style options (narrative, descriptive, dialogue-heavy, etc.)</li>
                    <li>• Target word count (500-10000 words)</li>
                    <li>• Character development</li>
                    <li>• Plot point integration</li>
                    <li>• Chapter management for books</li>
                    <li>• Export to multiple formats (TXT, PDF, EPUB, DOCX)</li>
                    <li>• Agent personality-driven writing</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'ebook-creator',
          title: 'eBook Creator',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Create professional eBooks from start to finish with AI-powered tools, multi-format exports, and publishing options:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Navigate to "eBook Creator" in the sidebar</li>
                    <li>• Click "Create New Project" to start a new eBook</li>
                    <li>• Enter project title, description, and select a template</li>
                    <li>• Add chapters using the rich text editor</li>
                    <li>• Customize cover, page numbering, and table of contents</li>
                    <li>• Export to PDF, ePub, Flipbook, or publish to platforms</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Import Options</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>File Upload:</strong> Import Word documents (.docx) or PDF files</li>
                    <li>• <strong>URL Import:</strong> Extract content from web pages</li>
                    <li>• <strong>Google Docs:</strong> Import directly from Google Docs</li>
                    <li>• <strong>Transcription:</strong> Transcribe audio/video files to text</li>
                    <li>• Content automatically split into chapters based on headings</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Rich text editor with professional formatting</li>
                    <li>• AI-generated covers with customizable styles</li>
                    <li>• Audiobook generation with multiple voice options</li>
                    <li>• Audio/video transcription to text</li>
                    <li>• Page numbering (Arabic, Roman, or none)</li>
                    <li>• Auto-generated table of contents</li>
                    <li>• Multiple export formats (PDF, ePub, Flipbook, Kindle, Apple Books, Kobo)</li>
                    <li>• Google Drive integration for file storage</li>
                    <li>• Sharing options (Private, Unlisted, Public)</li>
                    <li>• Embed code generation for websites</li>
                    <li>• Social sharing (Twitter, Facebook, LinkedIn)</li>
                    <li>• Project cloning for variations</li>
                    <li>• Unlimited projects and chapters</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Pricing</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Create Chapter: 15 credits</li>
                    <li>• Edit with AI: 10 credits</li>
                    <li>• Generate Cover: 5 credits</li>
                    <li>• Transcribe Audio/Video: Variable (based on file size)</li>
                    <li>• Generate Audiobook: Variable (based on content length)</li>
                    <li>• Export Formats: Free (PDF, ePub, Flipbook)</li>
                    <li>• Free editing, adding your own images, and basic exports</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'content-brief-generator',
          title: 'Content Brief Generator',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Generate strategic content briefs before creating content with comprehensive planning tools:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Navigate to "Content Brief" in the sidebar</li>
                    <li>• Enter your topic and select platform</li>
                    <li>• Optionally select an AI agent for tone guidelines</li>
                    <li>• Optionally specify target audience</li>
                    <li>• Click "Generate Brief" to create comprehensive brief</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Brief Components</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Target Audience:</strong> Primary audience, demographics, interests, pain points</li>
                    <li>• <strong>Key Messages:</strong> Prioritized messages with rationale</li>
                    <li>• <strong>Content Structure:</strong> Opening, body points, closing, estimated length</li>
                    <li>• <strong>SEO Keywords:</strong> Primary and related keywords from Keyword Intelligence</li>
                    <li>• <strong>Competitor Analysis:</strong> Common themes, formats, tactics, opportunities</li>
                    <li>• <strong>Content Goals:</strong> Platform-specific goals</li>
                    <li>• <strong>Tone Guidelines:</strong> Language, voice, and platform notes</li>
                    <li>• <strong>Call-to-Action:</strong> Recommended and alternative CTAs</li>
                    <li>• <strong>Best Practices:</strong> Platform and content type specific</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Save briefs for future reference</li>
                    <li>• Load saved briefs to review or regenerate content</li>
                    <li>• Completeness score (0-100%)</li>
                    <li>• Agent personality-aware tone guidelines</li>
                    <li>• Integration with Keyword Intelligence for SEO</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'multi-modal-content',
          title: 'Multi-Modal Content Creation',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Generate complete content packages with text, images, and videos together:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Navigate to "Multi-Modal Content" in the sidebar</li>
                    <li>• Select your AI agent and platform</li>
                    <li>• Enter topic and configure content style</li>
                    <li>• Enable image generation (choose style and size)</li>
                    <li>• Enable video generation (choose duration and provider)</li>
                    <li>• Click "Generate Content Package"</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Image Options</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Style: Realistic, Artistic, Abstract, Minimalist, Vibrant</li>
                    <li>• Size: 1024x1024 (Square), 1024x1792 (Portrait), 1792x1024 (Landscape)</li>
                    <li>• DALL-E integration for high-quality images</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Video Options</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Duration: 5s, 10s, 15s, 30s, 60s</li>
                    <li>• Provider: HeyGen (avatar videos)</li>
                    <li>• Platform-specific optimization</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• One-click posting to Twitter</li>
                    <li>• Content package history</li>
                    <li>• Preview all generated content</li>
                    <li>• Platform-specific media optimization</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'content-series-generator',
          title: 'Content Series Generator',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Create multi-piece content campaigns with progression logic and templates:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Navigate to "Content Series" in the sidebar</li>
                    <li>• Click "Create New Series"</li>
                    <li>• Configure series settings (title, platform, frequency, start date)</li>
                    <li>• Select a template or create custom progression</li>
                    <li>• Generate all pieces in the series</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Templates</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>AIDA:</strong> Attention, Interest, Desire, Action</li>
                    <li>• <strong>PAS:</strong> Problem, Agitation, Solution</li>
                    <li>• <strong>StoryBrand:</strong> Character, Problem, Guide, Plan, Call to Action</li>
                    <li>• <strong>Before/After/Bridge:</strong> Transformation framework</li>
                    <li>• <strong>Custom:</strong> Create your own progression logic</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Multi-piece content campaigns</li>
                    <li>• Content progression logic</li>
                    <li>• Multi-platform series support</li>
                    <li>• Bulk scheduling for entire series</li>
                    <li>• Individual piece editing</li>
                    <li>• Series management and status tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'content-repurposing',
          title: 'Content Repurposing Engine',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Convert your content into multiple formats for different platforms:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Navigate to "Content Repurposing" in the sidebar</li>
                    <li>• Paste your source content</li>
                    <li>• Select source format (Tweet, Blog Post, Article, etc.)</li>
                    <li>• Choose target formats (multiple selection supported)</li>
                    <li>• Enable quote extraction and hashtag suggestions</li>
                    <li>• Click "Repurpose Content"</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Target Formats</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Twitter Thread:</strong> Multi-tweet thread format</li>
                    <li>• <strong>LinkedIn Post:</strong> Professional LinkedIn format</li>
                    <li>• <strong>Instagram Carousel:</strong> Multi-slide carousel format</li>
                    <li>• <strong>YouTube Script:</strong> Video script with timestamps</li>
                    <li>• <strong>Newsletter:</strong> Email newsletter format</li>
                    <li>• <strong>Facebook Post:</strong> Facebook-optimized format</li>
                    <li>• <strong>TikTok Script:</strong> Short-form video script</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Automatic quote extraction</li>
                    <li>• Hashtag suggestions</li>
                    <li>• Platform-specific formatting</li>
                    <li>• Save and manage repurposed content</li>
                    <li>• One-click format selection</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'visual-content-calendar',
          title: 'Visual Content Calendar',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Plan and manage all scheduled content with a visual calendar interface:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Navigate to "Content Calendar" in the sidebar</li>
                    <li>• View all scheduled posts in month view</li>
                    <li>• Navigate between months using arrow buttons</li>
                    <li>• Click "Today" to jump to current date</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Drag-and-Drop:</strong> Reschedule posts by dragging to new dates</li>
                    <li>• <strong>Color-Coding:</strong> Posts colored by platform (Twitter=blue, LinkedIn=blue, Instagram=pink)</li>
                    <li>• <strong>Content Series:</strong> Series pieces shown in purple</li>
                    <li>• <strong>Filters:</strong> Filter by platform, agent, or status</li>
                    <li>• <strong>Content Gaps:</strong> Automatic identification of days with no scheduled content</li>
                    <li>• <strong>Event Details:</strong> Click events to view/edit/delete</li>
                    <li>• <strong>View Options:</strong> Month, week, and day views (month implemented)</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Usage Tips</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Use filters to focus on specific platforms or agents</li>
                    <li>• Check content gaps alert to ensure consistent posting</li>
                    <li>• Drag posts to reschedule without opening edit modal</li>
                    <li>• Click events to view full content and details</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'content-optimization-assistant',
          title: 'Content Optimization Assistant',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Real-time content optimization with readability scoring, SEO suggestions, and engagement tips:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Optimization panel appears automatically when generating content</li>
                    <li>• Real-time analysis updates as you type (1 second debounce)</li>
                    <li>• View overall optimization score (0-100%)</li>
                    <li>• Review suggestions and apply improvements</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Analysis Components</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Readability:</strong> Flesch Reading Ease score with grade level</li>
                    <li>• <strong>SEO:</strong> Keyword density analysis and meta suggestions</li>
                    <li>• <strong>Engagement:</strong> Character count, hashtags, mentions, questions, emojis, CTAs</li>
                    <li>• <strong>Tone Consistency:</strong> Matches agent personality (if agent selected)</li>
                    <li>• <strong>Hashtag Suggestions:</strong> From Keyword Intelligence with one-click apply</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Suggestions</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Prioritized suggestions (high/medium/low priority)</li>
                    <li>• Impact percentage for each suggestion</li>
                    <li>• Positive factors highlighting</li>
                    <li>• Platform-specific recommendations</li>
                    <li>• Character/word count tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'content-research-integration',
          title: 'Content Research Integration',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Generate research-backed content with citations, trending topics, and fact-checking:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Enable "Research" checkbox in AI Content Generator</li>
                    <li>• Research is performed automatically during content generation</li>
                    <li>• Research data is displayed with generated content</li>
                    <li>• Citations and trending topics are included</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Research Components</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Web Search:</strong> Relevant information from web sources</li>
                    <li>• <strong>Trending Topics:</strong> Current trending topics related to your content</li>
                    <li>• <strong>Keyword Suggestions:</strong> SEO keywords for better discoverability</li>
                    <li>• <strong>Citations:</strong> Source citations for fact-checking</li>
                    <li>• <strong>Competitor Analysis:</strong> What competitors are doing</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Research-backed content generation (30 credits)</li>
                    <li>• Fact-checking capabilities</li>
                    <li>• Citation generation</li>
                    <li>• Research data integrated into content prompts</li>
                    <li>• Trending hashtags included in suggestions</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'content-performance-prediction',
          title: 'Content Performance Prediction',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Predict content performance before posting with engagement scores and viral potential:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Getting Started</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Performance predictions appear automatically after content generation</li>
                    <li>• Predictions are calculated based on content, agent, and platform</li>
                    <li>• Review engagement score and viral potential</li>
                    <li>• Apply optimization suggestions to improve performance</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Prediction Components</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Engagement Score:</strong> Overall score (0-100%)</li>
                    <li>• <strong>Viral Potential:</strong> High/Medium/Low assessment</li>
                    <li>• <strong>Predicted Metrics:</strong> Likes, retweets, replies estimates</li>
                    <li>• <strong>Best Time to Post:</strong> Optimal day and hour (UTC)</li>
                    <li>• <strong>Audience Match:</strong> How well content matches agent's audience</li>
                    <li>• <strong>Optimization Suggestions:</strong> Actionable improvements with impact percentages</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Historical performance integration</li>
                    <li>• Agent-specific predictions</li>
                    <li>• Platform-specific optimization</li>
                    <li>• Real-time predictions as you type</li>
                    <li>• Integration with Twitter Analytics for best time to post</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'ai-image-editor',
          title: 'AI Image Editor',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Professional AI-powered image editing with advanced capabilities:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">AI Tools</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Background Removal:</strong> AI-powered background removal (~50 credits)</li>
                    <li>• <strong>Object Removal:</strong> Select area and remove unwanted objects (~50 credits)</li>
                    <li>• <strong>AI Smart Filters:</strong> Apply style filters (vintage, cinematic, bold, soft) (~30 credits)</li>
                    <li>• <strong>Image Upscaling:</strong> AI-powered upscaling with enhancement (~40 credits)</li>
                    <li>• <strong>AI Retouching:</strong> Skin smoothing, blemish removal, enhancements (~60-80 credits)</li>
                    <li>• <strong>Style Learning:</strong> AI learns your editing preferences (~100 credits)</li>
                    <li>• <strong>AI Logo Maker:</strong> Generate professional logos (~150 credits)</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Basic Tools</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Filters: Brightness, contrast, saturation, blur, grayscale, sepia</li>
                    <li>• Resize: Adjust image dimensions</li>
                    <li>• Crop: Crop images to desired size</li>
                    <li>• Text Overlay: Add text with customization</li>
                    <li>• Logo Overlay: Add company logos</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Access</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Access from Media Library or Image Editor page</li>
                    <li>• Select existing images or create new logos</li>
                    <li>• Real-time preview of edits</li>
                    <li>• Save edited images to Media Library</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'smart-ad-generator',
          title: 'Smart Ad Generator',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                AI-driven ad creation with multi-platform support and brand integration:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Platform Support</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Facebook (Feed, Story, Reels)</li>
                    <li>• Instagram (Feed, Story, Reels)</li>
                    <li>• Twitter/X (Post, Story)</li>
                    <li>• LinkedIn (Post, Carousel)</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Image Generation</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Multiple providers: DALL-E 3, Google Gemini (Imagen), Stability AI (SD3)</li>
                    <li>• Platform-specific aspect ratios</li>
                    <li>• Multiple variants (1-3)</li>
                    <li>• Automatic image storage in Media Library</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Video & UGC</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Video generation with Runway, Veo, Pika</li>
                    <li>• UGC avatar videos with HeyGen</li>
                    <li>• Video status polling and updates</li>
                    <li>• Automatic video storage in Media Library</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Advanced Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Product catalog integration (Shopify, WooCommerce)</li>
                    <li>• Brand kit integration (logos, colors, fonts)</li>
                    <li>• Text overlay editor with presets</li>
                    <li>• Logo overlay on images</li>
                    <li>• Regenerate images or copy only</li>
                    <li>• Direct scheduling to platforms</li>
                    <li>• Ad templates</li>
                    <li>• Multi-language translation</li>
                    <li>• Export as ZIP files</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Pricing</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Variant-based pricing system</li>
                    <li>• Per platform, per variant pricing</li>
                    <li>• Additional costs for video and UGC</li>
                    <li>• See Pricing page for current rates</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'smart-campaign-generator',
          title: 'Smart Campaign Generator',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                AI-driven campaign strategy, content calendar, and automated ad generation:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Campaign Strategy</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• AI-generated campaign strategy</li>
                    <li>• Goal-based campaign planning</li>
                    <li>• Target audience analysis</li>
                    <li>• Platform recommendations</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Calendar</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Automated content calendar generation</li>
                    <li>• Optimal posting schedule</li>
                    <li>• Platform-specific timing</li>
                    <li>• Edit and customize calendar entries</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Ad Generation</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Automated ad generation for each calendar entry</li>
                    <li>• Brand consistency across all ads</li>
                    <li>• Platform-specific ad formats</li>
                    <li>• Edit individual ads within campaign</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Campaign Management</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• View all campaigns</li>
                    <li>• Edit campaign strategy and calendar</li>
                    <li>• Pause and resume campaigns</li>
                    <li>• Direct scheduling to platforms</li>
                    <li>• Performance tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'productivity-suite',
      title: 'Productivity Suite',
      icon: <CogIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'smart-inbox',
          title: 'Smart Inbox - AI Email Assistant',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                AI-powered email management with Gmail integration:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Email Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Gmail OAuth integration</li>
                    <li>• AI-powered draft replies (4 tones: Professional, Friendly, Casual, Formal)</li>
                    <li>• Automatic email categorization & prioritization</li>
                    <li>• Smart spam detection</li>
                    <li>• Email summarization with key points & action items</li>
                    <li>• Thread insights and contact enrichment</li>
                    <li>• Unified inbox for multiple email accounts</li>
                    <li>• Enhanced email insights and analytics</li>
                    <li>• Reply, Forward, Delete, Compose actions</li>
                    <li>• Pay-as-you-go pricing</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'ai-calendar',
          title: 'AI Calendar Assistant',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Intelligent calendar management with Google Calendar integration:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Calendar Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Google Calendar OAuth integration</li>
                    <li>• AI Meeting Prep with context & discussion topics</li>
                    <li>• Smart Scheduling with conflict detection</li>
                    <li>• Calendar Health Score (4 metrics)</li>
                    <li>• Automated email reminders (pre-meeting, daily, weekly)</li>
                    <li>• Best time finder & pattern learning</li>
                    <li>• Create, update, and delete events</li>
                    <li>• Pay-as-you-go pricing</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: <CogIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'personal-assistant-telegram',
          title: 'Personal Assistant – Telegram Setup',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Connect your own Telegram bot so your AI assistant uses your personal bot (not the platform bot) for replies and scheduled signals.
              </p>
              <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Create a bot with @BotFather</strong> in Telegram: send <code className="px-1 py-0.5 bg-gray-600 rounded">/newbot</code>, set name and username, then copy the bot token.</li>
                <li><strong>In the app:</strong> go to Personal Assistant → Add connection. Select your Agent, Channel: Telegram, and paste the <strong>Bot token (required)</strong>. Create the connection and note the connection ID.</li>
                <li><strong>Set the webhook:</strong> open in browser: <code className="block mt-1 px-2 py-1 bg-gray-700 rounded text-xs break-all">https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=&lt;APP_URL&gt;/api/assistant-webhook/telegram/&lt;CONNECTION_ID&gt;</code> Replace TOKEN, your app base URL (e.g. https://app.iqonga.org), and CONNECTION_ID.</li>
                <li><strong>Groups:</strong> add the bot to the group, get the group Chat ID (e.g. forward a message to @userinfobot), then edit the connection and set Telegram Chat ID to that value. The bot only replies when @mentioned or when someone replies to the bot.</li>
                <li><strong>DMs:</strong> optionally set Allowed Telegram user IDs so only those users can use the bot in direct messages; leave empty to allow everyone.</li>
              </ol>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 font-semibold mb-1">Full guide</p>
                <p className="text-gray-300 text-sm">
                  A detailed setup guide with troubleshooting is in the repo: <code className="px-1 py-0.5 bg-gray-600 rounded text-xs">docs/Telegram-Personal-Assistant-Setup.md</code>. Key points: keep your bot token secret; use the connection ID from the app in the webhook URL; for scheduled signals, set the real Telegram Chat ID when editing the connection.
                </p>
              </div>
            </div>
          )
        },
        {
          id: 'wordpress-plugin',
          title: 'WordPress Plugin',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Deploy AI-powered chatbots on your WordPress website:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Plugin Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• AI-powered chat functionality</li>
                    <li>• Voice chat with speech-to-text and text-to-speech</li>
                    <li>• Easy WordPress admin integration</li>
                    <li>• Customizable widget appearance</li>
                    <li>• AI content generation (text, images, videos)</li>
                    <li>• Music and lyrics generation</li>
                    <li>• Avatar video creation with HeyGen</li>
                    <li>• Company knowledge base integration</li>
                    <li>• Multi-agent support</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Requirements</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• WordPress 5.0 or higher</li>
                    <li>• PHP 7.4 or higher</li>
                    <li>• Iqonga account and API key</li>
                    <li>• Modern browser with microphone support</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'woocommerce-integration',
          title: 'WooCommerce Integration',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Enhance your WooCommerce store with AI-powered features:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">E-commerce Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Product knowledge integration</li>
                    <li>• Intelligent customer support</li>
                    <li>• Order management and tracking</li>
                    <li>• Customer insights and analytics</li>
                    <li>• Automated product recommendations</li>
                    <li>• Sales analytics</li>
                    <li>• Product description generation</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'social-platforms',
          title: 'Social Media Platforms',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Deploy your AI agents across multiple social media platforms:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Twitter/X</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• OAuth 2.0 authentication</li>
                    <li>• Automated tweet posting</li>
                    <li>• Schedule tweets</li>
                    <li>• Engagement tracking</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Telegram</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Multi-agent support - Assign different agents to different groups</li>
                    <li>• Multi-group and multi-channel support</li>
                    <li>• Group integration and channel posting</li>
                    <li>• Direct messages</li>
                    <li>• Scheduled messages</li>
                    <li>• Enhanced message handling and scalability</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Discord</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Custom Discord bot creation</li>
                    <li>• Server integration</li>
                    <li>• Command handling</li>
                    <li>• Real-time responses</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">LinkedIn & Instagram</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Platform-specific optimization</li>
                    <li>• Content scheduling</li>
                    <li>• Engagement monitoring</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'keyword-intelligence',
      title: 'Keyword & Hashtag Intelligence',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'keyword-intelligence-overview',
          title: 'Overview',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Research, monitor, and analyze keywords and hashtags across social media with AI-powered sentiment analysis, real-time alerts, and comprehensive analytics.
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Key Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Keyword and hashtag monitoring on X/Twitter</li>
                    <li>• AI-powered sentiment analysis (positive/negative/neutral)</li>
                    <li>• Real-time alerts for sentiment changes and mention spikes</li>
                    <li>• Advanced filtering and search capabilities</li>
                    <li>• Sentiment trend charts and analytics</li>
                    <li>• Influencer tracking and activity monitoring</li>
                    <li>• Custom alert rules with multiple conditions</li>
                    <li>• Collections/workspaces for organization</li>
                    <li>• CSV export for data analysis</li>
                    <li>• Real-time WebSocket updates</li>
                    <li>• Keyword research tool</li>
                    <li>• Usage analytics and credit tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'keyword-monitoring',
          title: 'Setting Up Monitors',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Create monitors to track keywords and hashtags:
              </p>
              <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
                <li>Navigate to "Keyword Intelligence" in the sidebar</li>
                <li>Click "Create Monitor"</li>
                <li>Enter keyword or hashtag (e.g., "AI", "#artificialintelligence")</li>
                <li>Select monitor type (Keyword or Hashtag)</li>
                <li>Choose platform (currently X/Twitter)</li>
                <li>Configure monitoring frequency (15min, 30min, 1hr, daily)</li>
                <li>Set sentiment and mention spike thresholds</li>
                <li>Add influencer handles to track (optional)</li>
                <li>Add exclude keywords (optional)</li>
                <li>Configure custom alert rules (optional)</li>
                <li>Enable auto-posting if desired</li>
                <li>Save your monitor</li>
              </ol>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 font-semibold">⚠️ Note:</p>
                <p className="text-gray-300 text-sm">
                  Keyword Intelligence uses the xAI Grok API. Credits are deducted per API call. See <Link to="/pricing" className="underline">Pricing page</Link> for details.
                </p>
              </div>
            </div>
          )
        },
        {
          id: 'keyword-alerts',
          title: 'Alert System',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Configure alerts to stay informed about important changes:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Alert Types</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Sentiment Shifts:</strong> Alerts when sentiment changes significantly</li>
                    <li>• <strong>Mention Spikes:</strong> Notifications when mentions spike above threshold</li>
                    <li>• <strong>Influencer Activity:</strong> Alerts when tracked influencers post about your keywords</li>
                    <li>• <strong>Custom Rules:</strong> Create custom alert conditions with AND/OR logic</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Notification Channels</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>In-App:</strong> Real-time notifications in the platform</li>
                    <li>• <strong>Email:</strong> Email notifications for important alerts</li>
                    <li>• <strong>Webhook:</strong> Send alerts to external systems via webhook</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Cooldown Periods</h4>
                  <p className="text-gray-300 text-sm">
                    Configure cooldown periods to prevent alert spam. Alerts won't trigger again until the cooldown period expires.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'keyword-research',
          title: 'Keyword Research',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Research keywords and hashtags to discover opportunities:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Research Types</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Trending Keywords:</strong> Discover currently trending keywords</li>
                    <li>• <strong>Related Keywords:</strong> Find keywords related to your search</li>
                    <li>• <strong>Suggested Hashtags:</strong> Get hashtag recommendations</li>
                    <li>• <strong>Competitor Keywords:</strong> Analyze competitor keyword usage</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Using Research</h4>
                  <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1 ml-4">
                    <li>Go to the "Research" tab in Keyword Intelligence</li>
                    <li>Enter your keyword or hashtag</li>
                    <li>Select research type</li>
                    <li>View results and insights</li>
                    <li>Save research results for future reference</li>
                  </ol>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'keyword-analytics',
          title: 'Analytics & Export',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Analyze your data and export for further analysis:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Sentiment Charts</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• View sentiment trends over time with interactive charts</li>
                    <li>• Filter by date range (7 days, 30 days, 90 days, custom)</li>
                    <li>• Track mention counts and engagement metrics</li>
                    <li>• Export chart data to CSV</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">CSV Export</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Export monitor data to CSV</li>
                    <li>• Export sentiment snapshots to CSV</li>
                    <li>• Use exported data in Excel, Google Sheets, or data analysis tools</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Usage Analytics</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Track API usage by operation type</li>
                    <li>• Monitor credits consumed</li>
                    <li>• View operation costs</li>
                    <li>• Optimize monitoring strategy based on usage</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Real-Time Updates</h4>
                  <p className="text-gray-300 text-sm">
                    Receive instant updates via WebSocket when monitors complete checks. No polling required - true real-time experience with zero additional API costs.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'keyword-collections',
          title: 'Collections & Workspaces',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Organize your monitors into collections for better management:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Creating Collections</h4>
                  <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1 ml-4">
                    <li>Go to the "Collections" tab</li>
                    <li>Click "New Collection"</li>
                    <li>Name your collection and add description (optional)</li>
                    <li>Choose a color for visual organization</li>
                    <li>Add tags for categorization (optional)</li>
                    <li>Save your collection</li>
                  </ol>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Managing Collections</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Assign monitors to collections when creating or editing</li>
                    <li>• View all monitors in a collection together</li>
                    <li>• Edit collection details (name, description, color)</li>
                    <li>• Delete collections (monitors are not deleted)</li>
                    <li>• Filter monitors by collection</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'twitter-analytics',
      title: 'Twitter Analytics',
      icon: <ChartBarIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'twitter-analytics-overview',
          title: 'Overview',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Comprehensive Twitter analytics with follower growth tracking, post performance analysis, mentions monitoring, and AI-powered insights.
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Key Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Follower growth tracking with historical data</li>
                    <li>• Post performance analytics (impressions, engagement, top posts)</li>
                    <li>• Mentions monitoring and brand tracking</li>
                    <li>• Best time to post analysis (day and hour optimization)</li>
                    <li>• Engagement trends and metrics over time</li>
                    <li>• AI-powered sentiment analysis of mentions (via Grok)</li>
                    <li>• Hashtag and topic suggestions via Grok AI</li>
                    <li>• Content strategy recommendations</li>
                    <li>• CSV and PDF export capabilities</li>
                    <li>• Daily historical snapshots for trend analysis</li>
                    <li>• Real-time data updates</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'twitter-analytics-setup',
          title: 'Getting Started',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Connect your Twitter account and start tracking your performance:
              </p>
              <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
                <li>Go to Settings → Platform Connections</li>
                <li>Connect your Twitter account using OAuth</li>
                <li>Navigate to "Twitter Analytics" in the sidebar</li>
                <li>View your overview metrics and historical data</li>
              </ol>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 font-semibold">ℹ️ Note:</p>
                <p className="text-gray-300 text-sm">
                  Twitter Analytics requires an active Twitter connection. Make sure your Twitter account is connected and authenticated. Historical data is collected daily at 2 AM UTC.
                </p>
              </div>
            </div>
          )
        },
        {
          id: 'twitter-analytics-metrics',
          title: 'Overview Metrics',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Track key performance indicators at a glance:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Key Metrics</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Followers:</strong> Current follower count with growth change from previous period</li>
                    <li>• <strong>Engagement Rate:</strong> Overall engagement percentage across all posts</li>
                    <li>• <strong>Impressions:</strong> Total post impressions</li>
                    <li>• <strong>Best Hour (UTC):</strong> Optimal posting time based on historical engagement data</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'twitter-analytics-historical',
          title: 'Historical Charts',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Analyze trends over time with interactive charts:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Follower Growth</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Track follower count changes over time</li>
                    <li>• View follower growth trends with area charts</li>
                    <li>• Identify growth patterns and spikes</li>
                    <li>• Select date ranges: 7, 30, 60, or 90 days</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Engagement Trends</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Monitor likes, retweets, and replies over time</li>
                    <li>• Track engagement rate trends</li>
                    <li>• Compare different engagement metrics</li>
                    <li>• Identify best performing periods</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Daily Snapshots</h4>
                  <p className="text-gray-300 text-sm">
                    Historical data is automatically collected daily at 2 AM UTC. This ensures you have consistent historical data for trend analysis.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'twitter-analytics-posts',
          title: 'Top Posts & Mentions',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Identify your best-performing content and track brand mentions:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Top Posts</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• View most engaging recent tweets with metrics</li>
                    <li>• Track impressions, likes, retweets, and replies</li>
                    <li>• Identify content that resonates with your audience</li>
                    <li>• Analyze what makes posts successful</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Mentions</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Monitor recent mentions of your account</li>
                    <li>• Track engagement metrics for mentions</li>
                    <li>• View sentiment analysis of mentions</li>
                    <li>• Identify brand conversations and opportunities</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'twitter-analytics-best-time',
          title: 'Best Time to Post',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Optimize your posting schedule with data-driven insights:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Heatmap View</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Visual representation of engagement by day and hour</li>
                    <li>• Darker colors indicate higher engagement</li>
                    <li>• Identify optimal posting windows</li>
                    <li>• All times shown in UTC</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Optimization Tips</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Schedule posts during high-engagement periods</li>
                    <li>• Test different posting times to find your audience's sweet spot</li>
                    <li>• Consider timezone differences for your target audience</li>
                    <li>• Review best time data regularly as it updates with new data</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'twitter-analytics-ai',
          title: 'AI-Powered Insights',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Get actionable recommendations with Grok AI integration:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Sentiment Analysis</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Analyze mention sentiment with scores and insights</li>
                    <li>• Track positive, negative, and neutral mentions</li>
                    <li>• Get overall sentiment score</li>
                    <li>• Receive key insights and recommendations</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Hashtag & Topic Suggestions</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• AI-recommended hashtags for your content</li>
                    <li>• Discover trending topics relevant to your audience</li>
                    <li>• Get content themes and ideas</li>
                    <li>• Suggestions based on your account's performance</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Strategy</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Get prioritized recommendations for improving engagement</li>
                    <li>• Receive actionable content strategy suggestions</li>
                    <li>• Priority levels: High, Medium, Low</li>
                    <li>• Click "AI Insights" button to access all suggestions</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'twitter-analytics-export',
          title: 'Export & Reports',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Export your analytics data for external analysis:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Export Types</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Overview:</strong> Key metrics summary</li>
                    <li>• <strong>Posts:</strong> Top posts data</li>
                    <li>• <strong>Mentions:</strong> Mentions data</li>
                    <li>• <strong>Historical:</strong> Historical snapshots</li>
                    <li>• <strong>Full Report:</strong> Complete analytics data</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Export Formats</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>CSV:</strong> Export data to CSV for Excel/Sheets analysis</li>
                    <li>• <strong>PDF:</strong> Generate formatted PDF reports</li>
                    <li>• <strong>Date Range:</strong> Export data for specific time periods</li>
                    <li>• <strong>Export History:</strong> View all previous exports</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'company-knowledge',
      title: 'Company Knowledge Base',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'knowledge-base-overview',
          title: 'Knowledge Base Overview',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Train your AI agents with comprehensive company knowledge:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Company profile and brand voice training</li>
                    <li>• Product and service knowledge integration</li>
                    <li>• Document upload and AI-powered summarization</li>
                    <li>• Agent knowledge assignment and scope control</li>
                    <li>• Custom instructions for business-specific responses</li>
                    <li>• Team members and achievements tracking</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Supported Document Formats</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• PDF files</li>
                    <li>• DOCX (Word documents)</li>
                    <li>• TXT (Plain text)</li>
                    <li>• MD (Markdown)</li>
                    <li>• Max 10 files, 5MB each</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'token-rewards',
      title: 'Token Holder Rewards',
      icon: <CreditCardIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'monthly-rewards',
          title: 'Monthly Credit Rewards',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Hold $ZTR tokens and earn monthly credits automatically:
              </p>
              <div className="space-y-3">
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">Reward Tiers</h4>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• <strong>Tier 1:</strong> Hold 1M+ $ZTR → 500 credits/month ($5 USD value)</li>
                    <li>• <strong>Tier 2:</strong> Hold 5M+ $ZTR → 1,000 credits/month ($10 USD value)</li>
                    <li>• <strong>Tier 3:</strong> Hold 10M+ $ZTR → 3,000 credits/month ($30 USD value)</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">How It Works</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Daily snapshots track your token balance</li>
                    <li>• Monthly rewards calculated based on average balance</li>
                    <li>• Minimum 20 days holding required (anti-gaming protection)</li>
                    <li>• Credits automatically added to your account</li>
                    <li>• 1 credit = $0.01 USD</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Performance',
      icon: <ChartBarIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'performance-metrics',
          title: 'Performance Metrics',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Track and analyze your AI agents' performance with comprehensive metrics:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Engagement Metrics</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Likes, shares, and comments</li>
                    <li>• Click-through rates</li>
                    <li>• Follower growth</li>
                    <li>• Reach and impressions</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Performance</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Top-performing posts</li>
                    <li>• Content type analysis</li>
                    <li>• Optimal posting times</li>
                    <li>• Audience preferences</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'evolution-tracking',
          title: 'Evolution Tracking',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Monitor your agents' evolution progress and unlock new capabilities:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Evolution Requirements</h4>
                  <p className="text-gray-300 text-sm">
                    Each evolution level requires specific performance milestones and engagement thresholds.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Progress Indicators</h4>
                  <p className="text-gray-300 text-sm">
                    Visual progress bars and detailed metrics show how close your agent is to the next level.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Rewards & Benefits</h4>
                  <p className="text-gray-300 text-sm">
                    Higher-level agents unlock new features, improved performance, and exclusive capabilities.
                  </p>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'billing',
      title: 'Billing & Credits',
      icon: <CreditCardIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'credit-system',
          title: 'Credit System',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Iqonga uses a credit-based system for content generation and platform usage:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Dynamic Pricing System</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Iqonga uses a flexible pay-as-you-go pricing model with dynamic credit costs:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Flat Rate:</strong> Fixed credit cost per action</li>
                    <li>• <strong>Per Second:</strong> Billed by duration (e.g., Veo video generation)</li>
                    <li>• <strong>Per Minute:</strong> Billed by duration (e.g., HeyGen video translation)</li>
                    <li>• Pricing can be adjusted by admins in real-time</li>
                    <li>• 1 credit = $0.01 USD</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Credit Packages</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 100 Credits = $1.00 USDC</li>
                    <li>• 1,000 Credits = $10.00 USDC</li>
                    <li>• 10,000 Credits = $100.00 USDC</li>
                    <li>• 100,000 Credits = $1,000.00 USDC</li>
                    <li>• Credits never expire</li>
                    <li>• Debt limit: 200 credits maximum</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Service Pricing Examples</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Content Generation: Dynamic pricing (see Pricing page)</li>
                    <li>• Image Generation: Dynamic pricing</li>
                    <li>• Video Generation: Per-second or per-minute billing</li>
                    <li>• Music Generation: Dynamic pricing</li>
                    <li>• Gmail/Calendar: Pay-as-you-go per action</li>
                    <li>• Agent Creation: Currently FREE!</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'payment-methods',
          title: 'Payment Methods',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                We accept various payment methods for your convenience:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Cryptocurrency</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>$ZTR Tokens</strong> - Pay with $ZTR and receive 20% bonus credits! 🎁</li>
                    <li>• USDC (Solana)</li>
                    <li>• SOL (Solana)</li>
                    <li>• Bitcoin</li>
                    <li>• Ethereum</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Traditional Payment</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Credit/Debit Cards</li>
                    <li>• PayPal</li>
                    <li>• Bank Transfer</li>
                    <li>• Stripe</li>
                  </ul>
                </div>
              </div>
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
                <p className="text-green-400 font-semibold mb-2">💰 $ZTR Payment Bonus:</p>
                <p className="text-gray-300 text-sm">
                  When you pay with $ZTR tokens, you receive 20% bonus credits on all purchases! For example, if you purchase $10 worth of credits with $ZTR, you'll get 1,200 credits instead of 1,000 credits.
                </p>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'data-protection',
          title: 'Data Protection',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Your data security and privacy are our top priorities:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Encryption</h4>
                  <p className="text-gray-300 text-sm">
                    All data is encrypted in transit and at rest using industry-standard encryption protocols.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Blockchain Security</h4>
                  <p className="text-gray-300 text-sm">
                    Agent ownership and transactions are secured by the Solana blockchain's cryptographic security.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Privacy Controls</h4>
                  <p className="text-gray-300 text-sm">
                    Granular privacy controls allow you to manage what data is shared and how it's used.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'wallet-security',
          title: 'Wallet Security',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Best practices for keeping your Solana wallet secure:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Private Key Protection</h4>
                  <p className="text-gray-300 text-sm">
                    Never share your private keys or seed phrases with anyone. Iqonga never stores your private keys.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Hardware Wallets</h4>
                  <p className="text-gray-300 text-sm">
                    Consider using hardware wallets like Ledger for maximum security, especially for large amounts.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Transaction Verification</h4>
                  <p className="text-gray-300 text-sm">
                    Always verify transaction details before confirming, especially when interacting with smart contracts.
                  </p>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'webinar-platform',
      title: 'Webinar Platform (Coming Q1 2026)',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'webinar-overview',
          title: 'What is the Webinar Platform?',
          content: (
            <div className="space-y-4">
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                <p className="text-purple-300 text-sm">
                  <strong>Coming Q1 2026:</strong> Professional webinar hosting with AI-powered features unique to Iqonga.
                </p>
              </div>
              <p className="text-gray-300">
                The Iqonga Webinar Platform is an AI-powered video conferencing solution that seamlessly integrates with your existing Iqonga tools. Host professional webinars with advanced features including real-time transcription, AI moderation, and automated summaries.
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Key Features</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• HD video/audio for 200+ concurrent participants</li>
                    <li>• Real-time chat with message history</li>
                    <li>• Live transcription in 20+ languages</li>
                    <li>• Cloud recording and playback</li>
                    <li>• AI-powered chat moderation</li>
                    <li>• AI Q&A assistant</li>
                    <li>• Post-webinar AI summaries</li>
                    <li>• Interactive polls and surveys</li>
                    <li>• Calendar and email integration</li>
                    <li>• Comprehensive analytics dashboard</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Technical Specifications</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Video Quality:</strong> Up to 1080p HD</li>
                    <li>• <strong>Max Participants:</strong> 200+ concurrent users</li>
                    <li>• <strong>Platform:</strong> Browser-based (no downloads required)</li>
                    <li>• <strong>Compatibility:</strong> Chrome, Firefox, Safari, Edge</li>
                    <li>• <strong>Mobile:</strong> Fully responsive and mobile-friendly</li>
                    <li>• <strong>Cost:</strong> ~$0.40 per hour (after free tier)</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Use Cases</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Corporate training and onboarding</li>
                    <li>• Product launches and demonstrations</li>
                    <li>• Educational webinars and courses</li>
                    <li>• Marketing events and presentations</li>
                    <li>• Team meetings and all-hands</li>
                    <li>• Customer support and Q&A sessions</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'creating-webinars',
          title: 'Creating and Managing Webinars',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Learn how to create, configure, and manage webinars on the Iqonga platform:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Creating a Webinar</h4>
                  <ol className="text-gray-300 text-sm space-y-2 ml-4">
                    <li>1. Navigate to the "Webinars" section in the sidebar</li>
                    <li>2. Click "Create New Webinar" button</li>
                    <li>3. Fill in basic information:
                      <ul className="mt-2 space-y-1 ml-4">
                        <li>• Title (required)</li>
                        <li>• Description</li>
                        <li>• Scheduled start date and time</li>
                        <li>• Scheduled end date and time</li>
                        <li>• Timezone</li>
                      </ul>
                    </li>
                    <li>4. Configure webinar settings:
                      <ul className="mt-2 space-y-1 ml-4">
                        <li>• Maximum participants (up to 200)</li>
                        <li>• Enable/disable recording</li>
                        <li>• Enable/disable transcription</li>
                        <li>• Enable/disable chat</li>
                        <li>• Enable/disable screen sharing</li>
                        <li>• Password protection (optional)</li>
                        <li>• Waiting room (optional)</li>
                        <li>• Registration requirement (optional)</li>
                      </ul>
                    </li>
                    <li>5. Select an AI agent for moderation (optional but recommended)</li>
                    <li>6. Click "Create Webinar" to finalize</li>
                  </ol>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Webinar Settings</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Customize your webinar with various options:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• <strong>Recording:</strong> Automatically record to cloud storage</li>
                    <li>• <strong>Transcription:</strong> Enable real-time speech-to-text</li>
                    <li>• <strong>Chat:</strong> Allow participants to message during webinar</li>
                    <li>• <strong>Q&A:</strong> Enable dedicated Q&A functionality</li>
                    <li>• <strong>Polls:</strong> Create interactive polls for engagement</li>
                    <li>• <strong>Waiting Room:</strong> Hold participants before letting them in</li>
                    <li>• <strong>Registration:</strong> Require pre-registration with custom forms</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Managing Webinars</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• View all webinars in list or calendar view</li>
                    <li>• Filter by status (scheduled, live, ended)</li>
                    <li>• Edit webinar details before start time</li>
                    <li>• Cancel webinars and notify attendees</li>
                    <li>• Clone webinars to create similar events</li>
                    <li>• Export webinar data and analytics</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'host-controls',
          title: 'Host Controls and Features',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                As the webinar host, you have comprehensive controls to manage the session:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Video & Audio Controls</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Start/stop your video and audio</li>
                    <li>• Mute individual participants or all at once</li>
                    <li>• Enable/disable participant video</li>
                    <li>• Adjust video quality and bandwidth</li>
                    <li>• Switch between camera and screen sharing</li>
                    <li>• Spotlight specific participants</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Recording Controls</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Start/stop recording at any time</li>
                    <li>• Pause and resume recording</li>
                    <li>• View recording status and duration</li>
                    <li>• Automatic cloud upload after session</li>
                    <li>• Recording notification to participants</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Chat Moderation</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Enable AI-powered chat moderation</li>
                    <li>• Delete inappropriate messages</li>
                    <li>• Disable chat for specific participants</li>
                    <li>• Enable slow mode (message rate limiting)</li>
                    <li>• Private messaging to/from host</li>
                    <li>• Export chat history</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Q&A Management</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• View all submitted questions</li>
                    <li>• Mark questions as answered</li>
                    <li>• Pin important questions</li>
                    <li>• Enable AI auto-responses</li>
                    <li>• Allow participants to upvote questions</li>
                    <li>• Filter questions by status</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Participant Management</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• View list of all participants</li>
                    <li>• Admit participants from waiting room</li>
                    <li>• Remove disruptive participants</li>
                    <li>• Assign moderator privileges</li>
                    <li>• See participant connection quality</li>
                    <li>• Track attendance and duration</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'ai-features',
          title: 'AI-Powered Features',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Leverage your Iqonga agents to enhance webinars with intelligent features:
              </p>
              <div className="space-y-3">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">🤖 AI Chat Moderation</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Use your AI agent's personality to moderate chat in real-time:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Automatic filtering of inappropriate content</li>
                    <li>• Context-aware moderation based on webinar topic</li>
                    <li>• Personality-driven moderation style</li>
                    <li>• Spam detection and prevention</li>
                    <li>• Warning system for repeat offenders</li>
                    <li>• Configurable moderation sensitivity</li>
                  </ul>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">💬 AI Q&A Assistant</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    AI automatically answers questions with context awareness:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Answers based on webinar content and context</li>
                    <li>• References company knowledge base</li>
                    <li>• Personality-driven response style</li>
                    <li>• Confidence scoring for answers</li>
                    <li>• Escalation to host for complex questions</li>
                    <li>• Multi-language support</li>
                  </ul>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">📝 Post-Webinar AI Summaries</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Automatically generated summaries after each webinar:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Executive summary of key points</li>
                    <li>• Action items and next steps</li>
                    <li>• Key discussion topics</li>
                    <li>• Question themes and insights</li>
                    <li>• Participant engagement highlights</li>
                    <li>• Recommendations for future webinars</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Live Transcription</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Real-time speech-to-text powered by Deepgram AI:
                  </p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Support for 20+ languages</li>
                    <li>• Speaker identification</li>
                    <li>• Searchable transcripts</li>
                    <li>• VTT/SRT caption file export</li>
                    <li>• High accuracy (95%+ for clear audio)</li>
                    <li>• Real-time display during webinar</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'integration',
          title: 'Integration with Iqonga Features',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                The webinar platform seamlessly integrates with your existing Iqonga tools:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">📧 Email Integration (Smart Inbox)</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Automated registration confirmations</li>
                    <li>• 24-hour and 1-hour reminder emails</li>
                    <li>• Join link delivery before webinar</li>
                    <li>• Post-webinar thank you emails</li>
                    <li>• Recording availability notifications</li>
                    <li>• AI-generated summary via email</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">📅 Calendar Integration</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Auto-create Google Calendar events</li>
                    <li>• Calendar invites with join links</li>
                    <li>• Automatic timezone conversion</li>
                    <li>• Reminder synchronization</li>
                    <li>• Event updates and cancellations</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">📱 Social Media Integration</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Auto-post webinar announcements to Twitter/X</li>
                    <li>• Telegram group notifications</li>
                    <li>• Discord server announcements</li>
                    <li>• Scheduled promotional posts</li>
                    <li>• Post-webinar recording shares</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">🤖 AI Agent Integration</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Assign agents for moderation</li>
                    <li>• Use agent personality in responses</li>
                    <li>• Access company knowledge base</li>
                    <li>• Leverage existing agent training</li>
                    <li>• Consistent brand voice</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'analytics-reporting',
          title: 'Analytics and Reporting',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Comprehensive analytics to measure webinar success and improve future sessions:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Attendance Metrics</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Total registrations vs. actual attendees</li>
                    <li>• Peak concurrent participants</li>
                    <li>• Average watch time per attendee</li>
                    <li>• Join/leave timestamps</li>
                    <li>• Late arrivals and early departures</li>
                    <li>• Attendance rate percentage</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Engagement Metrics</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Total chat messages sent</li>
                    <li>• Questions asked and answered</li>
                    <li>• Poll participation rates</li>
                    <li>• Most active participants</li>
                    <li>• Engagement score (0-100)</li>
                    <li>• Drop-off points and reasons</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Audience Demographics</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Geographic distribution</li>
                    <li>• Device breakdown (desktop/mobile/tablet)</li>
                    <li>• Browser and OS statistics</li>
                    <li>• Connection quality metrics</li>
                    <li>• Timezone distribution</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Recording Analytics</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Total recording views</li>
                    <li>• Average watch percentage</li>
                    <li>• Most-watched segments</li>
                    <li>• Replay completion rate</li>
                    <li>• Download statistics</li>
                  </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Export Options</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• CSV export of participant data</li>
                    <li>• PDF analytics reports</li>
                    <li>• Chat history export</li>
                    <li>• Q&A transcript export</li>
                    <li>• Scheduled automatic reports</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <QuestionMarkCircleIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'common-issues',
          title: 'Common Issues',
          content: (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Wallet Connection Issues</h4>
                  <div className="text-gray-300 text-sm space-y-2">
                    <p><strong>Problem:</strong> Wallet won't connect</p>
                    <p><strong>Solution:</strong> Ensure your wallet extension is installed and updated. Try refreshing the page and reconnecting.</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Transaction Failures</h4>
                  <div className="text-gray-300 text-sm space-y-2">
                    <p><strong>Problem:</strong> Transactions failing</p>
                    <p><strong>Solution:</strong> Check you have sufficient SOL for gas fees. Ensure your wallet is on the correct network (Solana Mainnet).</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Content Generation Errors</h4>
                  <div className="text-gray-300 text-sm space-y-2">
                    <p><strong>Problem:</strong> AI content generation not working</p>
                    <p><strong>Solution:</strong> Verify you have sufficient credits. Check your internet connection and try again.</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Agent Performance Issues</h4>
                  <div className="text-gray-300 text-sm space-y-2">
                    <p><strong>Problem:</strong> Agent not performing as expected</p>
                    <p><strong>Solution:</strong> Review agent settings and personality configuration. Check analytics for performance insights.</p>
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'support-contacts',
          title: 'Getting Help',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                If you need additional help, here are the best ways to get support:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Community Support</h4>
                  <p className="text-gray-300 text-sm">
                    Join our Telegram community for peer-to-peer support and updates: 
                    <a href="https://t.me/Zenthryx_ai" className="text-blue-400 hover:text-blue-300 ml-1">@Zenthryx_ai</a>
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Direct Support</h4>
                  <p className="text-gray-300 text-sm">
                    For technical issues, contact our support team through the platform or email support@iqonga.org
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Documentation</h4>
                  <p className="text-gray-300 text-sm">
                    Check our comprehensive documentation and FAQ section for detailed guides and answers.
                  </p>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'sales-crm',
      title: 'Sales & CRM',
      icon: <ChartBarIcon className="w-5 h-5" />,
      subsections: [
        {
          id: 'sales-crm-overview',
          title: 'Sales & CRM Overview',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Iqonga Sales & CRM is a comprehensive sales management solution integrated directly into the platform. 
                Manage your entire sales pipeline from lead capture to deal close, with powerful automation, intelligent insights, 
                and seamless integration with your marketing activities.
              </p>
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">✨ New Feature - December 2025:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• <strong>Lead Management:</strong> Capture, organize, and qualify leads</li>
                  <li>• <strong>Visual Pipeline:</strong> Drag-and-drop deal management</li>
                  <li>• <strong>Activity Tracking:</strong> Log emails, calls, meetings, tasks</li>
                  <li>• <strong>Sales Analytics:</strong> Comprehensive metrics and forecasting</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Access Sales & CRM:</h4>
                <p className="text-gray-300">
                  Find the "Sales & CRM" section in your sidebar with four main areas:
                </p>
                <ul className="text-gray-300 space-y-2">
                  <li>• <strong>Sales Dashboard:</strong> Overview of metrics and performance</li>
                  <li>• <strong>Leads:</strong> Lead management and qualification</li>
                  <li>• <strong>Pipeline:</strong> Visual deal pipeline board</li>
                  <li>• <strong>Tasks & Activities:</strong> Activity and task management</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'lead-management',
          title: 'Lead Management',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Capture, organize, and nurture your sales leads with intelligent tracking and scoring.
              </p>
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Key Features:</h4>
                <ul className="text-gray-300 space-y-2">
                  <li>• <strong>Lead Creation:</strong> Add leads with contact and company information</li>
                  <li>• <strong>Duplicate Detection:</strong> Real-time email-based duplicate prevention</li>
                  <li>• <strong>Lead Scoring:</strong> Automatic scoring (0-100) based on engagement</li>
                  <li>• <strong>BANT Qualification:</strong> Track Budget, Authority, Need, Timeline</li>
                  <li>• <strong>Source Tracking:</strong> Monitor where leads come from</li>
                  <li>• <strong>Search & Filter:</strong> Advanced filtering by status, source, score</li>
                  <li>• <strong>Lead Assignment:</strong> Assign leads to sales team members</li>
                  <li>• <strong>Tags & Notes:</strong> Organize with custom tags and detailed notes</li>
                  <li>• <strong>Activity Timeline:</strong> Complete history of all interactions</li>
                  <li>• <strong>Lead Conversion:</strong> Convert qualified leads to deals</li>
                </ul>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 font-semibold mb-2">💡 Best Practice:</p>
                <p className="text-gray-300 text-sm">
                  Always complete BANT qualification for your leads. This helps prioritize efforts on qualified prospects and improves close rates.
                </p>
              </div>
            </div>
          )
        },
        {
          id: 'pipeline-management',
          title: 'Pipeline Management',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Visualize and manage your deals through every stage with drag-and-drop simplicity.
              </p>
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Pipeline Stages:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">1. Lead (10%)</p>
                    <p className="text-gray-400 text-sm">Initial contact made</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">2. Qualified (25%)</p>
                    <p className="text-gray-400 text-sm">BANT criteria met</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">3. Meeting (40%)</p>
                    <p className="text-gray-400 text-sm">Discovery meeting scheduled/completed</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">4. Proposal (60%)</p>
                    <p className="text-gray-400 text-sm">Proposal sent to prospect</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">5. Negotiation (80%)</p>
                    <p className="text-gray-400 text-sm">Terms being discussed</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">6. Closed Won (100%)</p>
                    <p className="text-gray-400 text-sm">Deal successfully closed</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">7. Closed Lost (0%)</p>
                    <p className="text-gray-400 text-sm">Deal lost - document reasons</p>
                  </div>
                </div>
                <h4 className="text-white font-semibold mt-4">Key Features:</h4>
                <ul className="text-gray-300 space-y-2">
                  <li>• <strong>Visual Kanban Board:</strong> See all deals at a glance</li>
                  <li>• <strong>Drag & Drop:</strong> Move deals between stages easily</li>
                  <li>• <strong>Deal Value Tracking:</strong> Multi-currency support</li>
                  <li>• <strong>Win Probability:</strong> Automatic calculation per stage</li>
                  <li>• <strong>Weighted Value:</strong> Amount × Probability for forecasting</li>
                  <li>• <strong>Close Date Tracking:</strong> Monitor expected close dates</li>
                  <li>• <strong>Sales Forecasting:</strong> Predict revenue based on pipeline</li>
                  <li>• <strong>Close Reasons:</strong> Document why deals won or lost</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'activity-tracking',
          title: 'Activity & Task Management',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Track every interaction and never miss a follow-up with comprehensive activity logging.
              </p>
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Activity Types:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">📧 Email</p>
                    <p className="text-gray-400 text-sm">Log email communications</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">📞 Call</p>
                    <p className="text-gray-400 text-sm">Record phone conversations</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">🤝 Meeting</p>
                    <p className="text-gray-400 text-sm">Document meetings and outcomes</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">✅ Task</p>
                    <p className="text-gray-400 text-sm">Create follow-up tasks with due dates</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">📝 Note</p>
                    <p className="text-gray-400 text-sm">Add general observations</p>
                  </div>
                </div>
                <h4 className="text-white font-semibold mt-4">Task Features:</h4>
                <ul className="text-gray-300 space-y-2">
                  <li>• <strong>One-Click Completion:</strong> Mark tasks done instantly</li>
                  <li>• <strong>Priority Levels:</strong> High, Medium, Low priorities</li>
                  <li>• <strong>Due Date Tracking:</strong> Never miss a deadline</li>
                  <li>• <strong>Overdue Detection:</strong> Highlight overdue tasks</li>
                  <li>• <strong>Task Assignment:</strong> Assign to team members</li>
                  <li>• <strong>Activity Filtering:</strong> Filter by type, status, date</li>
                  <li>• <strong>Search:</strong> Search through activities and tasks</li>
                  <li>• <strong>Timeline View:</strong> Chronological activity history</li>
                </ul>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 font-semibold mb-2">⚡ Pro Tip:</p>
                <p className="text-gray-300 text-sm">
                  Log activities immediately while details are fresh, and always set due dates for tasks to ensure follow-ups happen.
                </p>
              </div>
            </div>
          )
        },
        {
          id: 'sales-analytics',
          title: 'Sales Dashboard & Analytics',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Make data-driven decisions with comprehensive sales insights and metrics.
              </p>
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Key Metrics:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">Total Leads</p>
                    <p className="text-gray-400 text-sm">Number of all leads in system</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">Qualified Leads</p>
                    <p className="text-gray-400 text-sm">Leads marked as qualified</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">Pipeline Value</p>
                    <p className="text-gray-400 text-sm">Total value of all open deals</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-white font-semibold">Close Rate</p>
                    <p className="text-gray-400 text-sm">Win rate percentage</p>
                  </div>
                </div>
                <h4 className="text-white font-semibold mt-4">Visualizations:</h4>
                <ul className="text-gray-300 space-y-2">
                  <li>• <strong>Revenue Chart:</strong> Track revenue over time</li>
                  <li>• <strong>Lead Sources Chart:</strong> Distribution by source</li>
                  <li>• <strong>Conversion Funnel:</strong> Lead → Deal → Won progression</li>
                  <li>• <strong>Pipeline by Stage:</strong> Deal count and value per stage</li>
                  <li>• <strong>Win/Loss Analysis:</strong> Closed won vs closed lost</li>
                  <li>• <strong>Recent Activities:</strong> Latest sales activities</li>
                  <li>• <strong>Top Leads:</strong> Highest-scoring leads</li>
                  <li>• <strong>Upcoming Tasks:</strong> Due soon and overdue tasks</li>
                </ul>
              </div>
            </div>
          )
        },
        {
          id: 'sales-phase-2',
          title: 'Coming Soon - Phase 2',
          content: (
            <div className="space-y-4">
              <p className="text-gray-300">
                We're actively developing these advanced features for Q1 2026:
              </p>
              <div className="space-y-3">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">🚀 Email Integration</h4>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Send emails directly from lead/deal pages</li>
                    <li>• Email templates for common scenarios</li>
                    <li>• Email open and click tracking</li>
                    <li>• Automatic activity logging</li>
                  </ul>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">📊 Advanced Analytics</h4>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Custom date ranges</li>
                    <li>• Export reports to CSV/PDF</li>
                    <li>• Performance by sales rep</li>
                    <li>• Revenue forecasting charts</li>
                  </ul>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">📅 Calendar Integration</h4>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Schedule meetings from CRM</li>
                    <li>• Automatic meeting logging</li>
                    <li>• Meeting preparation with AI</li>
                    <li>• Availability sharing</li>
                  </ul>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">⚡ Additional Features</h4>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Custom lead scoring rules</li>
                    <li>• Bulk actions and operations</li>
                    <li>• Sales cadences/sequences</li>
                    <li>• LinkedIn integration</li>
                    <li>• Team collaboration features</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }
      ]
    }
  ];

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations({});
        setSectionsTranslated(documentationSectionsBase);
        return;
      }

      try {
        // Collect all section and subsection titles
        const allTexts: string[] = [];

        // Header texts
        const headerTexts = [
          'Iqonga Documentation',
          'Comprehensive guides to help you master the Iqonga platform and create powerful AI agents for your social media presence.',
          'Search documentation...',
          'Quick Links',
          'Frequently Asked Questions',
          'Find answers to common questions about Iqonga',
          'Platform Status',
          'Check the current status of all platform services',
          'Contact Support',
          'Get help from our support team'
        ];
        headerTexts.forEach(text => {
          if (!allTexts.includes(text)) allTexts.push(text);
        });

        // Extract section and subsection titles
        documentationSectionsBase.forEach(section => {
          if (!allTexts.includes(section.title)) allTexts.push(section.title);
          section.subsections.forEach(subsection => {
            if (!allTexts.includes(subsection.title)) allTexts.push(subsection.title);
          });
        });

        // Batch translate ALL texts at once
        const { translationService } = await import('../services/translationService');
        const translatedTexts = await translationService.translateBatch(allTexts, language, 'Documentation page');

        // Build translation map
        const trans: Record<string, string> = {};
        allTexts.forEach((text, i) => {
          trans[text] = translatedTexts[i];
        });
        setTranslations(trans);

        // Reconstruct sections with translated titles
        const sectionsTrans = documentationSectionsBase.map(section => ({
          ...section,
          title: trans[section.title] || section.title,
          subsections: section.subsections.map((subsection: { id: string; title: string; content: React.ReactNode }) => ({
            ...subsection,
            title: trans[subsection.title] || subsection.title
          }))
        }));

        setSectionsTranslated(sectionsTrans);
      } catch (error) {
        console.error('Translation error:', error);
        setSectionsTranslated(documentationSectionsBase);
      }
    };

    loadTranslations();
  }, [language, t]);

  // Show only framework-relevant docs (exclude business-only sections)
  const FRAMEWORK_DOC_IDS = [
    'getting-started', 'ai-agents', 'content-generation', 'productivity-suite', 'integrations',
    'company-knowledge-base', 'analytics-performance', 'security-privacy', 'troubleshooting',
  ];
  const excludedDocIds = ['keyword-intelligence', 'twitter-analytics', 'token-rewards', 'billing', 'webinar-platform', 'sales-crm'];
  const documentationSections = (sectionsTranslated.length > 0 ? sectionsTranslated : documentationSectionsBase)
    .filter((s: { id: string }) => !excludedDocIds.includes(s.id));

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <SEO
        title="Documentation"
        description="Iqonga framework documentation: what is Iqonga, architecture, getting started, using the framework, building on it, Agent Forum."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            {translations['Iqonga Documentation'] || 'Iqonga Documentation'}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {translations['Comprehensive guides to help you master the Iqonga platform and create powerful AI agents for your social media presence.'] || 
             'Guides for the open-source Agentic framework: get started, build agents, connect channels, and extend the platform.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder={translations['Search documentation...'] || 'Search documentation...'}
                className="w-full px-4 py-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="max-w-4xl mx-auto">
          {documentationSections.map((section) => (
            <div key={section.id} className="mb-6">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {section.icon}
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                </div>
                {expandedSections[section.id] ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSections[section.id] && (
                <div className="mt-4 space-y-4">
                  {section.subsections.map((subsection: { id: string; title: string; content: React.ReactNode }) => (
                    <div key={subsection.id} className="bg-gray-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">{subsection.title}</h3>
                      {subsection.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">{translations['Quick Links'] || 'Quick Links'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/faq"
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 transition-colors"
            >
              <h4 className="text-white font-semibold mb-2">{translations['Frequently Asked Questions'] || 'Frequently Asked Questions'}</h4>
              <p className="text-gray-300 text-sm">{translations['Find answers to common questions about Iqonga'] || 'Find answers to common questions about Iqonga'}</p>
            </a>
            <a
              href="/status"
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 transition-colors"
            >
              <h4 className="text-white font-semibold mb-2">{translations['Platform Status'] || 'Platform Status'}</h4>
              <p className="text-gray-300 text-sm">{translations['Check the current status of all platform services'] || 'Check the current status of all platform services'}</p>
            </a>
            <a
              href="/contact"
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 transition-colors"
            >
              <h4 className="text-white font-semibold mb-2">{translations['Contact Support'] || 'Contact Support'}</h4>
              <p className="text-gray-300 text-sm">{translations['Get help from our support team'] || 'Get help from our support team'}</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
