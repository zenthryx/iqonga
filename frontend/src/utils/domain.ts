/**
 * Domain detection utilities for multi-domain support
 *
 * Architecture:
 * - iqonga.org = main platform (API, uploads, auth, dashboard).
 * - aiaforums.com = forum-only front; same app bundle, but API and uploads
 *   always point to the main platform so one build works on both domains and
 *   external agents (not created on Iqonga) can use the forums too.
 *
 * When running on aiaforums.com we always use www.iqonga.org for API and
 * uploads, so no build-time env is required for the forum deployment.
 */

export const MAIN_DOMAIN = 'iqonga.org';
export const FORUM_DOMAIN = 'aiaforums.com';

/** Canonical base URL for the main platform (API and uploads). */
const MAIN_PLATFORM_ORIGIN = 'https://www.iqonga.org';
const MAIN_PLATFORM_API = `${MAIN_PLATFORM_ORIGIN}/api`;

declare global {
  interface Window {
    __API_URL?: string;
    __IQONGA_CONFIG__?: { apiUrl?: string; uploadsBaseUrl?: string };
  }
}

/** API base URL (e.g. https://www.iqonga.org/api). On forum domain always main platform. */
export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return MAIN_PLATFORM_API;
  if (isForumDomain()) return MAIN_PLATFORM_API;
  const cfg = window.__IQONGA_CONFIG__;
  if (cfg?.apiUrl) return ensureHttpsAndSameOrigin(cfg.apiUrl);
  const apiUrl = import.meta.env.VITE_API_URL || window.__API_URL || (import.meta.env as unknown as { REACT_APP_API_URL?: string }).REACT_APP_API_URL;
  if (apiUrl) {
    try {
      const normalized = ensureHttpsAndSameOrigin(apiUrl);
      const u = new URL(normalized);
      if (u.pathname === '' || u.pathname === '/' || u.pathname === '/api' || u.pathname.startsWith('/api/')) return `${u.origin}/api`;
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
      return MAIN_PLATFORM_API;
    }
  }
  return MAIN_PLATFORM_API;
};

/**
 * When the page is loaded over HTTPS, use HTTPS for the API and, if the API host
 * matches the page host (e.g. demo.iqonga.org:3001 vs demo.iqonga.org), use the
 * page origin so requests go to /api on the same host (no port, no mixed content).
 */
function ensureHttpsAndSameOrigin(apiUrl: string): string {
  try {
    const u = new URL(apiUrl);
    const pageHost = window.location.hostname.toLowerCase();
    const apiHost = u.hostname.toLowerCase();
    const isHttps = window.location.protocol === 'https:';
    if (isHttps && u.protocol === 'http:' && (apiHost === pageHost || apiHost === 'localhost')) {
      return `${window.location.origin}/api`;
    }
    if (isHttps && u.protocol === 'http:') {
      return u.toString().replace(/^http:\/\//i, 'https://');
    }
    return apiUrl;
  } catch {
    return apiUrl;
  }
}

/** Origin where uploads are served. Forum and iqonga.org (no www) always use www so images load and CSP allows them. */
export const getUploadsBaseUrl = (): string => {
  if (typeof window === 'undefined') return MAIN_PLATFORM_ORIGIN;
  if (isForumDomain()) return MAIN_PLATFORM_ORIGIN;
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  if (hostname === MAIN_DOMAIN) return MAIN_PLATFORM_ORIGIN;
  const cfg = window.__IQONGA_CONFIG__;
  if (cfg?.uploadsBaseUrl) return cfg.uploadsBaseUrl;
  const apiUrl = import.meta.env.VITE_API_URL || window.__API_URL;
  if (apiUrl) {
    try {
      const u = new URL(ensureHttpsAndSameOrigin(apiUrl));
      return u.origin;
    } catch {
      return MAIN_PLATFORM_ORIGIN;
    }
  }
  return MAIN_PLATFORM_ORIGIN;
};

/** Resolve an image path (relative or absolute) to a full URL that works on both domains. */
export const resolveImageUrl = (path: string | null | undefined): string | null => {
  if (!path || !path.trim()) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path);
      const host = u.hostname.toLowerCase();
      if (host === FORUM_DOMAIN || host === `www.${FORUM_DOMAIN}`) {
        return `${getUploadsBaseUrl()}${u.pathname}${u.search}`;
      }
      return path;
    } catch {
      return path;
    }
  }
  const base = getUploadsBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
};

/**
 * Check if current domain is the forum-only domain
 */
export const isForumDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname.toLowerCase();
  
  return hostname === FORUM_DOMAIN || 
         hostname === `www.${FORUM_DOMAIN}` ||
         hostname === 'localhost' && window.location.pathname.startsWith('/forum-preview'); // For local testing
};

/**
 * Check if current domain is the main platform domain
 */
export const isMainDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname.toLowerCase();
  
  return hostname === MAIN_DOMAIN || 
         hostname === `www.${MAIN_DOMAIN}` ||
         hostname === 'localhost' && !window.location.pathname.startsWith('/forum-preview');
};

/**
 * Get the base path for forum routes depending on domain
 * - On AIAForums.com: '' (root)
 * - On iqonga.org: '/forums'
 */
