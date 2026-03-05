/**
 * Hybrid Analytics Utility
 * Tracks via Google Analytics (when not blocked) AND server-side (always works)
 */

import { getApiBaseUrl } from './domain';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || '';
let isGAInitialized = false;
let sessionId = '';

// Generate or retrieve session ID
const getSessionId = () => {
  if (sessionId) return sessionId;
  
  // Try to get existing session ID from sessionStorage
  sessionId = sessionStorage.getItem('analytics_session_id') || '';
  
  if (!sessionId) {
    // Generate new session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  
  return sessionId;
};

// Parse UTM parameters from URL
const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined
  };
};

// Send event to server (bypasses ad blockers)
const trackServerSide = async (data: any) => {
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      },
      body: JSON.stringify({
        ...data,
        session_id: getSessionId(),
        referrer: document.referrer || undefined,
        ...getUTMParams()
      })
    });
  } catch (e) {
    // Silent fail - don't break the app if analytics fails
    console.debug('Server-side analytics failed:', e);
  }
};

/**
 * Initialize Google Analytics
 * Call this once when the app loads
 * Note: GA script is now in index.html for better reliability
 */
export const initGA = () => {
  if (!GA_TRACKING_ID || typeof window === 'undefined') {
    return;
  }

  // Check if GA is already initialized (from index.html)
  if (window.gtag) {
    isGAInitialized = true;
    return;
  }
  
  isGAInitialized = true;
};

/**
 * Track a page view
 * Sends to both Google Analytics AND server (server bypasses ad blockers)
 */
export const trackPageView = (path: string) => {
  // Track in Google Analytics (if not blocked)
  if (GA_TRACKING_ID && window.gtag) {
    try {
      window.gtag('config', GA_TRACKING_ID, {
        page_path: path,
      });
    } catch (e) {
      console.debug('GA tracking failed:', e);
    }
  }
  
  // Always track server-side (works even with ad blockers)
  trackServerSide({
    event_type: 'page_view',
    page_path: path,
    page_title: document.title
  });
};

/**
 * Track an event
 * Sends to both Google Analytics AND server
 */
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  // Track in Google Analytics (if not blocked)
  if (GA_TRACKING_ID && window.gtag) {
    try {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    } catch (e) {
      console.debug('GA event tracking failed:', e);
    }
  }
  
  // Always track server-side
  trackServerSide({
    event_type: 'event',
    event_name: action,
    metadata: { category, label, value }
  });
};

/**
 * Track a custom event with additional parameters
 * Sends to both Google Analytics AND server
 */
export const trackCustomEvent = (eventName: string, parameters?: Record<string, any>) => {
  // Track in Google Analytics (if not blocked)
  if (GA_TRACKING_ID && window.gtag) {
    try {
      window.gtag('event', eventName, parameters);
    } catch (e) {
      console.debug('GA custom event tracking failed:', e);
    }
  }
  
  // Always track server-side
  trackServerSide({
    event_type: 'custom_event',
    event_name: eventName,
    metadata: parameters
  });
};
