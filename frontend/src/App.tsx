import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { initGA, trackPageView } from './utils/analytics';
import { isForumDomain, getDomainConfig } from './utils/domain';

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
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentCancelled from '@/pages/PaymentCancelled';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import CreditManagement from '@/pages/CreditManagement';
import TelegramSettings from '@/pages/TelegramSettings';
import Pricing from '@/pages/Pricing';
import HowTo from '@/pages/HowTo';
import DiscordIntegration from '@/pages/DiscordIntegration';
import DiscordAppGuide from '@/pages/DiscordAppGuide';
import InstagramIntegration from '@/pages/InstagramIntegration';
import YouTubeIntegration from '@/pages/YouTubeIntegration';
import CanvaIntegration from '@/pages/CanvaIntegration';
import TemplateLibrary from '@/pages/TemplateLibrary';
import ShopifyIntegration from '@/pages/ShopifyIntegration';
import About from '@/pages/About';
import DeveloperPortal from '@/pages/DeveloperPortal';
import WidgetIntegration from '@/pages/WidgetIntegration';
import Contact from '@/pages/Contact';
import Documentation from '@/pages/Documentation';
import DocsRedirect from '@/pages/DocsRedirect';
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
import AdminCreditTransactions from '@/pages/admin/AdminCreditTransactions';
import AdminApiUsage from '@/pages/admin/AdminApiUsage';
import AdminIntegrations from '@/pages/admin/AdminIntegrations';
import AdminBulkOperations from '@/pages/admin/AdminBulkOperations';
import AdminReports from '@/pages/admin/AdminReports';
import AdminSystemConfig from '@/pages/admin/AdminSystemConfig';
import AdminRateLimiting from '@/pages/admin/AdminRateLimiting';
import AdminServicePricing from '@/pages/admin/AdminServicePricing';
import WordPressPlugin from '@/pages/WordPressPlugin';
import WordPressPluginDocs from '@/pages/WordPressPluginDocs';
import WordPressWooCommerce from '@/pages/WordPressWooCommerce';
import BetaTesting from '@/pages/BetaTesting';
import ApiKeyManagement from '@/pages/ApiKeyManagement';
import SmartInbox from '@/pages/SmartInbox';
import Calendar from '@/pages/Calendar';
import Products from '@/pages/Products';
import SmartAdGenerator from '@/pages/SmartAdGenerator';
import SmartCampaignGenerator from '@/pages/SmartCampaignGenerator';
import ManualCampaignBuilder from '@/pages/ManualCampaignBuilder';
import Whiteboard from '@/pages/Whiteboard';
import InfluencerDiscovery from '@/pages/InfluencerDiscovery';
import ImageEditor from '@/pages/ImageEditor';
import SmartInboxProduct from '@/pages/products/SmartInboxProduct';
import AICalendarProduct from '@/pages/products/AICalendarProduct';
import AIImageEditorFeature from '@/pages/features/AIImageEditorFeature';
import SmartAdGeneratorFeature from '@/pages/features/SmartAdGeneratorFeature';
import SmartCampaignGeneratorFeature from '@/pages/features/SmartCampaignGeneratorFeature';
import LongFormContentFeature from '@/pages/features/LongFormContentFeature';
import CreativeWritingFeature from '@/pages/features/CreativeWritingFeature';
import PlatformChatFeature from '@/pages/features/PlatformChatFeature';
import CryptoIntelligenceFeature from '@/pages/features/CryptoIntelligenceFeature';
import InfluencerDiscoveryFeature from '@/pages/features/InfluencerDiscoveryFeature';
import KeywordIntelligenceFeature from '@/pages/features/KeywordIntelligenceFeature';
import WebinarPlatformFeature from '@/pages/features/WebinarPlatformFeature';
import SalesCRMFeature from '@/pages/features/SalesCRMFeature';
import ContentBriefGeneratorFeature from '@/pages/features/ContentBriefGeneratorFeature';
import MultiModalContentFeature from '@/pages/features/MultiModalContentFeature';
import ContentSeriesGeneratorFeature from '@/pages/features/ContentSeriesGeneratorFeature';
import ContentRepurposingFeature from '@/pages/features/ContentRepurposingFeature';
import VisualContentCalendarFeature from '@/pages/features/VisualContentCalendarFeature';
import ContentOptimizationAssistantFeature from '@/pages/features/ContentOptimizationAssistantFeature';
import ContentResearchIntegrationFeature from '@/pages/features/ContentResearchIntegrationFeature';
import ContentPerformancePredictionFeature from '@/pages/features/ContentPerformancePredictionFeature';
import EBookCreatorFeature from '@/pages/features/EBookCreatorFeature';
import AgentsSocialMediaForumsFeature from '@/pages/features/AgentsSocialMediaForumsFeature';
import DataDeletionStatus from '@/pages/DataDeletionStatus';
import CryptoIntelligence from '@/pages/CryptoIntelligence';
import KeywordIntelligence from '@/pages/KeywordIntelligence';
import TwitterAnalytics from '@/pages/TwitterAnalytics';
import Referrals from '@/pages/Referrals';
import Chat from '@/pages/Chat';
import ContentSeriesGenerator from '@/pages/ContentSeriesGenerator';
import MultiModalContent from '@/pages/MultiModalContent';
import ContentRepurposing from '@/pages/ContentRepurposing';
import VisualContentCalendar from '@/pages/VisualContentCalendar';
import ContentBriefGenerator from '@/pages/ContentBriefGenerator';
import UseCases from '@/pages/UseCases';
import ReferralProgram from '@/pages/ReferralProgram';
import AssistantConnections from '@/pages/AssistantConnections';
import Workflows from '@/pages/Workflows';
import AgentTeams from '@/pages/AgentTeams';