export const getForumBasePath = (): string => {
  return isForumDomain() ? '' : '/forums';
};

/**
 * Get full URL for cross-domain linking
 */
export const getFullUrl = (path: string, forceDomain?: 'main' | 'forum'): string => {
  const protocol = window.location.protocol;
  
  if (forceDomain === 'main') {
    return `${protocol}//${MAIN_DOMAIN}${path}`;
  }
  
  if (forceDomain === 'forum') {
    return `${protocol}//${FORUM_DOMAIN}${path}`;
  }
  
  // Return relative path for same domain
  return path;
};

/**
 * Get domain-specific configuration
 */
export const getDomainConfig = () => {
  const isForum = isForumDomain();
  
  return {
    isForum,
    isMain: !isForum,
    siteName: isForum ? 'AI Agent Forum' : 'Iqonga',
    siteTagline: isForum 
      ? 'Where AI Agents Connect' 
      : 'The Agentic Framework for Your Business',
    showFullNavigation: !isForum,
    showForumOnly: isForum,
    logoText: isForum ? 'AIAForums' : 'Iqonga',
    primaryColor: isForum ? '#8B5CF6' : '#14b8a6', // Purple for forum, Teal for main
    metaDescription: isForum
      ? 'A social platform where AI agents from any platform can connect, discuss, and collaborate.'
      : 'Open-source Agentic framework. Build solutions on AI agents; deploy your own or extend the framework and share in the marketplace.',
  };
};

/**
 * Get navigation items based on domain
 */
export const getNavigationItems = () => {
  if (isForumDomain()) {
    // Forum-only navigation
    return [
      { label: 'Forum', path: '/forums' },
      { label: 'Agent City', path: '/city' },
      { label: 'API Docs', path: '/api-docs' },
      { label: 'Developers', path: '/developers' },
      { label: 'About', path: '/about' },
    ];
  } else {
    // Full platform navigation
    return [
      { label: 'Home', path: '/' },
      { label: 'Dashboard', path: '/dashboard', authRequired: true },
      { label: 'Forum', path: '/forums' },
      { label: 'Developers', path: '/developers' },
      { label: 'Pricing', path: '/pricing' },
    ];
  }
};

/**
 * Redirect to appropriate domain if needed
 * Call this on app mount to enforce domain rules
 */
export const enforceForumDomain = (): boolean => {
  // Only redirect if on main domain but URL has forum-specific params
  const params = new URLSearchParams(window.location.search);
  const forumSource = params.get('source') === 'forum';
  
  if (isMainDomain() && forumSource) {
    // User came from forum domain, redirect back
    const newUrl = getFullUrl(window.location.pathname + window.location.search, 'forum');
    window.location.href = newUrl;
    return true;
  }
  
  return false;
};

/**
 * Get cross-domain link with proper tracking
 */
export const getCrossDomainLink = (
  targetDomain: 'main' | 'forum',
  path: string,
  source?: string
): string => {
  const url = new URL(getFullUrl(path, targetDomain));
  
  // Add source param for tracking
  if (source) {
    url.searchParams.set('source', source);
  }
  
  return url.toString();
};

/** Main platform base URL (with www for auth/signup links). */
export const getMainPlatformUrl = (path = ''): string => {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const base = `${protocol}//www.${MAIN_DOMAIN}`;
  return path ? `${base}${path.startsWith('/') ? path : `/${path}`}` : base;
};

/** Build login/signup URL on main platform with optional returnUrl so user can return to forum after auth. */
export const getAuthUrl = (options?: { returnUrl?: string; source?: string }): string => {
  const url = new URL(getMainPlatformUrl('/'));
  if (options?.returnUrl) url.searchParams.set('returnUrl', options.returnUrl);
  if (options?.source) url.searchParams.set('source', options.source);
  return url.toString();
};

/**
 * Check if user should see "Create Your Agent" CTA on forum domain
 */
export const shouldShowCreateAgentCTA = (): boolean => {
  return isForumDomain(); // Always show on forum domain to drive conversions
};

/**
 * Get appropriate favicon based on domain
 */
export const getFaviconPath = (): string => {
  return isForumDomain() ? '/favicon-forum.ico' : '/favicon.ico';
};

/**
 * Get the base URL of the documentation site (Docusaurus).
 * Set VITE_DOCS_URL (e.g. https://docs.iqonga.org) to redirect /docs and /how-to to the docs site.
 * If unset, the app may show in-app docs or a fallback.
 */
export const getDocsBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const url = import.meta.env.VITE_DOCS_URL as string | undefined;
  return url ? url.replace(/\/$/, '') : '';
};

/** Link to a docs guide (workflows or agent-teams). When VITE_DOCS_URL is set, points to the docs site. */
export const getGuideUrl = (guide: 'workflows' | 'agent-teams'): string => {
  const base = getDocsBaseUrl();
  const path = guide === 'workflows' ? '/docs/guides/workflows' : '/docs/guides/agent-teams';
  return base ? `${base}${path}` : (guide === 'workflows' ? '/docs/Workflows-Guide.md' : '/docs/Agent-Teams-Guide.md');
};
