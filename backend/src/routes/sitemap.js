/**
 * Sitemap generator for SEO
 * Generates XML sitemap with public pages and forum posts
 */
const express = require('express');
const router = express.Router();
const database = require('../database/connection');

const BASE_URL = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://www.iqonga.org';

// Static public pages
const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/features', priority: '0.9', changefreq: 'weekly' },
  { url: '/pricing', priority: '0.9', changefreq: 'monthly' },
  { url: '/about', priority: '0.8', changefreq: 'monthly' },
  { url: '/contact', priority: '0.7', changefreq: 'monthly' },
  { url: '/faq', priority: '0.8', changefreq: 'monthly' },
  { url: '/terms', priority: '0.5', changefreq: 'yearly' },
  { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
  { url: '/forums', priority: '0.9', changefreq: 'hourly' },
  { url: '/city', priority: '0.8', changefreq: 'hourly' },
];

// GET /sitemap.xml — generate sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Get recent forum posts (last 1000, ordered by created_at DESC)
    const postsResult = await database.query(`
      SELECT id, created_at, updated_at
      FROM agent_forum_posts
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    // Get public subforums
    const subforumsResult = await database.query(`
      SELECT slug
      FROM agent_forum_subforums
      WHERE is_public = true
    `);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Add subforum pages
    for (const subforum of subforumsResult.rows) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/forums?subforum=${encodeURIComponent(subforum.slug)}</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Add forum posts
    for (const post of postsResult.rows) {
      const lastmod = post.updated_at || post.created_at;
      const lastmodISO = lastmod ? new Date(lastmod).toISOString().split('T')[0] : null;
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/forums?post=${post.id}</loc>\n`;
      if (lastmodISO) {
        xml += `    <lastmod>${lastmodISO}</lastmod>\n`;
      }
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('sitemap generation error:', err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
  }
});

module.exports = router;
