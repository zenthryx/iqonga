import React, { useEffect } from 'react';
import { getDomainConfig } from '@/utils/domain';

export interface SEOProps {
  /** Page title (e.g. "Agent Forum"). Will be suffixed with " | {Site Name}" if not already present. */
  title?: string;
  /** Meta description for search and social. Truncated to ~160 chars if longer. */
  description?: string;
  /** Optional: canonical URL (full URL) to avoid duplicate content. */
  canonical?: string;
  /** Optional: Open Graph image URL for social sharing. */
  ogImage?: string;
  /** Optional: Open Graph URL (defaults to canonical or current page URL). */
  ogUrl?: string;
  /** Optional: og:type — "website" (default) or "article". */
  ogType?: 'website' | 'article';
  /** Optional: for article type — publishedTime, author, etc. */
  articleMeta?: { publishedTime?: string; modifiedTime?: string; author?: string; section?: string };
  /** Optional: JSON-LD structured data (object or array of objects). */
  jsonLd?: object | object[];
  /** Optional: set noindex for this page. */
  noindex?: boolean;
}

const defaultTitle = 'The Agentic Framework for Your Business';

/**
 * Updates document title, meta tags (description, Open Graph, Twitter), canonical, and optional JSON-LD.
 * Use on key pages so crawlers and social shares get the right metadata.
 * Site name is domain-aware (AIAForums on forum domain, Iqonga on main).
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  ogImage,
  ogUrl,
  ogType = 'website',
  articleMeta,
  jsonLd,
  noindex = false,
}) => {
  useEffect(() => {
    const config = getDomainConfig();
    const siteName = config.siteName;

    const fullTitle = title
      ? (title.includes(siteName) || title.includes('Iqonga') || title.includes('AIAForums')
          ? title
          : `${title} | ${siteName}`)
      : `${siteName} - ${config.siteTagline}`;

    document.title = fullTitle;

    const metaDesc = description
      ? description.slice(0, 160) + (description.length > 160 ? '…' : '')
      : undefined;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    if (metaDesc) {
      setMeta('meta[name="description"]', 'name', 'description', metaDesc);
    }

    const url = ogUrl || canonical || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}${window.location.search}` : '');
    const absOgImage = ogImage
      ? (ogImage.startsWith('http') ? ogImage : `${typeof window !== 'undefined' ? window.location.origin : 'https://iqonga.org'}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`)
      : undefined;

    // Open Graph
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    if (metaDesc) setMeta('meta[property="og:description"]', 'property', 'og:description', metaDesc);
    if (url) setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    if (absOgImage) setMeta('meta[property="og:image"]', 'property', 'og:image', absOgImage);

    // Twitter
    let twitterCard = document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]');
    if (!twitterCard) {
      twitterCard = document.createElement('meta');
      twitterCard.setAttribute('name', 'twitter:card');
      document.head.appendChild(twitterCard);
    }
    twitterCard.setAttribute('content', absOgImage ? 'summary_large_image' : 'summary');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    if (metaDesc) setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', metaDesc);
    if (absOgImage) setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absOgImage);

    if (articleMeta && ogType === 'article') {
      if (articleMeta.publishedTime) setMeta('meta[property="article:published_time"]', 'property', 'article:published_time', articleMeta.publishedTime);
      if (articleMeta.modifiedTime) setMeta('meta[property="article:modified_time"]', 'property', 'article:modified_time', articleMeta.modifiedTime);
      if (articleMeta.author) setMeta('meta[property="article:author"]', 'property', 'article:author', articleMeta.author);
      if (articleMeta.section) setMeta('meta[property="article:section"]', 'property', 'article:section', articleMeta.section);
    }

    if (canonical) {
      let linkEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'canonical');
        document.head.appendChild(linkEl);
      }
      linkEl.setAttribute('href', canonical);
    }

    let robotsEl = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robotsEl) {
        robotsEl = document.createElement('meta');
        robotsEl.setAttribute('name', 'robots');
        document.head.appendChild(robotsEl);
      }
      robotsEl.setAttribute('content', 'noindex, nofollow');
    } else if (robotsEl) {
      robotsEl.remove();
    }

    // JSON-LD
    let scriptEl = document.getElementById('seo-json-ld') as HTMLScriptElement | null;
    if (jsonLd) {
      const payload = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      const json = JSON.stringify(payload.length === 1 ? payload[0] : payload);
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'seo-json-ld';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = json;
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      const toRemove = document.getElementById('seo-json-ld');
      if (toRemove) toRemove.remove();
    };
  }, [title, description, canonical, ogImage, ogUrl, ogType, articleMeta, jsonLd, noindex]);

  return null;
};

export default SEO;
