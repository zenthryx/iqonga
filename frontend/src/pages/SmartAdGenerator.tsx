import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  SparklesIcon,
  PhotoIcon,
  VideoCameraIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  EyeIcon,
  HeartIcon,
  TrashIcon,
  DevicePhoneMobileIcon,
  SwatchIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon,
  PaintBrushIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import AdPreviewMockup from '../components/Ads/AdPreviewMockup';
import AdExportPanel from '../components/Ads/AdExportPanel';
import ProductCatalogSelector from '../components/Ads/ProductCatalogSelector';
import BrandKitPanel from '../components/Ads/BrandKitPanel';
import TextOverlayEditor from '../components/Ads/TextOverlayEditor';
import UserImageUploader from '../components/Ads/UserImageUploader';
import AvatarSelector from '../components/Characters/AvatarSelector';
import CanvaQuickImport from '../components/Canva/CanvaQuickImport';
import { mediaService } from '../services/mediaService';
import templateAdService, { AdDesignTemplate, CopyVariant as TemplateCopyVariant } from '../services/templateAdService';

interface Platform {
  platform: string;
  formats: string[];
  formatDetails: Record<string, any>;
}

interface VisualStyle {
  name: string;
  description: string;
}

interface CopyVariant {
  headline: string;
  primaryText: string;
  description?: string;
  hashtags?: string[];
  approach?: string;
}

interface GeneratedAd {
  adId: string;
  adType: string;
  platforms: string[];
  copyVariants: CopyVariant[];
  visualAssets: Record<string, Record<string, any>>;
  videoAssets?: Record<string, any>;
  ugcAssets?: Record<string, any>;
  adPackages: Record<string, any>;
  metadata: {
    generatedAt: string;
    variantCount: number;
    visualStyle: string;
    includesVideo: boolean;
    includesUGC: boolean;
  };
}

interface AdHistoryItem {
  id: string;
  ad_type: string;
  platforms: string[];
  visual_style: string;
  copy_variants: CopyVariant[];
  status: string;
  favorite: boolean;
  tags: string[];
  times_used: number;
  created_at: string;
}

