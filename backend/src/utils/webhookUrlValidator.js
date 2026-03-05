/**
 * Validate webhook URLs to prevent SSRF (server-side request forgery).
 * Only allow public HTTPS URLs; block private/internal IPs and non-HTTPS.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  '0.0.0.0',
  'metadata.google.internal',
  'metadata'
]);

/**
 * Check if an IPv4 address is in a private or reserved range
 */
function isPrivateIPv4(parts) {
  if (parts.length !== 4) return true;
  const [a, b, c] = parts.map(Number);
  if (a === 127) return true;                           // loopback
  if (a === 10) return true;                            // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true;     // 172.16.0.0/12
  if (a === 192 && b === 168) return true;              // 192.168.0.0/16
  if (a === 169 && b === 254) return true;              // link-local
  if (a === 0) return true;                             // 0.0.0.0/8
  if (a >= 224) return true;                            // multicast / reserved
  return false;
}

/**
 * Check if an IPv6 address is loopback or private
 */
function isPrivateIPv6(host) {
  const lower = host.toLowerCase();
  if (lower === '::1') return true;
  if (lower === '::') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('ff')) return true;  // multicast
  return false;
}

/**
 * Validate webhook URL. Returns { valid: true } or { valid: false, error: string }.
 * - Must be HTTPS only
 * - Host must resolve to a public IP (we check hostname patterns; DNS is not resolved to avoid DoS)
 * - Block known private hostnames and private IP literals
 */
function validateWebhookUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Webhook URL is required' };
  }
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Webhook URL cannot be empty' };
  }
  if (trimmed.length > 2048) {
    return { valid: false, error: 'Webhook URL is too long' };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid webhook URL format' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Webhook URL must use HTTPS' };
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    return { valid: false, error: 'Webhook URL host is not allowed' };
  }
  // IPv4 literal
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const parts = host.split('.').map(Number);
    if (parts.some(p => p > 255)) {
      return { valid: false, error: 'Invalid IP address in webhook URL' };
    }
    if (isPrivateIPv4(parts)) {
      return { valid: false, error: 'Webhook URL cannot point to a private or loopback IP' };
    }
  }
  // IPv6 literal (e.g. [::1] or [2001:db8::1])
  if (host.startsWith('[')) {
    const inner = host.slice(1, -1);
    if (isPrivateIPv6(inner)) {
      return { valid: false, error: 'Webhook URL cannot point to a private or loopback IP' };
    }
  }
  return { valid: true };
}

module.exports = {
  validateWebhookUrl,
  isPrivateIPv4,
  isPrivateIPv6
};
