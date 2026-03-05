/**
 * Standalone (open-source) app entry.
 * Only IN routes per docs/OPEN_SOURCE_SCOPE.md and scripts/standalone-manifest.json.
 * Sync script copies this over App.tsx when building the standalone repo.
 */
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { initGA, trackPageView } from '@/utils/analytics';

import Layout from '@/components/Layout/Layout';
import PublicLayout from '@/components/Layout/PublicLayout';
import Dashboard from '@/pages/Dashboard';
import Agents from '@/pages/Agents';
import AgentDetail from '@/pages/AgentDetail';
import CreateAgent from '@/pages/CreateAgent';
import AIContentGenerator from '@/pages/AIContentGenerator';
import LongFormContent from '@/pages/LongFormContent';
import CreativeWriting from '@/pages/CreativeWriting';
import EBookCreator from '@/pages/EBookCreator';
import EBookEditor from '@/pages/EBookEditor';
import EBookShare from '@/pages/EBookShare';
import ScheduledPosts from '@/pages/ScheduledPosts';
import Analytics from '@/pages/Analytics';
import Marketplace from '@/pages/Marketplace';
import Company from '@/pages/Company';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Landing from '@/pages/Landing';
import Features from '@/pages/Features';
import Personalities from '@/pages/Personalities';
import Roadmap from '@/pages/Roadmap';
import NotFound from '@/pages/NotFound';
import ImageGeneration from '@/pages/ImageGeneration';
import VideoGeneration from '@/pages/VideoGeneration';
import HeyGenAvatarVideos from '@/pages/HeyGenAvatarVideos';
import MusicGeneration from '@/pages/MusicGeneration';
import MusicVideoGeneration from '@/pages/MusicVideoGeneration';
import LyricsGeneration from '@/pages/LyricsGeneration';
import MediaLibrary from '@/pages/MediaLibrary';
import CharacterLibrary from '@/pages/CharacterLibrary';
import TwitterCallback from '@/pages/TwitterCallback';
import AuthCallback from '@/pages/AuthCallback';
import AuthError from '@/pages/AuthError';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import TelegramSettings from '@/pages/TelegramSettings';
import HowTo from '@/pages/HowTo';
import DiscordIntegration from '@/pages/DiscordIntegration';
import DiscordAppGuide from '@/pages/DiscordAppGuide';
import InstagramIntegration from '@/pages/InstagramIntegration';
import YouTubeIntegration from '@/pages/YouTubeIntegration';
import CanvaIntegration from '@/pages/CanvaIntegration';
import TemplateLibrary from '@/pages/TemplateLibrary';
import ShopifyIntegration from '@/pages/ShopifyIntegration';
import About from '@/pages/About';
import WidgetIntegration from '@/pages/WidgetIntegration';
import Contact from '@/pages/Contact';
import Documentation from '@/pages/Documentation';
import FAQ from '@/pages/FAQ';
import Status from '@/pages/Status';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminScheduledPosts from '@/pages/admin/AdminScheduledPosts';
import AdminPostQueue from '@/pages/admin/AdminPostQueue';
import AdminLogs from '@/pages/admin/AdminLogs';
import AdminActions from '@/pages/admin/AdminActions';
import AdminSupport from '@/pages/admin/AdminSupport';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminContent from '@/pages/admin/AdminContent';
import AdminAgents from '@/pages/admin/AdminAgents';
import AdminApiUsage from '@/pages/admin/AdminApiUsage';
import AdminIntegrations from '@/pages/admin/AdminIntegrations';
import AdminBulkOperations from '@/pages/admin/AdminBulkOperations';
import AdminReports from '@/pages/admin/AdminReports';
import AdminSystemConfig from '@/pages/admin/AdminSystemConfig';
import AdminRateLimiting from '@/pages/admin/AdminRateLimiting';
import WordPressPlugin from '@/pages/WordPressPlugin';
import WordPressPluginDocs from '@/pages/WordPressPluginDocs';
import WordPressWooCommerce from '@/pages/WordPressWooCommerce';
import BetaTesting from '@/pages/BetaTesting';
import ApiKeyManagement from '@/pages/ApiKeyManagement';
import SmartInbox from '@/pages/SmartInbox';
import Calendar from '@/pages/Calendar';
import Products from '@/pages/Products';
import ManualCampaignBuilder from '@/pages/ManualCampaignBuilder';
import Whiteboard from '@/pages/Whiteboard';
import InfluencerDiscovery from '@/pages/InfluencerDiscovery';
import ImageEditor from '@/pages/ImageEditor';
import SmartInboxProduct from '@/pages/products/SmartInboxProduct';
import AICalendarProduct from '@/pages/products/AICalendarProduct';
import AIImageEditorFeature from '@/pages/features/AIImageEditorFeature';
import LongFormContentFeature from '@/pages/features/LongFormContentFeature';
import CreativeWritingFeature from '@/pages/features/CreativeWritingFeature';
import PlatformChatFeature from '@/pages/features/PlatformChatFeature';
import InfluencerDiscoveryFeature from '@/pages/features/InfluencerDiscoveryFeature';
import KeywordIntelligenceFeature from '@/pages/features/KeywordIntelligenceFeature';
import WebinarPlatformFeature from '@/pages/features/WebinarPlatformFeature';
import ContentBriefGeneratorFeature from '@/pages/features/ContentBriefGeneratorFeature';
import MultiModalContentFeature from '@/pages/features/MultiModalContentFeature';
import ContentSeriesGeneratorFeature from '@/pages/features/ContentSeriesGeneratorFeature';
import ContentRepurposingFeature from '@/pages/features/ContentRepurposingFeature';
import VisualContentCalendarFeature from '@/pages/features/VisualContentCalendarFeature';
import ContentOptimizationAssistantFeature from '@/pages/features/ContentOptimizationAssistantFeature';
import ContentResearchIntegrationFeature from '@/pages/features/ContentResearchIntegrationFeature';
import ContentPerformancePredictionFeature from '@/pages/features/ContentPerformancePredictionFeature';
import EBookCreatorFeature from '@/pages/features/EBookCreatorFeature';
import DataDeletionStatus from '@/pages/DataDeletionStatus';
import KeywordIntelligence from '@/pages/KeywordIntelligence';
import TwitterAnalytics from '@/pages/TwitterAnalytics';
import Chat from '@/pages/Chat';
import ContentSeriesGenerator from '@/pages/ContentSeriesGenerator';
import MultiModalContent from '@/pages/MultiModalContent';
import ContentRepurposing from '@/pages/ContentRepurposing';
import VisualContentCalendar from '@/pages/VisualContentCalendar';
import ContentBriefGenerator from '@/pages/ContentBriefGenerator';
import UseCases from '@/pages/UseCases';

