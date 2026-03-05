import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translationService, SupportedLanguage, SUPPORTED_LANGUAGES } from '../services/translationService';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (text: string, context?: string) => Promise<string>;
  tSync: (text: string, fallback?: string) => string;
  isLoading: boolean;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(
    translationService.getLanguage()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = translationService.getLanguage();
    if (savedLanguage !== language) {
      setLanguageState(savedLanguage);
    }

    // Preload common translations
    translationService.preloadCommonTranslations(savedLanguage).catch(console.error);
  }, []);

  const setLanguage = async (lang: SupportedLanguage) => {
    setIsLoading(true);
    try {
      translationService.setLanguage(lang);
      setLanguageState(lang);
      
      // Clear cache and preload new language
      translationService.clearCache();
      await translationService.preloadCommonTranslations(lang);
      
      // Reload page to apply translations (or use React state update)
      // For now, we'll update state and let components re-render
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const t = async (text: string, context?: string): Promise<string> => {
    if (language === 'en') return text;
    
    // Check sync cache first
    const cacheKey = `${text}:${language}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }

    const translated = await translationService.translate(text, language, context);
    setTranslationCache(prev => ({ ...prev, [cacheKey]: translated }));
    return translated;
  };

  const tSync = (text: string, fallback?: string): string => {
    if (language === 'en') return text;
    
    const cacheKey = `${text}:${language}`;
    return translationCache[cacheKey] || fallback || text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tSync,
        isLoading,
        supportedLanguages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

