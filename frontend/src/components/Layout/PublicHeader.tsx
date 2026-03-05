import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import LanguageSelector from '../LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';
import { getDomainConfig } from '@/utils/domain';

const PublicHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const location = useLocation();
  const { t, language } = useLanguage();
  const [navigationTranslated, setNavigationTranslated] = useState<any[]>([]);
  const [moreMenuTranslated, setMoreMenuTranslated] = useState<any[]>([]);
  const domainConfig = getDomainConfig();

  // Primary navigation - Iqonga (open-source framework). No Forum/City in open source.
  const navigationBase = [
    { name: 'Home', href: '/' },
    { name: 'Docs', href: '/docs' },
    { name: 'About', href: '/about' },
  ];

  // Secondary items in "More" dropdown
  const moreMenuBase = [
    { name: 'Developers', href: '/developers' },
    { name: 'Roadmap', href: '/roadmap' },
    { name: 'Contact', href: '/contact' },
  ];

  useEffect(() => {
    const translateNavigation = async () => {
      if (language === 'en') {
        setNavigationTranslated(navigationBase);
        setMoreMenuTranslated(moreMenuBase);
        return;
      }

      try {
        // Batch translate all navigation items at once
        const navTexts = navigationBase.map(item => item.name);
        const moreTexts = moreMenuBase.map(item => item.name);
        const { translationService } = await import('../../services/translationService');
        const [translatedNavTexts, translatedMoreTexts] = await Promise.all([
          translationService.translateBatch(navTexts, language, 'Navigation items'),
          translationService.translateBatch(moreTexts, language, 'More menu items')
        ]);
        
        const translated = navigationBase.map((item, index) => ({
          ...item,
          name: translatedNavTexts[index] || item.name
        }));
        const translatedMore = moreMenuBase.map((item, index) => ({
          ...item,
          name: translatedMoreTexts[index] || item.name
        }));
        setNavigationTranslated(translated);
        setMoreMenuTranslated(translatedMore);
      } catch (error) {
        console.error('Navigation translation error:', error);
        setNavigationTranslated(navigationBase);
        setMoreMenuTranslated(moreMenuBase);
      }
    };

    translateNavigation();
  }, [language, t]);

  // Close more menu when route changes
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  const isForum = false; // Forum/City not shipped with open source
  const navigation = navigationTranslated.length > 0 ? navigationTranslated : navigationBase;
  const moreMenu = moreMenuTranslated.length > 0 ? moreMenuTranslated : moreMenuBase;
  const showMoreMenu = moreMenu.length > 0;

  const socialLinks = [
    {
      name: 'Telegram',
      href: 'https://t.me/Zenthryx_ai',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      )
    },
    {
      name: 'Twitter',
      href: 'https://x.com/ZenthryxAI',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    {
      name: 'Zenthryx',
      href: 'https://zenthryx.ai',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      )
    }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Iqonga" className="h-8 w-auto" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900">{domainConfig.logoText}</h1>
              <p className="text-xs text-slate-500 -mt-1">
                A Product of Zenthryx AI Lab
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              item.external ? (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium transition-colors whitespace-nowrap text-slate-600 hover:text-slate-900"
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors whitespace-nowrap ${
                    location.pathname === item.href
                      ? 'text-teal-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.name}
                </Link>
              )
            ))}

            {/* More Menu Dropdown (main platform only) */}
            {showMoreMenu && (
              <div className="relative">
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                    moreMenu.some(item => location.pathname === item.href)
                      ? 'text-teal-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  More
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMoreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMoreMenuOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-2">
                      {moreMenu.map((item) => (
                        item.external ? (
                          <a
                            key={item.name}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setIsMoreMenuOpen(false)}
                            className="block px-4 py-2 text-sm transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMoreMenuOpen(false)}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              location.pathname === item.href ? 'text-teal-600 bg-teal-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            {item.name}
                          </Link>
                        )
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </nav>

          {/* Social Links & CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
                {socialLinks.map((link) => (
                  <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors" title={link.name}>
                    {link.icon}
                  </a>
                ))}
              </div>

            <LanguageSelector />

            <Link to="/dashboard" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Sign in
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-4">
            <nav className="flex flex-col space-y-4">
              {navigation.map((item) => (
                item.external ? (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium transition-colors text-slate-600 hover:text-slate-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-sm font-medium transition-colors ${
                      location.pathname === item.href
                        ? 'text-teal-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              ))}

              {showMoreMenu && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">More</p>
                  {moreMenu.map((item) => (
                    item.external ? (
                      <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium py-2 px-2 text-slate-600 hover:text-slate-900" onClick={() => setIsMenuOpen(false)}>
                        {item.name}
                      </a>
                    ) : (
                      <Link key={item.name} to={item.href} className={`block text-sm font-medium py-2 px-2 ${location.pathname === item.href ? 'text-teal-600' : 'text-slate-600 hover:text-slate-900'}`} onClick={() => setIsMenuOpen(false)}>
                        {item.name}
                      </Link>
                    )
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-4 pt-4 border-t border-slate-200">
                  {socialLinks.map((link) => (
                    <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors" title={link.name}>
                      {link.icon}
                    </a>
                ))}
              </div>

              <div className="pt-2">
                <LanguageSelector />
              </div>

              <Link to="/dashboard" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center block" onClick={() => setIsMenuOpen(false)}>
                Sign in
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default PublicHeader;