const SmartAdGenerator: React.FC = () => {
  const navigate = useNavigate();
  
  // Form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [adType, setAdType] = useState('product_showcase');
  const [visualStyle, setVisualStyle] = useState('modern');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [callToAction, setCallToAction] = useState('Shop Now');
  const [promotionalDetails, setPromotionalDetails] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [variantCount, setVariantCount] = useState(2);
  const [generateVideo, setGenerateVideo] = useState(false);
  const [generateUGC, setGenerateUGC] = useState(false);
  const [ugcAvatarId, setUgcAvatarId] = useState<string>('');
  const [ugcLookId, setUgcLookId] = useState<string | null>(null);
  const [imageProvider, setImageProvider] = useState('gemini'); // Default to Gemini
  const [imageProviders, setImageProviders] = useState<{id: string; name: string; available: boolean; description: string}[]>([
    { id: 'openai', name: 'OpenAI DALL-E 3', available: true, description: 'High-quality, creative images' },
    { id: 'gemini', name: 'Google Gemini (Imagen 4)', available: true, description: 'Photorealistic, detailed images (default)' },
    { id: 'stability', name: 'Stability AI (SD3)', available: true, description: 'Artistic, stylized images' },
    { id: 'replicate', name: 'Replicate (Flux Schnell)', available: true, description: 'Community models via Replicate' }
  ]);
  const [videoProvider, setVideoProvider] = useState('runwayml');
  const [videoProviders, setVideoProviders] = useState<{id: string; name: string; available: boolean; description: string; maxDuration: number}[]>([
    { id: 'runwayml', name: 'Runway ML', available: true, description: 'Fast, cinematic videos (max 8s)', maxDuration: 8 },
    { id: 'veo', name: 'Google Veo 3.1', available: true, description: 'High-quality, longer videos (max 60s)', maxDuration: 60 },
    { id: 'pika', name: 'Pika Labs', available: true, description: 'Creative video generation (max 10s)', maxDuration: 10 },
    { id: 'replicate', name: 'Replicate (MiniMax video-01)', available: true, description: 'Text-to-video ~6s (free tier on Replicate)', maxDuration: 6 }
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedAd, setGeneratedAd] = useState<GeneratedAd | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [visualStyles, setVisualStyles] = useState<VisualStyle[]>([
    { name: 'modern', description: 'Clean, minimalist, contemporary design' },
    { name: 'luxury', description: 'Premium, elegant, sophisticated' },
    { name: 'playful', description: 'Colorful, fun, energetic' },
    { name: 'professional', description: 'Corporate, trustworthy, clean' },
    { name: 'bold', description: 'High contrast, impactful' },
    { name: 'lifestyle', description: 'Authentic, natural lighting' },
    { name: 'tech', description: 'Futuristic, gradient, neon accents' },
    { name: 'organic', description: 'Natural, earthy tones' },
    { name: 'vintage', description: 'Retro aesthetics, nostalgic' },
    { name: 'minimalist', description: 'Simple, lots of white space' }
  ]);
  const [adTypes, setAdTypes] = useState<string[]>([
    'product_showcase',
    'brand_awareness',
    'testimonial',
    'promotional',
    'educational',
    'storytelling',
    'comparison',
    'social_proof',
    'urgency',
    'lifestyle'
  ]);
  const [pricing, setPricing] = useState<any>(null);
  const [adHistory, setAdHistory] = useState<AdHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [showUserImages, setShowUserImages] = useState(false);
  const [selectedUserImageUrl, setSelectedUserImageUrl] = useState('');
  const [selectedImageForOverlay, setSelectedImageForOverlay] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCanvaTemplates, setShowCanvaTemplates] = useState(false);
  const [selectedCanvaImageUrl, setSelectedCanvaImageUrl] = useState('');
  const [viewingAd, setViewingAd] = useState<any | null>(null);
  const [loadingAdDetails, setLoadingAdDetails] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AdDesignTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<AdDesignTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [useTemplateMode, setUseTemplateMode] = useState(false);
  
  // Progress tracking for ad generation
  const [generationProgress, setGenerationProgress] = useState<{
    step: number;
    message: string;
    subMessage?: string;
    percentage: number;
  } | null>(null);

  // Dynamic progress steps based on video generation
  const getProgressSteps = () => {
    if (generateVideo) {
      return [
        { step: 1, message: 'Analyzing your product...', subMessage: 'Understanding brand context', duration: 3000 },
        { step: 2, message: 'Generating ad copy...', subMessage: 'Creating compelling headlines & text', duration: 8000 },
        { step: 3, message: 'Creating visuals...', subMessage: 'Generating images for each platform', duration: 60000 },
        { step: 4, message: 'Generating videos...', subMessage: '🎬 This takes 2-5 minutes per video', duration: 300000 },
        { step: 5, message: 'Optimizing for platforms...', subMessage: 'Adapting formats & sizes', duration: 15000 },
        { step: 6, message: 'Finalizing your ad...', subMessage: 'Packaging everything together', duration: 5000 }
      ];
    }
    return [
      { step: 1, message: 'Analyzing your product...', subMessage: 'Understanding brand context', duration: 3000 },
      { step: 2, message: 'Generating ad copy...', subMessage: 'Creating compelling headlines & text', duration: 8000 },
      { step: 3, message: 'Creating visuals...', subMessage: 'Generating images for each platform', duration: 60000 },
      { step: 4, message: 'Optimizing for platforms...', subMessage: 'Adapting formats & sizes', duration: 15000 },
      { step: 5, message: 'Finalizing your ad...', subMessage: 'Packaging everything together', duration: 5000 }
    ];
  };

  const progressSteps = getProgressSteps();

  // Simulate progress during generation
  const simulateProgress = () => {
    const steps = getProgressSteps(); // Get fresh steps based on current settings
    let currentStep = 0;
    let elapsedTime = 0;
    
    const updateProgress = () => {
      if (currentStep >= steps.length) {
        setGenerationProgress({ step: steps.length, message: 'Almost done...', subMessage: 'Just a few more seconds', percentage: 95 });
        return;
      }
      
      const stepInfo = steps[currentStep];
      const stepProgress = Math.min(100, (elapsedTime / stepInfo.duration) * 100);
      const overallPercentage = ((currentStep / steps.length) * 100) + (stepProgress / steps.length);
      
      setGenerationProgress({
        step: stepInfo.step,
        message: stepInfo.message,
        subMessage: stepInfo.subMessage,
        percentage: Math.min(90, overallPercentage)
      });
      
      elapsedTime += 500;
      if (elapsedTime >= stepInfo.duration) {
        currentStep++;
        elapsedTime = 0;
      }
    };
    
    updateProgress();
    const interval = setInterval(updateProgress, 500);
    return () => clearInterval(interval);
  };

  // Built-in ad templates
  const adTemplates = [
    {
      id: 'flash-sale',
      name: '⚡ Flash Sale',
      description: 'Urgency-driven promotional ad',
      config: {
        adType: 'promotional',
        visualStyle: 'bold',
        callToAction: 'Shop Now',
        targetPlatforms: ['facebook', 'instagram'],
        brandVoice: 'Urgent, exciting, exclusive'
      }
    },
    {
      id: 'product-launch',
      name: '🚀 Product Launch',
      description: 'Introduce a new product',
      config: {
        adType: 'product_showcase',
        visualStyle: 'modern',
        callToAction: 'Learn More',
        targetPlatforms: ['facebook', 'instagram', 'linkedin'],
        brandVoice: 'Innovative, exciting, premium'
      }
    },
    {
      id: 'brand-awareness',
      name: '🎯 Brand Awareness',
      description: 'Build brand recognition',
      config: {
        adType: 'brand_awareness',
        visualStyle: 'lifestyle',
        callToAction: 'Discover More',
        targetPlatforms: ['facebook', 'instagram', 'youtube'],
        brandVoice: 'Authentic, relatable, aspirational'
      }
    },
    {
      id: 'testimonial',
      name: '⭐ Social Proof',
      description: 'Customer reviews & testimonials',
      config: {
        adType: 'testimonial',
        visualStyle: 'professional',
        callToAction: 'See Reviews',
        targetPlatforms: ['facebook', 'instagram'],
        brandVoice: 'Trustworthy, genuine, satisfied customers'
      }
    },
    {
      id: 'limited-offer',
      name: '⏰ Limited Time Offer',
      description: 'Time-sensitive promotion',
      config: {
        adType: 'urgency',
        visualStyle: 'bold',
        callToAction: 'Get Offer',
        targetPlatforms: ['facebook', 'instagram', 'twitter'],
        brandVoice: 'Urgent, exclusive, dont miss out'
      }
    },
    {
      id: 'educational',
      name: '📚 Educational',
      description: 'How-to or informative content',
      config: {
        adType: 'educational',
        visualStyle: 'minimalist',
        callToAction: 'Learn More',
        targetPlatforms: ['facebook', 'linkedin', 'youtube'],
        brandVoice: 'Helpful, informative, expert'
      }
    },
    {
      id: 'luxury',
      name: '💎 Luxury Premium',
      description: 'High-end, sophisticated ads',
      config: {
        adType: 'product_showcase',
        visualStyle: 'luxury',
        callToAction: 'Explore',
        targetPlatforms: ['facebook', 'instagram'],
        brandVoice: 'Elegant, exclusive, premium quality'
      }
    },
    {
      id: 'b2b-professional',
      name: '🏢 B2B Professional',
      description: 'Business-focused ads',
      config: {
        adType: 'brand_awareness',
        visualStyle: 'professional',
        callToAction: 'Contact Us',
        targetPlatforms: ['linkedin', 'facebook'],
        brandVoice: 'Professional, reliable, industry-leading'
      }
    }
  ];

  const applyTemplate = (template: typeof adTemplates[0]) => {
    setAdType(template.config.adType);
    setVisualStyle(template.config.visualStyle);
    setCallToAction(template.config.callToAction);
    setTargetPlatforms(template.config.targetPlatforms);
    setBrandVoice(template.config.brandVoice);
    setShowTemplates(false);
    toast.success(`Applied "${template.name}" template`);
  };

  // Translation feature
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [translatedCopy, setTranslatedCopy] = useState<any[]>([]);

  const languages = [
    { code: 'es', name: '🇪🇸 Spanish' },
    { code: 'fr', name: '🇫🇷 French' },
    { code: 'de', name: '🇩🇪 German' },
    { code: 'it', name: '🇮🇹 Italian' },
    { code: 'pt', name: '🇵🇹 Portuguese' },
    { code: 'nl', name: '🇳🇱 Dutch' },
    { code: 'pl', name: '🇵🇱 Polish' },
    { code: 'ru', name: '🇷🇺 Russian' },
    { code: 'ja', name: '🇯🇵 Japanese' },
    { code: 'ko', name: '🇰🇷 Korean' },
    { code: 'zh', name: '🇨🇳 Chinese' },
    { code: 'ar', name: '🇸🇦 Arabic' },
    { code: 'hi', name: '🇮🇳 Hindi' },
    { code: 'tr', name: '🇹🇷 Turkish' },
  ];

  const handleTranslate = async () => {
    if (!generatedAd) return;
    
    setTranslating(true);
    try {
      const response = await apiService.post('/translation/batch', {
        texts: generatedAd.copyVariants.flatMap(v => [
          v.headline,
          v.primaryText,
          v.description || ''
        ]).filter(t => t),
        target_language: targetLanguage,
        source_language: 'en',
        context: 'advertising copy'
      });

      if (response.success && response.data?.translations) {
        // Reconstruct the copy variants with translations
        const translations = response.data.translations;
        let index = 0;
        const translated = generatedAd.copyVariants.map(variant => ({
          headline: translations[index++] || variant.headline,
          primaryText: translations[index++] || variant.primaryText,
          description: variant.description ? translations[index++] : undefined,
          hashtags: variant.hashtags // Keep original hashtags
        }));
        
        setTranslatedCopy(translated);
        toast.success(`Translated to ${languages.find(l => l.code === targetLanguage)?.name}`);
      } else {
        throw new Error('Translation failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const applyTranslation = () => {
    if (generatedAd && translatedCopy.length > 0) {
      setGeneratedAd({
        ...generatedAd,
        copyVariants: translatedCopy as any
      });
      setShowTranslateModal(false);
      setTranslatedCopy([]);
      toast.success('Translation applied!');
    }
  };
  const [showPreview, setShowPreview] = useState(false);
  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [brandKit, setBrandKit] = useState<any>(null);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
    loadAdHistory();
    loadTemplates();
  }, []);

  // Load templates when template selector is shown
  useEffect(() => {
    if (showTemplateSelector) {
      loadTemplates();
    }
  }, [showTemplateSelector]);

  // Check if template was passed from navigation
  useEffect(() => {
    const state = (window.history.state as any)?.usr;
    if (state?.templateId && state?.useTemplate) {
      loadTemplateAndSet(state.templateId);
    }
  }, []);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await templateAdService.listTemplates({
        category: adType,
        platform: targetPlatforms[0],
        includePublic: true
      });
      setAvailableTemplates(response.data || []);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadTemplateAndSet = async (templateId: string) => {
    try {
      const response = await templateAdService.getTemplate(templateId);
      if (response.data) {
        setSelectedTemplate(response.data);
        setUseTemplateMode(true);
        toast.success(`Template "${response.data.name}" selected. Generate ads with 0 LLM cost!`);
      }
    } catch (error: any) {
      toast.error('Failed to load template');
    }
  };

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      
      // Load each config independently to handle individual failures
      const [platformsRes, stylesRes, typesRes, pricingRes, providersRes] = await Promise.all([
        apiService.get('/smart-ads/platforms').catch(() => ({ success: false, data: null })),
        apiService.get('/smart-ads/visual-styles').catch(() => ({ success: false, data: null })),
        apiService.get('/smart-ads/ad-types').catch(() => ({ success: false, data: null })),
        apiService.get('/smart-ads/pricing').catch(() => ({ success: false, data: null })),
        apiService.get('/smart-ads/image-providers').catch(() => ({ success: false, data: null }))
      ]) as any[];

      if (platformsRes.success && platformsRes.data) setPlatforms(platformsRes.data);
      if (stylesRes.success && stylesRes.data && stylesRes.data.length > 0) setVisualStyles(stylesRes.data);
      if (typesRes.success && typesRes.data && typesRes.data.length > 0) setAdTypes(typesRes.data);
      if (pricingRes.success && pricingRes.data) setPricing(pricingRes.data);
      if (providersRes.success && providersRes.data) setImageProviders(providersRes.data);
      
      // Log any failures for debugging
      if (!platformsRes.success) console.warn('Failed to load platforms');
      if (!stylesRes.success) console.warn('Failed to load visual styles');
      if (!typesRes.success) console.warn('Failed to load ad types');
      if (!pricingRes.success) console.warn('Failed to load pricing');
      if (!providersRes.success) console.warn('Failed to load image providers');
    } catch (error) {
      console.error('Failed to load configuration:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadAdHistory = async () => {
    try {
      const response = await apiService.get('/smart-ads?limit=10');
      if (response.success) {
        setAdHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load ad history:', error);
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setTargetPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const calculateCost = () => {
    // PRICING STRUCTURE (Dec 2025):
    // Base (1 platform, 2 variants): 250 credits
    // Per additional platform: +150 credits
    // Per additional variant (per platform): +75 credits
    // Video per platform: +200 credits
    // UGC per platform: +200 credits
    
    const BASE_COST = pricing?.base || 250;
    const PER_PLATFORM = pricing?.multipliers?.additionalPlatform || 150;
    const PER_VARIANT_PER_PLATFORM = pricing?.multipliers?.additionalVariantPerPlatform || 75;
    const VIDEO_PER_PLATFORM = pricing?.multipliers?.videoPerPlatform || 200;
    const UGC_PER_PLATFORM = pricing?.multipliers?.ugcPerPlatform || 200;
    
    const platformCount = targetPlatforms.length || 1;
    
    // Start with base cost (includes 1 platform, 2 variants)
    let cost = BASE_COST;
    
    // Additional platforms (first included in base)
    if (platformCount > 1) {
      cost += (platformCount - 1) * PER_PLATFORM;
    }
    
    // Additional variants (first 2 included, extras apply to ALL platforms)
    if (variantCount > 2) {
      cost += (variantCount - 2) * platformCount * PER_VARIANT_PER_PLATFORM;
    }
    
    // Video cost per platform
    if (generateVideo) {
      cost += VIDEO_PER_PLATFORM * platformCount;
    }
    
    // UGC cost per platform
    if (generateUGC) {
      cost += UGC_PER_PLATFORM * platformCount;
    }
    
    return cost;
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (targetPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    // If template mode is enabled, use template-based generation
    if (useTemplateMode && selectedTemplate) {
      await handleTemplateGenerate();
      return;
    }

    setGenerating(true);
    setGenerationProgress({ step: 1, message: 'Starting...', percentage: 0 });
    const stopProgress = simulateProgress();
    
    try {
      // Ad generation creates multiple images via DALL-E, needs longer timeout
      const response = await apiService.post('/smart-ads/generate', {
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        productImageUrl: productImageUrl.trim() || undefined,
        targetPlatforms,
        adType,
        visualStyle,
        targetAudience: targetAudience.trim() || undefined,
        brandVoice: brandVoice.trim() || undefined,
        callToAction,
        promotionalDetails: promotionalDetails.trim() || undefined,
        customInstructions: customInstructions.trim() || undefined,
        variantCount,
        generateVideo,
        generateUGC,
        ugcAvatarId: generateUGC ? ugcAvatarId : undefined,
        ugcLookId: generateUGC ? ugcLookId : undefined,
        imageProvider,
        videoProvider: generateVideo ? videoProvider : undefined
      }, {
        timeout: generateVideo ? 900000 : 600000 // 15 minutes for video, 10 minutes for images only
      });

      stopProgress();
      setGenerationProgress({ step: 5, message: 'Complete!', percentage: 100 });
      
      if (response.success) {
        setGeneratedAd(response.data);
        setSelectedPlatform(targetPlatforms[0]);
        const creditsUsed = (response as any).creditsUsed || 0;
        toast.success(`Ad generated successfully! Used ${creditsUsed} credits`);
        loadAdHistory();
      } else {
        throw new Error(response.error || 'Failed to generate ad');
      }
    } catch (error: any) {
      stopProgress();
      console.error('Ad generation error:', error);
      toast.error(error.message || 'Failed to generate ad. Please try again.');
    } finally {
      setGenerating(false);
      setTimeout(() => setGenerationProgress(null), 1000); // Clear progress after 1 second
    }
  };

  // Template-based generation (no LLM for images)
  const handleTemplateGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setGenerating(true);
    setGenerationProgress({ step: 1, message: 'Generating copy...', percentage: 20 });
    
    try {
      // First, generate copy variants using LLM (text only - cheap)
      const copyResponse = await apiService.post('/smart-ads/generate-copy-only', {
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        adType,
        targetAudience: targetAudience.trim() || undefined,
        brandVoice: brandVoice.trim() || undefined,
        callToAction,
        promotionalDetails: promotionalDetails.trim() || undefined,
        variantCount,
        platforms: targetPlatforms
      });

      if (!copyResponse.success || !copyResponse.data?.copyVariants) {
        throw new Error('Failed to generate copy');
      }

      setGenerationProgress({ step: 2, message: 'Applying template...', percentage: 50 });

      // Convert copy variants to template format
      const copyVariants: TemplateCopyVariant[] = copyResponse.data.copyVariants.map((variant: any) => ({
        headline: variant.headline,
        description: variant.primaryText || variant.description,
        cta: callToAction,
        primaryText: variant.primaryText
      }));

      // Generate variations from template (no LLM for images - instant!)
      const templateResponse = await templateAdService.generateVariations(
        selectedTemplate.id,
        copyVariants,
        {
          platform: targetPlatforms[0],
          format: 'feed',
          saveToDatabase: true
        }
      );

      setGenerationProgress({ step: 3, message: 'Finalizing...', percentage: 90 });

      if (templateResponse.success && templateResponse.data) {
        const results = templateResponse.data.filter((r: any) => !r.error);
        
        // Format as Smart Ad Generator expects
        const visualAssets: Record<string, Record<string, any>> = {};
        targetPlatforms.forEach(platform => {
          visualAssets[platform] = {
            feed: results.map((r: any, idx: number) => ({
              url: r.imageUrl,
              format: 'feed',
              variant: idx
            }))
          };
        });

        const generatedAdData: GeneratedAd = {
          adId: `template-${Date.now()}`,
          adType,
          platforms: targetPlatforms,
          copyVariants: copyResponse.data.copyVariants,
          visualAssets,
          adPackages: {},
          metadata: {
            generatedAt: new Date().toISOString(),
            variantCount: results.length,
            visualStyle: 'template-based',
            includesVideo: false,
            includesUGC: false
          }
        };

        setGeneratedAd(generatedAdData);
        setSelectedPlatform(targetPlatforms[0]);
        setGenerationProgress({ step: 4, message: 'Complete!', percentage: 100 });
        toast.success(`Template-based ads generated! 0 credits for images (only copy generation used credits)`);
        loadAdHistory();
      } else {
        throw new Error('Failed to generate template variations');
      }
    } catch (error: any) {
      console.error('Template generation error:', error);
      toast.error(error.message || 'Failed to generate template-based ads');
    } finally {
      setGenerating(false);
      setTimeout(() => setGenerationProgress(null), 1000);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Regenerate images only (keep copy)
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const handleRegenerateImages = async () => {
    if (!generatedAd) return;
    
    setRegeneratingImages(true);
    toast.loading('Regenerating images...', { id: 'regen-images' });
    
    try {
      const response = await apiService.post('/smart-ads/generate', {
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        productImageUrl: productImageUrl.trim() || undefined,
        targetPlatforms,
        adType,
        visualStyle,
        targetAudience: targetAudience.trim() || undefined,
        brandVoice: brandVoice.trim() || undefined,
        callToAction,
        promotionalDetails: promotionalDetails.trim() || undefined,
        customInstructions: customInstructions.trim() || undefined,
        variantCount: 1, // Just regenerate images, use existing copy count
        generateVideo: false,
        generateUGC: false,
        imageProvider
      }, {
        timeout: 600000 // 10 minutes for image regeneration
      });

      toast.dismiss('regen-images');
      
      if (response.success) {
        // Keep existing copy, replace images
        setGeneratedAd(prev => prev ? {
          ...prev,
          visualAssets: response.data.visualAssets
        } : response.data);
        toast.success('Images regenerated!');
      } else {
        throw new Error(response.error || 'Failed to regenerate images');
      }
    } catch (error: any) {
      toast.dismiss('regen-images');
      toast.error(error.message || 'Failed to regenerate images');
    } finally {
      setRegeneratingImages(false);
    }
  };

  // Regenerate copy only (keep images)
  const [regeneratingCopy, setRegeneratingCopy] = useState(false);
  const handleRegenerateCopy = async () => {
    if (!generatedAd) return;
    
    setRegeneratingCopy(true);
    toast.loading('Regenerating ad copy...', { id: 'regen-copy' });
    
    try {
      const response = await apiService.post('/smart-ads/generate-copy-only', {
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        adType,
        targetAudience: targetAudience.trim() || undefined,
        brandVoice: brandVoice.trim() || undefined,
        callToAction,
        promotionalDetails: promotionalDetails.trim() || undefined,
        variantCount,
        platforms: targetPlatforms
      }, {
        timeout: 60000
      });

      toast.dismiss('regen-copy');
      
      if (response.success) {
        // Keep existing images, replace copy
        setGeneratedAd(prev => prev ? {
          ...prev,
          copyVariants: response.data.copyVariants
        } : null);
        toast.success('Ad copy regenerated!');
      } else {
        throw new Error(response.error || 'Failed to regenerate copy');
      }
    } catch (error: any) {
      toast.dismiss('regen-copy');
      toast.error(error.message || 'Failed to regenerate copy');
    } finally {
      setRegeneratingCopy(false);
    }
  };

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulePlatform, setSchedulePlatform] = useState('');
  const [scheduleVariant, setScheduleVariant] = useState(0);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const handleScheduleAd = async (platform: string, variantIndex: number) => {
    setSchedulePlatform(platform);
    setScheduleVariant(variantIndex);
    // Set default to tomorrow at 10am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime('10:00');
    setShowScheduleModal(true);
  };

  const confirmSchedule = async () => {
    if (!generatedAd || !scheduleDate || !scheduleTime) {
      toast.error('Please select date and time');
      return;
    }

    setScheduling(true);
    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      const response = await apiService.post(`/smart-ads/${generatedAd.adId}/schedule`, {
        platform: schedulePlatform,
        variantIndex: scheduleVariant,
        scheduledTime: scheduledDateTime.toISOString(),
        format: 'feed'
      });

      if (response.success) {
        toast.success(`Ad scheduled for ${schedulePlatform} on ${scheduledDateTime.toLocaleString()}`);
        setShowScheduleModal(false);
      } else {
        throw new Error(response.error || 'Failed to schedule ad');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule ad');
    } finally {
      setScheduling(false);
    }
  };

  const handleToggleFavorite = async (adId: string, currentFavorite: boolean) => {
    try {
      await apiService.put(`/smart-ads/${adId}`, { favorite: !currentFavorite });
      loadAdHistory();
      toast.success(currentFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  // View ad details
  const handleViewAd = async (adId: string) => {
    setLoadingAdDetails(true);
    try {
      const response = await apiService.get(`/smart-ads/${adId}`);
      if (response.success) {
        setViewingAd(response.data);
      } else {
        toast.error('Failed to load ad details');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load ad details');
    } finally {
      setLoadingAdDetails(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
      await apiService.delete(`/smart-ads/${adId}`);
      loadAdHistory();
      toast.success('Ad deleted');
    } catch (error) {
      toast.error('Failed to delete ad');
    }
  };

  const handleProductSelect = (product: {
    productId: string;
    productName: string;
    productDescription: string;
    productImageUrl?: string;
    category?: string;
  }) => {
    setSelectedProductId(product.productId);
    setProductName(product.productName);
    setProductDescription(product.productDescription);
    if (product.productImageUrl) {
      setProductImageUrl(product.productImageUrl);
    }
    setShowProductCatalog(false);
  };

  const handleBrandKitSelect = (kit: any) => {
    setBrandKit(kit);
    if (kit.brandVoice) {
      setBrandVoice(kit.brandVoice);
    }
    setShowBrandKit(false);
  };

  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📷',
    twitter: '🐦',
    tiktok: '🎵',
    linkedin: '💼',
    youtube: '📺',
    google: '🔍'
  };

  const adTypeLabels: Record<string, string> = {
    product_showcase: '🛍️ Product Showcase',
    brand_awareness: '🎯 Brand Awareness',
    testimonial: '💬 Testimonial/UGC',
    promotional: '🏷️ Promotional/Sale',
    educational: '📚 Educational',
    storytelling: '📖 Storytelling',
    comparison: '⚖️ Comparison',
    social_proof: '⭐ Social Proof',
    urgency: '⏰ Urgency/FOMO',
    lifestyle: '✨ Lifestyle'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
              <RocketLaunchIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Smart Ad Generator
              </h1>
              <p className="text-gray-400">
                Create AI-powered ads for multiple platforms in seconds
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Product Info */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PhotoIcon className="h-5 w-5 text-purple-400" />
                Product Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Premium Wireless Earbuds"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Describe your product's key features and benefits..."
                    rows={3}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Product Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={productImageUrl}
                    onChange={(e) => setProductImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Platform Selection */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold mb-4">Target Platforms</h2>
              <div className="grid grid-cols-2 gap-2">
                {['facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'youtube', 'google'].map((platform) => (
                  <button
                    key={platform}
                    onClick={() => handlePlatformToggle(platform)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      targetPlatforms.includes(platform)
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>{platformIcons[platform]}</span>
                    <span className="capitalize">{platform}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur rounded-2xl p-4 border border-purple-500/30">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  <span className="font-semibold text-white">Quick Templates</span>
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              </button>
              
              {showTemplates && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {adTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl text-left transition-colors border border-slate-700/50 hover:border-purple-500/50"
                    >
                      <span className="font-medium text-white text-sm">{template.name}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{template.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ad Type & Style */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold mb-4">Ad Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Ad Type
                  </label>
                  <select
                    value={adType}
                    onChange={(e) => setAdType(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {adTypes.map((type) => (
                      <option key={type} value={type}>
                        {adTypeLabels[type] || type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Visual Style
                  </label>
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {visualStyles.map((style) => (
                      <option key={style.name} value={style.name}>
                        {style.name.charAt(0).toUpperCase() + style.name.slice(1)}
                      </option>
                    ))}
                  </select>
                  {visualStyles.find(s => s.name === visualStyle)?.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {visualStyles.find(s => s.name === visualStyle)?.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Call to Action
                  </label>
                  <select
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Shop Now">Shop Now</option>
                    <option value="Learn More">Learn More</option>
                    <option value="Sign Up">Sign Up</option>
                    <option value="Get Started">Get Started</option>
                    <option value="Book Now">Book Now</option>
                    <option value="Contact Us">Contact Us</option>
                    <option value="Download">Download</option>
                    <option value="Try Free">Try Free</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Number of Variants
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setVariantCount(num)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          variantCount === num
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-semibold">Advanced Options</span>
                {showAdvanced ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {showAdvanced && (
                <div className="p-6 pt-0 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Target Audience
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g., Tech-savvy millennials, ages 25-40"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Brand Voice
                    </label>
                    <input
                      type="text"
                      value={brandVoice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                      placeholder="e.g., Professional, friendly, innovative"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Promotional Details
                    </label>
                    <input
                      type="text"
                      value={promotionalDetails}
                      onChange={(e) => setPromotionalDetails(e.target.value)}
                      placeholder="e.g., 20% off, Free shipping, Limited time"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Custom Instructions
                    </label>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="Any specific requirements or guidelines..."
                      rows={2}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Image Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      🖼️ Image Generation Provider
                    </label>
                    <div className="space-y-2">
                      {imageProviders.map(provider => (
                        <label 
                          key={provider.id}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                            imageProvider === provider.id 
                              ? 'bg-purple-600/20 border-purple-500' 
                              : provider.available 
                                ? 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                                : 'bg-slate-700/20 border-slate-700 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="imageProvider"
                              value={provider.id}
                              checked={imageProvider === provider.id}
                              onChange={(e) => provider.available && setImageProvider(e.target.value)}
                              disabled={!provider.available}
                              className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-500 focus:ring-purple-500"
                            />
                            <div>
                              <span className="font-medium text-white">{provider.name}</span>
                              <p className="text-xs text-gray-400">{provider.description}</p>
                            </div>
                          </div>
                          {!provider.available && (
                            <span className="text-xs bg-slate-600 text-gray-400 px-2 py-0.5 rounded">Not configured</span>
                          )}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Different providers have different strengths. Try them out to see which works best for your brand!
                    </p>
                  </div>

                  {/* Template-Based Generation (No LLM for Images) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ⚡ Template-Based Generation (Save 70-90% on Costs!)
                    </label>
                    <div className="mb-2 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                      <p className="text-xs text-green-400 mb-2">
                        Use templates instead of LLM image generation. Generate 100 variations in 0.5 seconds for $0!
                      </p>
                      {selectedTemplate ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-white">{selectedTemplate.name}</span>
                            <p className="text-xs text-gray-400">{selectedTemplate.category || 'Uncategorized'}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTemplate(null);
                              setUseTemplateMode(false);
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                        >
                          {showTemplateSelector ? 'Hide Templates' : 'Browse Templates'}
                        </button>
                      )}
                    </div>
                    {showTemplateSelector && !selectedTemplate && (
                      <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700 max-h-96 overflow-y-auto">
                        {loadingTemplates ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-sm text-gray-400 mt-2">Loading templates...</p>
                          </div>
                        ) : availableTemplates.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-sm text-gray-400 mb-4">No templates available</p>
                            <button
                              onClick={() => navigate('/templates')}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                            >
                              Create Template
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {availableTemplates.slice(0, 6).map((template) => (
                              <div
                                key={template.id}
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setUseTemplateMode(true);
                                  setShowTemplateSelector(false);
                                  toast.success(`Template "${template.name}" selected!`);
                                }}
                                className="cursor-pointer p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-600 transition"
                              >
                                <div className="w-full h-20 bg-gray-200 rounded mb-2 overflow-hidden">
                                  {template.background_image_url ? (
                                    <img
                                      src={template.background_image_url}
                                      alt={template.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-white truncate">{template.name}</p>
                                <p className="text-xs text-gray-400">{template.times_used} uses</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {availableTemplates.length > 6 && (
                          <button
                            onClick={() => navigate('/templates')}
                            className="w-full mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                          >
                            View All Templates ({availableTemplates.length})
                          </button>
                        )}
                      </div>
                    )}
                    {selectedTemplate && (
                      <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded-lg">
                        <p className="text-xs text-green-400">
                          ✓ Template mode enabled - Images will be generated from template (0 credits) instead of LLM
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Canva Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      🎨 Canva Templates & Designs
                    </label>
                    <button
                      onClick={() => setShowCanvaTemplates(!showCanvaTemplates)}
                      className="w-full px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg text-white font-medium transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <PaintBrushIcon className="h-5 w-5" />
                        {selectedCanvaImageUrl ? 'Canva Design Selected' : 'Browse Canva Templates'}
                      </span>
                      {showCanvaTemplates ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {showCanvaTemplates && (
                      <div className="mt-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <CanvaQuickImport
                          onImport={async (url, name, type) => {
                            try {
                              // Import to media library first
                              await mediaService.importFromUrl(url, {
                                name,
                                description: `Imported from Canva for ad generation`,
                                tags: ['canva', 'ad-template']
                              });
                              // Set as product image
                              setProductImageUrl(url);
                              setSelectedCanvaImageUrl(url);
                              setShowCanvaTemplates(false);
                              toast.success(`Canva design "${name}" imported and selected for ad!`);
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to import from Canva');
                            }
                          }}
                          onClose={() => setShowCanvaTemplates(false)}
                          showStockSearch={false}
                        />
                      </div>
                    )}
                    {selectedCanvaImageUrl && (
                      <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-green-400">✓ Canva design selected</span>
                        <button
                          onClick={() => {
                            setSelectedCanvaImageUrl('');
                            setProductImageUrl('');
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Video Provider Selection */}
                  {generateVideo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        🎬 Video Generation Provider
                      </label>
                      <div className="space-y-2">
                        {videoProviders.map(provider => (
                          <label 
                            key={provider.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                              videoProvider === provider.id 
                                ? 'bg-blue-600/20 border-blue-500' 
                                : provider.available 
                                  ? 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                                  : 'bg-slate-700/20 border-slate-700 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="videoProvider"
                                value={provider.id}
                                checked={videoProvider === provider.id}
                                onChange={(e) => provider.available && setVideoProvider(e.target.value)}
                                disabled={!provider.available}
                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 focus:ring-blue-500"
                              />
                              <div>
                                <span className="font-medium text-white">{provider.name}</span>
                                <p className="text-xs text-gray-400">{provider.description} (max {provider.maxDuration}s)</p>
                              </div>
                            </div>
                            {!provider.available && (
                              <span className="text-xs bg-slate-600 text-gray-400 px-2 py-0.5 rounded">Not configured</span>
                            )}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Choose based on video length needs and quality preferences.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Additional Content Options */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold mb-4">Additional Content</h2>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <VideoCameraIcon className="h-5 w-5 text-blue-400" />
                    <div>
                      <span className="font-medium">Generate Video Ad</span>
                      <p className="text-xs text-gray-500">AI-generated video content</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generateVideo}
                    onChange={(e) => setGenerateVideo(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserGroupIcon className="h-5 w-5 text-green-400" />
                    <div>
                      <span className="font-medium">Generate UGC Content</span>
                      <p className="text-xs text-gray-500">AI avatar testimonial video</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generateUGC}
                    onChange={(e) => setGenerateUGC(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>

            {/* Product Catalog Toggle */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setShowProductCatalog(!showProductCatalog)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBagIcon className="h-5 w-5 text-purple-400" />
                  <span className="font-semibold">Import from Product Catalog</span>
                </div>
                {showProductCatalog ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {showProductCatalog && (
                <div className="p-4 pt-0">
                  <ProductCatalogSelector
                    onProductSelect={handleProductSelect}
                    selectedProductId={selectedProductId}
                  />
                </div>
              )}
            </div>

            {/* Brand Kit Toggle */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setShowBrandKit(!showBrandKit)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SwatchIcon className="h-5 w-5 text-pink-400" />
                  <span className="font-semibold">Brand Kit</span>
                  {brandKit && (
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">Applied</span>
                  )}
                </div>
                {showBrandKit ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {showBrandKit && (
                <div className="p-4 pt-0">
                  <BrandKitPanel onBrandSelect={handleBrandKitSelect} />
                </div>
              )}
            </div>

            {/* User Images Section */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setShowUserImages(!showUserImages)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-semibold flex items-center gap-2">
                  <PhotoIcon className="h-5 w-5 text-purple-400" /> Your Images
                </span>
                {showUserImages ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {showUserImages && (
                <div className="p-4 pt-0">
                  <UserImageUploader
                    onImageSelect={(url, id) => {
                      setProductImageUrl(url);
                      setSelectedUserImageUrl(url);
                      toast.success('Image selected for ad generation!');
                    }}
                    selectedImageId={selectedUserImageUrl ? undefined : undefined}
                  />
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Estimated Cost</span>
                <span className="text-2xl font-bold">{calculateCost()} credits</span>
              </div>
              
              {/* Cost breakdown */}
              <div className="text-xs text-white/70 mb-4 space-y-1">
                <div className="flex justify-between">
                  <span>Base (1 platform, 2 variants)</span>
                  <span>{pricing?.base || 250}</span>
                </div>
                {targetPlatforms.length > 1 && (
                  <div className="flex justify-between">
                    <span>+{targetPlatforms.length - 1} platform{targetPlatforms.length > 2 ? 's' : ''}</span>
                    <span>+{(targetPlatforms.length - 1) * (pricing?.multipliers?.additionalPlatform || 150)}</span>
                  </div>
                )}
                {variantCount > 2 && (
                  <div className="flex justify-between">
                    <span>+{variantCount - 2} variant{variantCount > 3 ? 's' : ''} × {targetPlatforms.length} platform{targetPlatforms.length > 1 ? 's' : ''}</span>
                    <span>+{(variantCount - 2) * targetPlatforms.length * (pricing?.multipliers?.additionalVariantPerPlatform || 75)}</span>
                  </div>
                )}
                {generateVideo && (
                  <div className="flex justify-between">
                    <span>Video × {targetPlatforms.length}</span>
                    <span>+{(pricing?.multipliers?.videoPerPlatform || 200) * targetPlatforms.length}</span>
                  </div>
                )}
                {generateUGC && (
                  <div className="flex justify-between">
                    <span>UGC × {targetPlatforms.length}</span>
                    <span>+{(pricing?.multipliers?.ugcPerPlatform || 200) * targetPlatforms.length}</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={generating || !productName.trim() || targetPlatforms.length === 0}
                className="w-full py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {generating ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Generate Smart Ad
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generated Ad Preview */}
            {generatedAd ? (
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CheckCircleIcon className="h-6 w-6 text-green-400" />
                    Ad Generated Successfully
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{generatedAd.metadata.variantCount} variants</span>
                    <span>•</span>
                    <span>{generatedAd.platforms.length} platforms</span>
                  </div>
                </div>

                {/* Regenerate Buttons */}
                <div className="flex flex-wrap gap-2 mb-6 p-3 bg-slate-700/30 rounded-xl">
                  <button
                    onClick={handleRegenerateImages}
                    disabled={regeneratingImages || regeneratingCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg text-sm text-blue-300 font-medium transition-colors disabled:opacity-50"
                  >
                    {regeneratingImages ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <PhotoIcon className="h-4 w-4" />
                    )}
                    Regenerate Images
                  </button>
                  <button
                    onClick={handleRegenerateCopy}
                    disabled={regeneratingImages || regeneratingCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 rounded-lg text-sm text-green-300 font-medium transition-colors disabled:opacity-50"
                  >
                    {regeneratingCopy ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                    Regenerate Copy
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || regeneratingImages || regeneratingCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg text-sm text-purple-300 font-medium transition-colors disabled:opacity-50"
                  >
                    {generating ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <SparklesIcon className="h-4 w-4" />
                    )}
                    Generate All New
                  </button>
                  <button
                    onClick={() => setShowTranslateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/50 rounded-lg text-sm text-yellow-300 font-medium transition-colors"
                  >
                    🌐 Translate
                  </button>
                </div>

                {/* Platform Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {generatedAd.platforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedPlatform === platform
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
                      }`}
                    >
                      {platformIcons[platform]} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Copy Variants */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Ad Copy Variants</h3>
                  <div className="space-y-3">
                    {generatedAd.copyVariants.map((variant, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedVariant(index)}
                        className={`p-4 rounded-xl cursor-pointer transition-all ${
                          selectedVariant === index
                            ? 'bg-purple-600/20 border-2 border-purple-500'
                            : 'bg-slate-700/30 border-2 border-transparent hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs px-2 py-1 bg-slate-600 rounded-full">
                            Variant {index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(`${variant.headline}\n\n${variant.primaryText}`);
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScheduleAd(selectedPlatform, index);
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-lg mb-2">{variant.headline}</h4>
                        <p className="text-gray-300 text-sm mb-2">{variant.primaryText}</p>
                        {variant.hashtags && variant.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {variant.hashtags.map((tag, i) => (
                              <span key={i} className="text-xs text-purple-400">#{tag}</span>
                            ))}
                          </div>
                        )}
                        {variant.approach && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            Approach: {variant.approach}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Assets Preview */}
                {generatedAd.visualAssets[selectedPlatform] && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Generated Visuals</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(generatedAd.visualAssets[selectedPlatform]).map(([format, asset]: [string, any]) => (
                        <div key={format} className="bg-slate-700/30 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium capitalize">{format}</span>
                            <span className="text-xs text-gray-500">{asset.aspectRatio}</span>
                          </div>
                          {asset.imageUrl && !asset.error ? (
                            <>
                              <img
                                src={asset.imageUrl}
                                alt={`${format} ad visual`}
                                className="w-full rounded-lg"
                              />
                              <button
                                onClick={() => {
                                  setSelectedImageForOverlay(asset.imageUrl);
                                  setShowTextOverlay(true);
                                }}
                                className="w-full mt-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg text-xs text-purple-300 font-medium transition-colors flex items-center justify-center gap-1"
                              >
                                <PaintBrushIcon className="h-3.5 w-3.5" />
                                Add Text Overlay
                              </button>
                            </>
                          ) : asset.fallbackUrl ? (
                            <img
                              src={asset.fallbackUrl}
                              alt={`${format} fallback`}
                              className="w-full rounded-lg opacity-70"
                            />
                          ) : (
                            <div className="aspect-square bg-slate-600 rounded-lg flex items-center justify-center">
                              <PhotoIcon className="h-8 w-8 text-gray-500" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Assets */}
                {generatedAd.videoAssets && Object.keys(generatedAd.videoAssets).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Video Content</h3>
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      {generatedAd.videoAssets[selectedPlatform] ? (
                        <div>
                          {Object.entries(generatedAd.videoAssets[selectedPlatform]).map(([format, asset]: [string, any]) => (
                            <div key={format}>
                              {asset.videoUrl ? (
                                <video
                                  src={asset.videoUrl}
                                  controls
                                  className="w-full rounded-lg"
                                />
                              ) : asset.error ? (
                                <p className="text-red-400 text-sm">{asset.error}</p>
                              ) : (
                                <p className="text-gray-500">Processing video...</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No video generated for this platform</p>
                      )}
                    </div>
                  </div>
                )}

                {/* UGC Content */}
                {generatedAd.ugcAssets && Object.keys(generatedAd.ugcAssets).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">UGC Content</h3>
                    <div className="bg-slate-700/30 rounded-xl p-4">
                      {generatedAd.ugcAssets[selectedPlatform] ? (
                        <div>
                          {generatedAd.ugcAssets[selectedPlatform].videoUrl ? (
                            <video
                              src={generatedAd.ugcAssets[selectedPlatform].videoUrl}
                              controls
                              className="w-full rounded-lg mb-3"
                            />
                          ) : generatedAd.ugcAssets[selectedPlatform].status === 'processing' || generatedAd.ugcAssets[selectedPlatform].videoId ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-yellow-400">
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                <span>Video is being processed...</span>
                              </div>
                              {generatedAd.ugcAssets[selectedPlatform].videoId && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await apiService.post(`/smart-ads/${generatedAd.adId}/check-ugc-status`, { platform: selectedPlatform });
                                      if (response.success) {
                                        // Reload the ad
                                        const adResponse = await apiService.get(`/smart-ads/${generatedAd.adId}`);
                                        if (adResponse.success) {
                                          // Transform database response (id) to match GeneratedAd interface (adId)
                                          const adData = adResponse.data;
                                          setGeneratedAd({
                                            ...adData,
                                            adId: adData.id || adData.adId
                                          });
                                          toast.success('UGC status updated!');
                                        }
                                      }
                                    } catch (error: any) {
                                      toast.error(error.message || 'Failed to check status');
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg text-purple-300 transition-colors flex items-center gap-1"
                                >
                                  <ArrowPathIcon className="h-3 w-3" />
                                  Check Status
                                </button>
                              )}
                            </div>
                          ) : generatedAd.ugcAssets[selectedPlatform].status === 'failed' ? (
                            <div className="p-3 bg-red-600/20 rounded-lg text-sm text-red-300">
                              ❌ Video generation failed: {generatedAd.ugcAssets[selectedPlatform].error || 'Unknown error'}
                            </div>
                          ) : null}
                          {generatedAd.ugcAssets[selectedPlatform].script && (
                            <div className="bg-slate-600/30 rounded-lg p-3">
                              <p className="text-sm font-medium mb-1">UGC Script:</p>
                              <p className="text-gray-300 text-sm">
                                {generatedAd.ugcAssets[selectedPlatform].script.script}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">No UGC generated for this platform</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Platform Preview Toggle */}
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <DevicePhoneMobileIcon className="h-5 w-5 text-blue-400" />
                      <span className="font-medium">Platform Preview Mockup</span>
                    </div>
                    {showPreview ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {showPreview && generatedAd.copyVariants[selectedVariant] && (
                    <div className="mt-4 flex justify-center">
                      <AdPreviewMockup
                        platform={selectedPlatform}
                        format="feed"
                        headline={generatedAd.copyVariants[selectedVariant].headline}
                        primaryText={generatedAd.copyVariants[selectedVariant].primaryText}
                        description={generatedAd.copyVariants[selectedVariant].description}
                        imageUrl={generatedAd.visualAssets[selectedPlatform]?.feed?.imageUrl}
                        callToAction={callToAction}
                        hashtags={generatedAd.copyVariants[selectedVariant].hashtags}
                        brandName={brandKit?.brandName || 'Your Brand'}
                        brandLogo={brandKit?.logoUrl}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-12 border border-slate-700/50 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <SparklesIcon className="h-10 w-10 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Create</h3>
                  <p className="text-gray-400 mb-6">
                    Fill in your product details and click "Generate Smart Ad" to create 
                    AI-powered ad creatives for multiple platforms.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {Object.entries(platformIcons).map(([platform, icon]) => (
                      <span
                        key={platform}
                        className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-gray-400"
                      >
                        {icon} {platform}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Export Panel - shown when ad is generated */}
            {generatedAd && (
              <AdExportPanel
                adId={generatedAd.adId}
                copyVariants={generatedAd.copyVariants}
                visualAssets={generatedAd.visualAssets}
                videoAssets={generatedAd.videoAssets}
                platforms={generatedAd.platforms}
                callToAction={callToAction}
                productName={productName}
              />
            )}

            {/* Ad History */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
              >
                <span className="font-semibold">Recent Ads ({adHistory.length})</span>
                {showHistory ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {showHistory && (
                <div className="p-6 pt-0">
                  {adHistory.length > 0 ? (
                    <div className="space-y-3">
                      {adHistory.map((ad) => (
                        <div
                          key={ad.id}
                          className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {ad.copy_variants[0]?.headline || 'Untitled Ad'}
                              </span>
                              {ad.favorite && (
                                <HeartSolidIcon className="h-4 w-4 text-pink-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span>{adTypeLabels[ad.ad_type] || ad.ad_type}</span>
                              <span>•</span>
                              <span>{ad.platforms.map(p => platformIcons[p]).join(' ')}</span>
                              <span>•</span>
                              <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewAd(ad.id)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                              title="View Ad"
                            >
                              <EyeIcon className="h-5 w-5 text-gray-400 hover:text-white" />
                            </button>
                            <button
                              onClick={() => handleToggleFavorite(ad.id, ad.favorite)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              {ad.favorite ? (
                                <HeartSolidIcon className="h-5 w-5 text-pink-500" />
                              ) : (
                                <HeartIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => {/* View ad */}}
                              className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <EyeIcon className="h-5 w-5 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteAd(ad.id)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <TrashIcon className="h-5 w-5 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No ads generated yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Text Overlay Editor Modal */}
      {showTextOverlay && selectedImageForOverlay && generatedAd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <TextOverlayEditor
              imageUrl={selectedImageForOverlay}
              headline={generatedAd.copyVariants[selectedVariant]?.headline || ''}
              description={generatedAd.copyVariants[selectedVariant]?.primaryText?.substring(0, 100) || ''}
              callToAction={callToAction}
              aspectRatio={
                selectedImageForOverlay.includes('story') ? '9:16' :
                selectedImageForOverlay.includes('feed') ? '1:1' : '1:1'
              }
              onClose={() => {
                setShowTextOverlay(false);
                setSelectedImageForOverlay(null);
              }}
              onSave={(compositeUrl) => {
                toast.success('Image saved with text overlay!');
                // Could save to history or download
              }}
            />
          </div>
        </div>
      )}

      {/* Generation Progress Modal */}
      {generating && generationProgress && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 w-full max-w-md border border-purple-500/30 shadow-2xl shadow-purple-500/20">
            {/* Animated Logo/Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Outer ring animation */}
                <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-purple-500/30 animate-ping" />
                <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" style={{ animationDuration: '1.5s' }} />
                {/* Inner circle with icon */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
                </div>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-4">
              {progressSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    (index + 1) < generationProgress.step 
                      ? 'bg-green-500' 
                      : (index + 1) === generationProgress.step 
                        ? 'bg-purple-500 animate-pulse scale-125' 
                        : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Progress message */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">
                {generationProgress.message}
              </h3>
              {generationProgress.subMessage && (
                <p className="text-sm text-gray-400">
                  {generationProgress.subMessage}
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${generationProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>Progress</span>
                <span>{Math.round(generationProgress.percentage)}%</span>
              </div>
            </div>

            {/* Estimated time */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                ⏱️ Estimated time: {
                  (() => {
                    // Calculate estimated time based on selections
                    const platforms = targetPlatforms.length;
                    const baseTime = 2; // 2 minutes for copy
                    const imageTime = platforms * 0.5; // ~30 sec per platform image
                    const videoTime = generateVideo ? platforms * 2 : 0; // ~2 min per video
                    const ugcTime = generateUGC ? platforms * 3 : 0; // ~3 min per UGC (async)
                    const total = baseTime + imageTime + videoTime + ugcTime;
                    
                    if (total <= 3) return '2-3 minutes';
                    if (total <= 5) return '3-5 minutes';
                    if (total <= 10) return '5-10 minutes';
                    if (total <= 15) return '10-15 minutes';
                    return '15-20 minutes';
                  })()
                }
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Creating {targetPlatforms.length} platform{targetPlatforms.length > 1 ? 's' : ''} × {variantCount} variant{variantCount > 1 ? 's' : ''}
                {generateVideo && ' + videos'}
                {generateUGC && ' + UGC content'}
              </p>
            </div>

            {/* Fun facts while waiting */}
            <div className="mt-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-xs text-center text-purple-300">
                {generateVideo ? (
                  '🎬 Video generation requires AI to create each frame. This takes time but produces amazing results!'
                ) : (
                  '💡 Did you know? AI-generated ads can increase click-through rates by up to 30%!'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Translation Modal */}
      {showTranslateModal && generatedAd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                🌐 Translate Ad Copy
              </h3>
              <button
                onClick={() => { setShowTranslateModal(false); setTranslatedCopy([]); }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Language</label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setTargetLanguage(lang.code)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        targetLanguage === lang.code
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {translatedCopy.length === 0 && (
                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {translating ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    '🔄 Translate All Variants'
                  )}
                </button>
              )}

              {translatedCopy.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Translation Preview</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {translatedCopy.map((variant, index) => (
                      <div key={index} className="p-3 bg-slate-700/50 rounded-lg">
                        <span className="text-xs text-purple-400">Variant {index + 1}</span>
                        <h5 className="font-bold text-white text-sm mt-1">{variant.headline}</h5>
                        <p className="text-xs text-gray-300 mt-1 line-clamp-2">{variant.primaryText}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTranslatedCopy([])}
                      className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
                    >
                      Re-translate
                    </button>
                    <button
                      onClick={applyTranslation}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Ad Details Modal */}
      {viewingAd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {viewingAd.copy_variants?.[0]?.headline || 'Ad Details'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Created {new Date(viewingAd.created_at).toLocaleString()} • {viewingAd.platforms?.join(', ')}
                </p>
              </div>
              <button
                onClick={() => setViewingAd(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Copy Variants */}
                <div>
                  <h4 className="font-semibold text-white mb-3">📝 Ad Copy Variants</h4>
                  <div className="space-y-3">
                    {viewingAd.copy_variants?.map((variant: any, idx: number) => (
                      <div key={idx} className="p-4 bg-slate-700/50 rounded-xl">
                        <span className="text-xs text-purple-400">Variant {idx + 1}</span>
                        <h5 className="font-bold text-white mt-1">{variant.headline}</h5>
                        <p className="text-sm text-gray-300 mt-2">{variant.primaryText}</p>
                        {variant.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {variant.hashtags.map((tag: string, i: number) => (
                              <span key={i} className="text-xs text-purple-400">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Assets */}
                <div>
                  <h4 className="font-semibold text-white mb-3">🖼️ Visual Assets</h4>
                  {viewingAd.visual_assets ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(viewingAd.visual_assets).map(([platform, formats]: [string, any]) => (
                        Object.entries(formats).map(([format, asset]: [string, any]) => (
                          asset.imageUrl && (
                            <div key={`${platform}-${format}`} className="relative group">
                              <img
                                src={asset.imageUrl}
                                alt={`${platform} ${format}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-white p-2 rounded-b-lg">
                                {platform} - {format}
                              </div>
                            </div>
                          )
                        ))
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No visual assets</p>
                  )}
                </div>

                {/* Video Assets */}
                {viewingAd.video_assets && Object.keys(viewingAd.video_assets).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white mb-3">🎬 Video Assets</h4>
                    <div className="space-y-3">
                      {Object.entries(viewingAd.video_assets).map(([platform, formats]: [string, any]) => (
                        Object.entries(formats).map(([format, asset]: [string, any]) => (
                          asset.videoUrl && (
                            <div key={`${platform}-${format}`} className="bg-slate-700/50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 mb-2">{platform} - {format}</p>
                              <video
                                src={asset.videoUrl}
                                controls
                                className="w-full rounded-lg"
                              />
                            </div>
                          )
                        ))
                      ))}
                    </div>
                  </div>
                )}

                {/* UGC Assets */}
                {viewingAd.ugc_assets && Object.keys(viewingAd.ugc_assets).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white mb-3">👤 UGC Content</h4>
                    <div className="space-y-3">
                      {Object.entries(viewingAd.ugc_assets).map(([platform, asset]: [string, any]) => (
                        <div key={platform} className="bg-slate-700/50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-400">{platform}</p>
                            {asset.videoId && !asset.videoUrl && asset.status !== 'failed' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await apiService.post(`/smart-ads/${viewingAd.id}/check-ugc-status`, { platform });
                                    if (response.success) {
                                      // Reload ad details
                                      await handleViewAd(viewingAd.id);
                                      toast.success('UGC status updated!');
                                    }
                                  } catch (error: any) {
                                    toast.error(error.message || 'Failed to check status');
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg text-purple-300 transition-colors flex items-center gap-1"
                              >
                                <ArrowPathIcon className="h-3 w-3" />
                                Check Status
                              </button>
                            )}
                          </div>
                          {asset.videoUrl ? (
                            <video src={asset.videoUrl} controls className="w-full rounded-lg" />
                          ) : asset.videoId ? (
                            <div className="p-3 bg-yellow-600/20 rounded-lg text-sm text-yellow-300 flex items-center gap-2">
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              <span>⏳ Video processing (ID: {asset.videoId.substring(0, 8)}...)</span>
                            </div>
                          ) : asset.status === 'failed' ? (
                            <div className="p-3 bg-red-600/20 rounded-lg text-sm text-red-300">
                              ❌ Video generation failed: {asset.error || 'Unknown error'}
                            </div>
                          ) : null}
                          {asset.script && (
                            <div className="mt-2 p-2 bg-slate-800 rounded text-xs text-gray-300">
                              <strong>Script:</strong> {asset.script.script?.substring(0, 200)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-700 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      toast.loading('Preparing download...', { id: 'export' });
                      
                      // @ts-ignore - jszip types may not be available in build environment
                      const JSZip = (await import('jszip')).default;
                      const zip = new JSZip();
                      
                      // Helper to download image
                      const downloadImage = async (url: string): Promise<Blob | null> => {
                        try {
                          const isLocalUrl = url.startsWith('/uploads/') || url.includes('/uploads/');
                          const fullUrl = isLocalUrl ? `${window.location.origin}${url}` : url;
                          const response = await fetch(fullUrl);
                          if (!response.ok) throw new Error('Failed to fetch image');
                          return await response.blob();
                        } catch (error) {
                          console.error('Error downloading image:', error);
                          return null;
                        }
                      };
                      
                      // Add copy variants
                      const copyFolder = zip.folder('copy');
                      (viewingAd.copy_variants || []).forEach((variant: any, index: number) => {
                        const copyContent = `# Ad Copy Variant ${index + 1}

## Headline
${variant.headline}

## Primary Text
${variant.primaryText}

${variant.description ? `## Description\n${variant.description}\n` : ''}
## Hashtags
${variant.hashtags?.map((h: string) => `#${h}`).join(' ') || 'None'}

## Call to Action
${viewingAd.generation_options?.callToAction || 'Shop Now'}

---
Generated by Iqonga Smart Ad Generator
`;
                        copyFolder?.file(`variant_${index + 1}.md`, copyContent);
                      });
                      
                      // Add images
                      const platforms = viewingAd.platforms || [];
                      for (const platform of platforms) {
                        const platformFolder = zip.folder(platform);
                        const imagesFolder = platformFolder?.folder('images');
                        
                        if (viewingAd.visual_assets?.[platform]) {
                          for (const [format, asset] of Object.entries(viewingAd.visual_assets[platform]) as [string, any][]) {
                            if (asset.imageUrl) {
                              const imageBlob = await downloadImage(asset.imageUrl);
                              if (imageBlob) {
                                const extension = asset.imageUrl.includes('.png') ? 'png' : 'jpg';
                                imagesFolder?.file(`${format}_${asset.aspectRatio?.replace(':', 'x') || '1x1'}.${extension}`, imageBlob);
                              }
                            }
                          }
                        }
                      }
                      
                      // Generate and download
                      const content = await zip.generateAsync({ type: 'blob' });
                      const url = URL.createObjectURL(content);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `smart-ad-${viewingAd.id.slice(0, 8)}-${(viewingAd.copy_variants?.[0]?.headline || 'ad').toLowerCase().replace(/\s+/g, '-')}.zip`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      
                      toast.success('Ad downloaded!', { id: 'export' });
                    } catch (error: any) {
                      console.error('Export error:', error);
                      toast.error('Failed to export ad. Please try again.', { id: 'export' });
                    }
                  }}
                  className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 rounded-lg text-green-300 font-medium transition-colors flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download ZIP
                </button>
                <button
                  onClick={() => {
                    // Re-use this ad's settings
                    if (viewingAd.copy_variants?.[0]) {
                      setProductName(viewingAd.copy_variants[0].headline || '');
                    }
                    if (viewingAd.platforms) setTargetPlatforms(viewingAd.platforms);
                    if (viewingAd.ad_type) setAdType(viewingAd.ad_type);
                    if (viewingAd.visual_style) setVisualStyle(viewingAd.visual_style);
                    setViewingAd(null);
                    toast.success('Ad settings loaded!');
                  }}
                  className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg text-purple-300 font-medium transition-colors"
                >
                  Use These Settings
                </button>
              </div>
              <button
                onClick={() => setViewingAd(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && generatedAd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-purple-400" />
                Schedule Ad
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-700/50 rounded-lg">
                  <span className="text-lg">{platformIcons[schedulePlatform]}</span>
                  <span className="text-white font-medium capitalize">{schedulePlatform}</span>
                </div>
              </div>

              {/* Copy Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ad Copy (Variant {scheduleVariant + 1})</label>
                <div className="px-4 py-3 bg-slate-700/50 rounded-lg text-sm text-gray-300 max-h-24 overflow-y-auto">
                  <p className="font-medium">{generatedAd.copyVariants[scheduleVariant]?.headline}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {generatedAd.copyVariants[scheduleVariant]?.primaryText?.substring(0, 80)}...
                  </p>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Quick Time Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quick Select</label>
                <div className="flex flex-wrap gap-2">
                  {['09:00', '12:00', '15:00', '18:00', '21:00'].map(time => (
                    <button
                      key={time}
                      onClick={() => setScheduleTime(time)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        scheduleTime === time 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSchedule}
                disabled={scheduling || !scheduleDate || !scheduleTime}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {scheduling ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4" />
                    Schedule Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAdGenerator;