// WhatsApp Components
import WhatsAppDashboard from '@/components/WhatsApp/WhatsAppDashboard';
import AccountList from '@/components/WhatsApp/AccountSetup/AccountList';
import ConnectAccount from '@/components/WhatsApp/AccountSetup/ConnectAccount';
import ContactList from '@/components/WhatsApp/Contacts/ContactList';
import ContactDetail from '@/components/WhatsApp/Contacts/ContactDetail';
import ContactForm from '@/components/WhatsApp/Contacts/ContactForm';
import TemplateList from '@/components/WhatsApp/Templates/TemplateList';
import TemplateBuilder from '@/components/WhatsApp/Templates/TemplateBuilder';
import CampaignList from '@/components/WhatsApp/Campaigns/CampaignList';
import CampaignAnalytics from '@/components/WhatsApp/Campaigns/CampaignAnalytics';
import CampaignRecipients from '@/components/WhatsApp/Campaigns/CampaignRecipients';
import BotList from '@/components/WhatsApp/Bots/BotList';
import BotTester from '@/components/WhatsApp/Bots/BotTester';
import BotExecutions from '@/components/WhatsApp/Bots/BotExecutions';
import ConversationList from '@/components/WhatsApp/Messages/ConversationList';
import ConversationView from '@/components/WhatsApp/Messages/ConversationView';
import CampaignBuilder from '@/components/WhatsApp/Campaigns/CampaignBuilder';
import BotBuilder from '@/components/WhatsApp/Bots/BotBuilder';
import ContactGroups from '@/components/WhatsApp/Contacts/ContactGroups';
import ContactImport from '@/components/WhatsApp/Contacts/ContactImport';
import AccountDetail from '@/components/WhatsApp/AccountSetup/AccountDetail';
import AccountEdit from '@/components/WhatsApp/AccountSetup/AccountEdit';
import WebhookSettings from '@/components/WhatsApp/Settings/WebhookSettings';
import WhatsAppSettings from '@/components/WhatsApp/Settings/WhatsAppSettings';

const PageViewTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  useEffect(() => { initGA(); }, []);
  useEffect(() => { trackPageView(location.pathname + location.search); }, [location]);
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <div className={`min-h-screen bg-gray-900 theme-main`}>
        <PageViewTracker>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/features" element={<Features />} />
              <Route path="/personalities" element={<Personalities />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/how-to" element={<HowTo />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/docs" element={<Documentation />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/status" element={<Status />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/beta-testing" element={<BetaTesting />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/smart-inbox" element={<SmartInboxProduct />} />
              <Route path="/products/ai-calendar" element={<AICalendarProduct />} />
              <Route path="/features/ai-image-editor" element={<AIImageEditorFeature />} />
              <Route path="/features/platform-chat" element={<PlatformChatFeature />} />
              <Route path="/features/influencer-discovery" element={<InfluencerDiscoveryFeature />} />
              <Route path="/features/keyword-intelligence" element={<KeywordIntelligenceFeature />} />
              <Route path="/features/webinar-platform" element={<WebinarPlatformFeature />} />
              <Route path="/features/long-form-content" element={<LongFormContentFeature />} />
              <Route path="/features/creative-writing" element={<CreativeWritingFeature />} />
              <Route path="/features/content-brief-generator" element={<ContentBriefGeneratorFeature />} />
              <Route path="/features/multi-modal-content" element={<MultiModalContentFeature />} />
              <Route path="/features/content-series-generator" element={<ContentSeriesGeneratorFeature />} />
              <Route path="/features/content-repurposing" element={<ContentRepurposingFeature />} />
              <Route path="/features/visual-content-calendar" element={<VisualContentCalendarFeature />} />
              <Route path="/features/content-optimization-assistant" element={<ContentOptimizationAssistantFeature />} />
              <Route path="/features/content-research-integration" element={<ContentResearchIntegrationFeature />} />
              <Route path="/features/content-performance-prediction" element={<ContentPerformancePredictionFeature />} />
              <Route path="/features/ebook-creator" element={<EBookCreatorFeature />} />
              <Route path="/data-deletion/:requestId" element={<DataDeletionStatus />} />
              <Route path="/ebook/share/:token" element={<EBookShare />} />
            </Route>

            <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<AuthError />} />

            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/agents/create" element={<CreateAgent />} />
              <Route path="/agents/:id" element={<AgentDetail />} />
              <Route path="/agents/:id/widget" element={<WidgetIntegration />} />
              <Route path="/ai-content" element={<AIContentGenerator />} />
              <Route path="/content-series" element={<ContentSeriesGenerator />} />
              <Route path="/multimodal-content" element={<MultiModalContent />} />
              <Route path="/content-repurposing" element={<ContentRepurposing />} />
              <Route path="/content-calendar" element={<VisualContentCalendar />} />
              <Route path="/content-brief" element={<ContentBriefGenerator />} />
              <Route path="/templates" element={<TemplateLibrary />} />
              <Route path="/manual-campaigns" element={<ManualCampaignBuilder />} />
              <Route path="/whiteboard" element={<Whiteboard />} />
              <Route path="/influencers" element={<InfluencerDiscovery />} />
              <Route path="/long-form-content" element={<LongFormContent />} />
              <Route path="/creative-writing" element={<CreativeWriting />} />
              <Route path="/ebook-creator" element={<EBookCreator />} />
              <Route path="/ebook-editor/:projectId" element={<EBookEditor />} />
              <Route path="/scheduled-posts" element={<ScheduledPosts />} />
              <Route path="/images" element={<ImageGeneration />} />
              <Route path="/video-generation" element={<VideoGeneration />} />
              <Route path="/heygen-avatar-videos" element={<HeyGenAvatarVideos />} />
              <Route path="/music-generation" element={<MusicGeneration />} />
              <Route path="/music-video-generation" element={<MusicVideoGeneration />} />
              <Route path="/lyrics-generation" element={<LyricsGeneration />} />
              <Route path="/media-library" element={<MediaLibrary />} />
              <Route path="/image-editor" element={<ImageEditor />} />
              <Route path="/characters" element={<CharacterLibrary />} />
              <Route path="/smart-inbox" element={<SmartInbox />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/company" element={<Company />} />
              <Route path="/telegram" element={<TelegramSettings />} />
              <Route path="/discord" element={<DiscordIntegration />} />
              <Route path="/discord-app-guide" element={<DiscordAppGuide />} />
              <Route path="/instagram" element={<InstagramIntegration />} />
              <Route path="/youtube" element={<YouTubeIntegration />} />
              <Route path="/canva" element={<CanvaIntegration />} />
              <Route path="/shopify" element={<ShopifyIntegration />} />
              <Route path="/keyword-intelligence" element={<KeywordIntelligence />} />
              <Route path="/twitter-analytics" element={<TwitterAnalytics />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/api-keys" element={<ApiKeyManagement />} />

              <Route path="/whatsapp" element={<WhatsAppDashboard />} />
              <Route path="/whatsapp/accounts" element={<AccountList />} />
              <Route path="/whatsapp/accounts/connect" element={<ConnectAccount />} />
              <Route path="/whatsapp/accounts/:id" element={<AccountDetail />} />
              <Route path="/whatsapp/accounts/:id/edit" element={<AccountEdit />} />
              <Route path="/whatsapp/settings/webhooks" element={<WebhookSettings />} />
              <Route path="/whatsapp/settings" element={<WhatsAppSettings />} />
              <Route path="/whatsapp/contacts" element={<ContactList />} />
              <Route path="/whatsapp/contacts/new" element={<ContactForm />} />
              <Route path="/whatsapp/contacts/groups" element={<ContactGroups />} />
              <Route path="/whatsapp/contacts/import" element={<ContactImport />} />
              <Route path="/whatsapp/contacts/:id" element={<ContactDetail />} />
              <Route path="/whatsapp/contacts/:id/edit" element={<ContactForm />} />
              <Route path="/whatsapp/templates" element={<TemplateList />} />
              <Route path="/whatsapp/templates/new" element={<TemplateBuilder />} />
              <Route path="/whatsapp/templates/:id" element={<TemplateBuilder />} />
              <Route path="/whatsapp/templates/:id/edit" element={<TemplateBuilder />} />
              <Route path="/whatsapp/campaigns" element={<CampaignList />} />
              <Route path="/whatsapp/campaigns/new" element={<CampaignBuilder />} />
              <Route path="/whatsapp/campaigns/:id" element={<CampaignAnalytics />} />
              <Route path="/whatsapp/campaigns/:id/analytics" element={<CampaignAnalytics />} />
              <Route path="/whatsapp/campaigns/:id/recipients" element={<CampaignRecipients />} />
              <Route path="/whatsapp/campaigns/:id/edit" element={<CampaignBuilder />} />
              <Route path="/whatsapp/bots" element={<BotList />} />
              <Route path="/whatsapp/bots/new" element={<BotBuilder />} />
              <Route path="/whatsapp/bots/:id" element={<BotTester />} />
              <Route path="/whatsapp/bots/:id/test" element={<BotTester />} />
              <Route path="/whatsapp/bots/:id/executions" element={<BotExecutions />} />
              <Route path="/whatsapp/bots/:id/edit" element={<BotBuilder />} />
              <Route path="/whatsapp/messages" element={<ConversationList />} />
              <Route path="/whatsapp/messages/:id" element={<ConversationView />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="agents" element={<AdminAgents />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="api-usage" element={<AdminApiUsage />} />
                <Route path="integrations" element={<AdminIntegrations />} />
                <Route path="bulk-operations" element={<AdminBulkOperations />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="system-config" element={<AdminSystemConfig />} />
                <Route path="rate-limiting" element={<AdminRateLimiting />} />
                <Route path="scheduled-posts" element={<AdminScheduledPosts />} />
                <Route path="post-queue" element={<AdminPostQueue />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="actions" element={<AdminActions />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>

            <Route element={<PublicLayout />}>
              <Route path="/wordpress-plugin" element={<WordPressPlugin />} />
              <Route path="/wordpress-plugin/woocommerce" element={<WordPressWooCommerce />} />
              <Route path="/wordpress-plugin-docs" element={<WordPressPluginDocs />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageViewTracker>
      </div>
    </LanguageProvider>
  );
};

export default App;
