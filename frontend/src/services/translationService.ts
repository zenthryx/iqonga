import { apiService } from './api';

export interface TranslationCache {
  [key: string]: {
    [language: string]: string;
  };
}

export type SupportedLanguage = 
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'zh' // Mandarin Chinese
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ar' // Arabic
  | 'pt' // Portuguese
  | 'it' // Italian
  | 'ru' // Russian
  | 'hi' // Hindi
  | 'nl' // Dutch
  | 'pl' // Polish
  | 'tr' // Turkish
  | 'rw' // Kinyarwanda
  | 'sw'; // Swahili

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' }
];

class TranslationService {
  private cache: TranslationCache = {};
  private currentLanguage: SupportedLanguage = 'en';
  private pendingTranslations: Map<string, Promise<string>> = new Map();

  /**
   * Set the current language
   */
  setLanguage(language: SupportedLanguage) {
    this.currentLanguage = language;
    localStorage.setItem('preferred_language', language);
  }

  /**
   * Get the current language
   */
  getLanguage(): SupportedLanguage {
    const saved = localStorage.getItem('preferred_language') as SupportedLanguage;
    return saved && SUPPORTED_LANGUAGES.find(l => l.code === saved) ? saved : 'en';
  }

  /**
   * Translate text using AI
   * @param text - Text to translate
   * @param targetLanguage - Target language (defaults to current language)
   * @param context - Optional context for better translation
   */
  async translate(
    text: string, 
    targetLanguage?: SupportedLanguage,
    context?: string
  ): Promise<string> {
    if (!text || !text.trim()) return text;

    const language = targetLanguage || this.currentLanguage;
    
    // If English, return as-is
    if (language === 'en') return text;

    // Check cache first
    const cacheKey = this.getCacheKey(text, language);
    if (this.cache[text]?.[language]) {
      return this.cache[text][language];
    }

    // Check if translation is already pending
    if (this.pendingTranslations.has(cacheKey)) {
      return this.pendingTranslations.get(cacheKey)!;
    }

    // Create translation promise
    const translationPromise = this.fetchTranslation(text, language, context);
    this.pendingTranslations.set(cacheKey, translationPromise);

    try {
      const translated = await translationPromise;
      
      // Cache the result
      if (!this.cache[text]) {
        this.cache[text] = {};
      }
      this.cache[text][language] = translated;

      return translated;
    } finally {
      this.pendingTranslations.delete(cacheKey);
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    targetLanguage?: SupportedLanguage,
    context?: string
  ): Promise<string[]> {
    const language = targetLanguage || this.currentLanguage;
    
    if (language === 'en') return texts;

    try {
      const response = await apiService.post('/translation/batch', {
        texts,
        target_language: language,
        source_language: 'en',
        context
      });

      if (response.success && response.data?.translations) {
        // Cache results
        texts.forEach((text, index) => {
          if (!this.cache[text]) {
            this.cache[text] = {};
          }
          this.cache[text][language] = response.data.translations[index];
        });

        return response.data.translations;
      }

      // If batch failed but not due to rate limiting, return original texts
      console.warn('Batch translation failed, returning original texts');
      return texts;
    } catch (error: any) {
      // Don't fall back to individual requests if we hit rate limits - that would make it worse!
      if (error.response?.status === 429) {
        console.warn('Translation rate limit reached, returning original texts');
        return texts; // Return original texts instead of making more requests
      }
      console.error('Batch translation failed:', error);
      return texts; // Return original texts as fallback
    }
  }

  /**
   * Fetch translation from backend
   */
  private async fetchTranslation(
    text: string,
    targetLanguage: SupportedLanguage,
    context?: string
  ): Promise<string> {
    try {
      const response = await apiService.post('/translation/translate', {
        text,
        target_language: targetLanguage,
        source_language: 'en',
        context
      });

      if (response.success && response.data?.translated_text) {
        return response.data.translated_text;
      }

      // Fallback: return original text if translation fails
      console.warn('Translation failed, returning original text');
      return text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original on error
    }
  }

  /**
   * Get cache key for text and language
   */
  private getCacheKey(text: string, language: string): string {
    return `${text}:${language}`;
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache = {};
  }

  /**
   * Preload translations for common UI elements
   */
  async preloadCommonTranslations(language: SupportedLanguage) {
    const commonTexts = [
      'Dashboard',
      'AI Agents',
      'Settings',
      'Profile',
      'Credits',
      'Generate',
      'Save',
      'Cancel',
      'Delete',
      'Edit',
      'Create',
      'Update',
      'Loading...',
      'Error',
      'Success',
      'Welcome',
      'Sign In',
      'Sign Out'
    ];

    await this.translateBatch(commonTexts, language, 'UI elements');
  }
}

export const translationService = new TranslationService();

