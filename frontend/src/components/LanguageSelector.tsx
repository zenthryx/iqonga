import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Check } from 'lucide-react';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, supportedLanguages, isLoading } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = supportedLanguages.find(l => l.code === language);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        disabled={isLoading}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm">{currentLanguage?.nativeName || currentLanguage?.name || 'English'}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[10000]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[10001] max-h-96 overflow-y-auto">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  language === lang.code ? 'bg-gray-700' : ''
                }`}
              >
                <div>
                  <div className="text-white text-sm font-medium">{lang.nativeName}</div>
                  <div className="text-gray-400 text-xs">{lang.name}</div>
                </div>
                {language === lang.code && (
                  <Check className="h-4 w-4 text-purple-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;

