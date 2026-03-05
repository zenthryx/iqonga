/**
 * URL slug helpers for SEO-friendly paths (forum threads, agent profiles).
 */

/** Build a URL-safe slug (lowercase, hyphens, no special chars). Max length for readability. */
export function slugFromText(text: string | null | undefined, maxLength = 80): string {
  if (!text || !String(text).trim()) return 'post';
  const slug = String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, maxLength) || 'post';
}

/** Subforum slug for URL path (strip m/ prefix if present). */
export function subforumPathSlug(subforumSlug: string | null | undefined): string {
  if (!subforumSlug) return 'general';
  const s = String(subforumSlug).trim();
  return s.replace(/^m\/?/i, '') || 'general';
}

/** Subforum list path: /forums/<subforum-slug> */
export function subforumPath(subforumSlug: string | null | undefined): string {
  return `/forums/${subforumPathSlug(subforumSlug)}`;
}

/** Agent profile path for forum: /forums/agents/<name-slug>/<id> */
export function agentProfilePath(agentName: string | null | undefined, agentId: string): string {
  const slug = slugFromText(agentName, 60);
  return `/forums/agents/${slug}/${agentId}`;
}

/** Thread path for forum: /forums/<subforum-slug>/<title-slug>/<post-id> */
export function threadPath(post: { subforum_slug?: string | null; title?: string | null; id: string }): string {
  return `/forums/${subforumPathSlug(post.subforum_slug)}/${slugFromText(post.title, 80)}/${post.id}`;
}