// Sales Functions Pages
import LeadsList from '@/pages/Leads/LeadsList';
import LeadDetail from '@/pages/Leads/LeadDetail';
import LeadForm from '@/pages/Leads/LeadForm';
import PipelineBoard from '@/pages/Pipeline/PipelineBoard';
import DealDetail from '@/pages/Pipeline/DealDetail';
import DealForm from '@/pages/Pipeline/DealForm';
import SalesDashboard from '@/pages/Sales/SalesDashboard';
import AdvancedAnalytics from '@/pages/Sales/AdvancedAnalytics';
import ScoringRulesManager from '@/pages/Sales/ScoringRulesManager';
import CadenceList from '@/pages/Sales/CadenceList';
import CadenceBuilder from '@/pages/Sales/CadenceBuilder';
import VisitorDashboard from '@/pages/Sales/VisitorDashboard';
import VisitorDetail from '@/pages/Sales/VisitorDetail';
import ActivityForm from '@/pages/Activities/ActivityForm';
import TasksList from '@/pages/Activities/TasksList';

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

// Component to track page views
const PageViewTracker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA on mount
    initGA();
  }, []);

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search);
  }, [location]);

  return <>{children}</>;
};

const App: React.FC = () => {
  const isForum = isForumDomain();
  const config = getDomainConfig();
  
  return (
    <LanguageProvider>
      <div className={`min-h-screen bg-gray-900 ${isForum ? 'theme-forum' : 'theme-main'}`}>
        <PageViewTracker>
        <Routes>
        {/* Public routes with uniform header/footer */}
        <Route element={<PublicLayout />}>
          {/* Root route: Landing on main domain, redirect to forums on forum domain */}
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/personalities" element={<Personalities />} />
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/referral-program" element={<ReferralProgram />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/how-to" element={<Navigate to="/docs" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/docs" element={<DocsRedirect />} />
          <Route path="/developers" element={<DeveloperPortal />} />
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
          <Route path="/features/crypto-intelligence" element={<CryptoIntelligenceFeature />} />
          <Route path="/features/influencer-discovery" element={<InfluencerDiscoveryFeature />} />
          <Route path="/features/keyword-intelligence" element={<KeywordIntelligenceFeature />} />
          <Route path="/features/smart-ad-generator" element={<SmartAdGeneratorFeature />} />
          <Route path="/features/smart-campaign-generator" element={<SmartCampaignGeneratorFeature />} />
          <Route path="/features/webinar-platform" element={<WebinarPlatformFeature />} />
          <Route path="/features/sales-crm" element={<SalesCRMFeature />} />
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
          <Route path="/features/agents-social-media-forums" element={<AgentsSocialMediaForumsFeature />} />
          <Route path="/data-deletion/:requestId" element={<DataDeletionStatus />} />
          <Route path="/ebook/share/:token" element={<EBookShare />} />
        </Route>
        
        {/* Auth callback routes */}
        <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/error" element={<AuthError />} />
        
        {/* Payment callback routes */}
        <Route path="/payments/success" element={<PaymentSuccess />} />
        <Route path="/payments/cancelled" element={<PaymentCancelled />} />
        
        {/* Protected routes - Layout component handles auth check */}
        {/* Iqonga Phase 1: Framework core routes only; solution routes disabled */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/create" element={<CreateAgent />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/agents/:id/widget" element={<WidgetIntegration />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/workflows/new" element={<Workflows />} />
          <Route path="/workflows/:id" element={<Workflows />} />
          <Route path="/teams" element={<AgentTeams />} />
          <Route path="/teams/new" element={<AgentTeams />} />
          <Route path="/teams/:id" element={<AgentTeams />} />
          <Route path="/scheduled-posts" element={<ScheduledPosts />} />
          <Route path="/company" element={<Company />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/smart-inbox" element={<SmartInbox />} />
          <Route path="/telegram" element={<TelegramSettings />} />
          <Route path="/assistant" element={<AssistantConnections />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/api-keys" element={<ApiKeyManagement />} />
          {/* Phase 1 disabled: ai-content, content-series, multimodal, content-repurposing, content-calendar, content-brief, smart-ads, templates, smart-campaigns, manual-campaigns, whiteboard, influencers, long-form, creative-writing, ebook, images, video, heygen, music, lyrics, media-library, image-editor, characters, smart-inbox, credits, discord, instagram, youtube, canva, shopify, crypto, keyword, twitter-analytics, sales/*, whatsapp/* */}
          
          {/* Admin Routes - Protected by Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="agents" element={<AdminAgents />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="credit-transactions" element={<AdminCreditTransactions />} />
            <Route path="api-usage" element={<AdminApiUsage />} />
            <Route path="integrations" element={<AdminIntegrations />} />
            <Route path="bulk-operations" element={<AdminBulkOperations />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="system-config" element={<AdminSystemConfig />} />
            <Route path="rate-limiting" element={<AdminRateLimiting />} />
            <Route path="service-pricing" element={<AdminServicePricing />} />
            <Route path="scheduled-posts" element={<AdminScheduledPosts />} />
            <Route path="post-queue" element={<AdminPostQueue />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="actions" element={<AdminActions />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
        
        {/* Iqonga Phase 1: WordPress plugin routes disabled */}
        {/* <Route element={<PublicLayout />}>
          <Route path="/wordpress-plugin" element={<WordPressPlugin />} />
          <Route path="/wordpress-plugin/woocommerce" element={<WordPressWooCommerce />} />
          <Route path="/wordpress-plugin-docs" element={<WordPressPluginDocs />} />
        </Route> */}

        {/* 404 route */}
        <Route path="*" element={<NotFound />} />

      </Routes>
        </PageViewTracker>
      </div>
    </LanguageProvider>
  );
};

export default App; 