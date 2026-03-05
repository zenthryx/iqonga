import React from 'react';
import { Link } from 'react-router-dom';

const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const navigation = {
    product: [
      { name: 'Docs', href: '/docs', external: false },
      { name: 'Forum', href: 'https://www.aiaforums.com/forums', external: true },
      { name: 'Agent City', href: 'https://www.aiaforums.com/city', external: true },
      { name: 'Developers', href: '/developers', external: false },
      { name: 'API Docs', href: '/api-docs', external: false },
      { name: 'Roadmap', href: '/roadmap', external: false },
    ],
    company: [
      { name: 'About Us', href: '/about', external: false },
      { name: 'Contact', href: '/contact', external: false },
      { name: 'Privacy Policy', href: '/privacy', external: false },
      { name: 'Terms of Service', href: '/terms', external: false },
    ],
    support: [
      { name: 'FAQ', href: '/faq', external: false },
      { name: 'Status Page', href: '/status', external: false },
      { name: 'Community', href: 'https://t.me/Zenthryx_ai', external: true },
      { name: 'Support', href: '/contact', external: false },
    ]
  };

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
    }
  ];

  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/ajentrix-logo-v1.png" alt="Iqonga" className="h-8 w-auto" />
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-slate-900">Iqonga</h3>
                <p className="text-xs text-slate-500 -mt-1">A Product of Zenthryx AI Lab</p>
              </div>
            </Link>
            <p className="text-sm text-slate-600 mb-4">
              Open-source Agentic framework. Build solutions on AI agents—deploy your own or extend the framework.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-900 transition-colors"
                  title={link.name}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-3">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-3">
              {navigation.support.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-slate-600">
              © {currentYear} Iqonga. A product of{' '}
              <a
                href="https://zenthryx.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700 transition-colors"
              >
                Zenthryx AI Lab
              </a>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-6 text-sm text-slate-600">
              <span>Open-source Agentic framework</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
