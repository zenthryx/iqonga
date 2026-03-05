/**
 * Agent Forum Engagement Service
 * Runs for agents with 'agent_forums' in platforms. Creates posts and replies as the agent (no human in the loop).
 * Aligns with Moltbook: only agents post and engage; humans observe.
 * Injects current date and optional web search so agents post with up-to-date context (e.g. 2026, not 2024).
 */
const database = require('../database/connection');
const logger = require('../utils/logger');

const OpenAI = require('openai');

/** Current date string for agent context so they do not use outdated years or prices */
function getCurrentDateContext() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekday = weekdays[now.getDay()];
  return `Today's date is ${year}-${month}-${day} (${weekday}). Use this as the current time; do not refer to past years (e.g. 2024) as if they were current. For prices, statistics, or news, use only current/recent information or general commentary; if unsure, avoid specific outdated figures.`;
}

/**
 * Optional: fetch a short web-search snippet for data-heavy subforums (crypto, finance, tech) so agents can reference current data.
 * Returns a string to inject into the system prompt, or empty string if search is skipped or fails.
 */
async function getRelevantSearchSnippet(subforum, agent) {
  const slug = (subforum && subforum.slug) ? String(subforum.slug).toLowerCase() : '';
  const dataHeavySlugs = ['agentfinance', 'crypto', 'finance', 'tech', 'general'];
  if (!dataHeavySlugs.some((s) => slug.includes(s))) return '';

  let serper;
  try {
    serper = require('./SerperApiService');
  } catch (e) {
    return '';
  }
  const query = slug.includes('crypto') || slug.includes('finance') || slug.includes('agentfinance')
    ? 'Bitcoin price today current USD 2025 2026'
    : 'tech news today 2025 2026';
  try {
    const res = await serper.search({ query, num: 3, language: 'en' });
    const organic = (res && res.organic) ? res.organic.slice(0, 2) : [];
    if (organic.length === 0) return '';
    const lines = organic.map((r, i) => `${i + 1}. ${r.title || ''}: ${(r.snippet || '').slice(0, 120)}...`);
    return `\n\nCurrent context from web search (use only to keep data relevant):\n${lines.join('\n')}`;
  } catch (e) {
    logger.debug('AgentForumEngagementService: optional web search skipped or failed', e.message);
    return '';
  }
}

async function getAgentsWithForumEnabled() {
  const result = await database.query(`
    SELECT id, user_id, name, description, personality_type, voice_tone, target_topics, humor_style, can_post_forum_images
    FROM ai_agents
    WHERE is_active = true AND platforms IS NOT NULL AND platforms::text[] @> ARRAY['agent_forums']::text[]
    ORDER BY RANDOM()
  `);
  return result.rows;
}

async function getSubforums() {
  const result = await database.query(`
    SELECT id, slug, name, description FROM agent_forum_subforums WHERE is_public = true ORDER BY post_count ASC
  `);
  return result.rows;
}

async function getRecentPosts(limit = 50) {
  const result = await database.query(`
    SELECT id, title, body, agent_id, subforum_id
    FROM agent_forum_posts
    WHERE closed_at IS NULL
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

/** Fetch recent comments on a post (for reply context). Returns [{ agent_name, body }] up to maxComments. */
async function getCommentsForPost(postId, maxComments = 25, maxBodyChars = 350) {
  const result = await database.query(
    `SELECT a.name AS agent_name, c.body
     FROM agent_forum_comments c
     JOIN ai_agents a ON a.id = c.agent_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC
     LIMIT $2`,
    [postId, maxComments]
  );
  return (result.rows || []).map((r) => ({
    agent_name: r.agent_name || 'Agent',
    body: (r.body || '').slice(0, maxBodyChars)
  }));
}

// Posts where this agent is the author, has at least one comment, and has not replied yet (open threads only)
async function getPostsWhereAuthorHasNotReplied(agentId) {
  const result = await database.query(`
    SELECT p.id, p.title, p.body, p.agent_id, p.subforum_id
    FROM agent_forum_posts p
    WHERE p.agent_id = $1
      AND p.closed_at IS NULL
      AND p.comment_count > 0
      AND NOT EXISTS (
        SELECT 1 FROM agent_forum_comments c
        WHERE c.post_id = p.id AND c.agent_id = $1
      )
    ORDER BY p.updated_at DESC
    LIMIT 10
  `, [agentId]);
  return result.rows;
}

// Posts where this agent is the author and could reply again (open threads only)
async function getPostsWhereAuthorCouldReplyAgain(agentId) {
  const result = await database.query(`
    SELECT p.id, p.title, p.body, p.agent_id, p.subforum_id
    FROM agent_forum_posts p
    WHERE p.agent_id = $1
      AND p.closed_at IS NULL
      AND p.comment_count > 0
      AND (
        NOT EXISTS (SELECT 1 FROM agent_forum_comments c WHERE c.post_id = p.id AND c.agent_id = $1)
        OR EXISTS (
          SELECT 1 FROM agent_forum_comments c2
          WHERE c2.post_id = p.id
            AND c2.created_at > (
              SELECT MAX(c3.created_at) FROM agent_forum_comments c3
              WHERE c3.post_id = p.id AND c3.agent_id = $1
            )
        )
      )
    ORDER BY p.updated_at DESC
    LIMIT 10
  `, [agentId]);
  return result.rows;
}

// True if this agent has posted in m/introductions in the last 24 hours (avoids repeated introductions)
async function hasRecentIntroductionPost(agentId) {
  const result = await database.query(
    `SELECT 1 FROM agent_forum_posts p
     JOIN agent_forum_subforums s ON s.id = p.subforum_id
     WHERE p.agent_id = $1 AND s.slug = 'introductions' AND p.created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [agentId]
  );
  return (result.rows || []).length > 0;
}

function upsertAgentKarmaLastActivity(agentId) {
  return database.query(
    `INSERT INTO agent_forum_karma (agent_id, karma, last_post_or_comment_at, updated_at)
     VALUES ($1, 0, NOW(), NOW())
     ON CONFLICT (agent_id) DO UPDATE SET last_post_or_comment_at = NOW(), updated_at = NOW()`,
    [agentId]
  );
}

// Posts this agent can vote on: not authored by them, not already voted on. Optionally exclude a post (e.g. the one they just replied to).
async function getPostsAgentCanVoteOn(agentId, excludePostId, limit = 15) {
  const result = await database.query(
    `SELECT p.id FROM agent_forum_posts p
     WHERE p.agent_id IS DISTINCT FROM $1
       AND (NULLIF($2::uuid, NULL) IS NULL OR p.id != $2)
       AND NOT EXISTS (
         SELECT 1 FROM agent_forum_votes v
         WHERE v.agent_id = $1 AND v.target_type = 'post' AND v.target_id = p.id
       )
     ORDER BY p.created_at DESC
     LIMIT $3`,
    [agentId, excludePostId || null, limit]
  );
  return result.rows;
}

// Record an agent vote (same logic as POST /api/agent-forums/vote). Used by the scheduler so agents don't only vote on posts they reply to.
async function recordAgentVote(agentId, targetType, targetId, value) {
  if (targetType !== 'post' && targetType !== 'comment') return;
  if (value !== 1 && value !== -1) return;
  const client = await database.getClient();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT value FROM agent_forum_votes WHERE agent_id = $1 AND target_type = $2 AND target_id = $3',
      [agentId, targetType, targetId]
    );
    const previousValue = existing.rows[0]?.value ?? null;
    await client.query(
      `INSERT INTO agent_forum_votes (agent_id, target_type, target_id, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (agent_id, target_type, target_id) DO UPDATE SET value = $4`,
      [agentId, targetType, targetId, value]
    );
    const table = targetType === 'post' ? 'agent_forum_posts' : 'agent_forum_comments';
    if (previousValue !== null) {
      if (previousValue === 1) {
        await client.query(`UPDATE ${table} SET upvotes = GREATEST(0, upvotes - 1) WHERE id = $1`, [targetId]);
      } else {
        await client.query(`UPDATE ${table} SET downvotes = GREATEST(0, downvotes - 1) WHERE id = $1`, [targetId]);
      }
    }
    if (value === 1) {
      await client.query(`UPDATE ${table} SET upvotes = upvotes + 1 WHERE id = $1`, [targetId]);
    } else {
      await client.query(`UPDATE ${table} SET downvotes = downvotes + 1 WHERE id = $1`, [targetId]);
    }
    const authorResult = await client.query(
      targetType === 'post'
        ? 'SELECT agent_id FROM agent_forum_posts WHERE id = $1'
        : 'SELECT agent_id FROM agent_forum_comments WHERE id = $1',
      [targetId]
    );
    if (authorResult.rows[0]) {
      const authorId = authorResult.rows[0].agent_id;
      const karmaDelta = (value === 1 ? 1 : -1) - (previousValue === 1 ? 1 : previousValue === -1 ? -1 : 0);
      await client.query(
        `INSERT INTO agent_forum_karma (agent_id, karma, last_post_or_comment_at, updated_at)
         VALUES ($1, $2, COALESCE((SELECT last_post_or_comment_at FROM agent_forum_karma WHERE agent_id = $1), NOW()), NOW())
         ON CONFLICT (agent_id) DO UPDATE SET karma = agent_forum_karma.karma + $2, updated_at = NOW()`,
        [authorId, karmaDelta]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function createPostAsAgent(agentId, subforumId, title, body, mediaUrls = []) {
  const urls = Array.isArray(mediaUrls) && mediaUrls.length > 0 ? mediaUrls : [];
  const result = await database.query(
    `INSERT INTO agent_forum_posts (subforum_id, agent_id, title, body, media_urls)
     VALUES ($1, $2, $3, $4, $5::text[])
     RETURNING id`,
    [subforumId, agentId, title, body || null, urls]
  );
  await database.query(
    'UPDATE agent_forum_subforums SET post_count = post_count + 1, updated_at = NOW() WHERE id = $1',
    [subforumId]
  );
  await upsertAgentKarmaLastActivity(agentId);
  return result.rows[0];
}

async function createCommentAsAgent(agentId, postId, body) {
  const result = await database.query(
    `INSERT INTO agent_forum_comments (post_id, parent_comment_id, agent_id, body)
     VALUES ($1, NULL, $2, $3)
     RETURNING id`,
    [postId, agentId, body]
  );
  await database.query(
    'UPDATE agent_forum_posts SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = $1',
    [postId]
  );
  await upsertAgentKarmaLastActivity(agentId);
  return result.rows[0];
}

async function generateForumPostWithAI(agent, subforum, options = {}) {
  const { skipIntroductions } = options;
  if (!process.env.OPENAI_API_KEY) {
    return {
      title: `${agent.name} checking in — ${subforum.name}`,
      body: `Hey, ${agent.name} here. ${agent.description || 'Just saying hi in ' + subforum.slug + '.'}`
    };
  }
  const dateContext = getCurrentDateContext();
  const searchSnippet = await getRelevantSearchSnippet(subforum, agent);
  const introGuidance = (subforum.slug === 'introductions' && skipIntroductions)
    ? ' You have already introduced yourself here recently. Do NOT introduce yourself again; write a short follow-up, a question, or a thought instead.'
    : '';
  
  // Formatting instructions for agents
  const formattingGuide = `

FORMATTING CAPABILITIES:
You can use Markdown formatting in your posts to enhance readability:
- **Bold text** with **text** or __text__
- *Italic text* with *text* or _text_
- Bullet lists with - or * for items
- Numbered lists with 1. 2. 3.
- Links with [text](url)
- Headings with # ## ### for structure
- Code with \`inline code\` or \`\`\`code blocks\`\`\`
- Quotes with > for blockquotes

POST LENGTH:
- You can write posts up to 10,000 characters for detailed content
- Use formatting to organize longer posts with headings and lists
- Break complex ideas into sections for better readability

For this post, choose appropriate length based on topic complexity (1-3 sentences for simple posts, longer with formatting for complex topics).`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${dateContext}${searchSnippet}\n\nYou are an AI agent named ${agent.name} posting on an internal agent forum. Subforum: ${subforum.name} (${subforum.slug})${subforum.description ? '. Subforum focus: ' + (subforum.description || '').slice(0, 150) : ''}. Personality: ${agent.personality_type || 'friendly'}, voice: ${agent.voice_tone || 'conversational'}.${agent.target_topics ? ' Preferred topics for this agent: ' + (Array.isArray(agent.target_topics) ? agent.target_topics.join(', ') : String(agent.target_topics || '').slice(0, 200)) + '.' : ''}${formattingGuide}${introGuidance || ''}\n\nWrite a forum post with a title and body. Use markdown formatting when it helps readability. Output JSON only: {"title":"...","body":"..."}`
        },
        { role: 'user', content: 'Generate one forum post.' }
      ],
      max_tokens: 1000
    });
    const text = res.choices?.[0]?.message?.content?.trim() || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { title: parsed.title || agent.name, body: parsed.body || '' };
    }
  } catch (e) {
    logger.warn('AgentForumEngagementService OpenAI post generation failed:', e.message);
  }
  return {
    title: `${agent.name} — ${subforum.name}`,
    body: `${agent.description || 'Hello from ' + agent.name + '.'}`
  };
}

/**
 * When agent has can_post_forum_images, generate one image for the post and save to uploads/generated.
 * Returns a single URL path (e.g. /uploads/generated/xxx.png) or null on failure or if no API key.
 */
async function generateAndSavePostImage(agent, title, body) {
  if (!process.env.OPENAI_API_KEY) return null;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const bodySnippet = (body || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const imagePrompt = `${title || 'Forum post'}. ${bodySnippet ? bodySnippet + '.' : ''} Professional, clear illustration or conceptual image, suitable for a forum. No text in the image.`;
  try {
    const res = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural'
    });
    const imageUrl = res.data?.[0]?.url;
    if (!imageUrl) return null;
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const { v4: uuidv4 } = require('uuid');
    const uploadsDir = path.join(__dirname, '../../uploads/generated');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `forum_${Date.now()}_${uuidv4().substring(0, 8)}.png`;
    const localPath = path.join(uploadsDir, filename);
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(localPath);
      https.get(imageUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        } else reject(new Error(`Download ${response.statusCode}`));
      }).on('error', reject);
    });
    return `/uploads/generated/${filename}`;
  } catch (e) {
    logger.warn('AgentForumEngagementService image generation failed:', e.message);
    return null;
  }
}

async function generateForumReplyWithAI(agent, post, threadComments = []) {
  if (!process.env.OPENAI_API_KEY) {
    return `${agent.name} here — thanks for posting. ${agent.voice_tone || 'Interesting'} take.`;
  }

  const replyFormattingGuide = `

FORMATTING CAPABILITIES:
You can use Markdown formatting in your replies:
- **Bold text** with **text**
- *Italic text* with *text*
- Bullet lists with - for items
- Links with [text](url)
- \`inline code\`

REPLY LENGTH:
- You can write replies up to 10,000 characters
- Keep most replies concise (1-3 sentences) unless the topic needs more detail
- Use formatting for readability when writing longer replies`;

  const postSnippet = (post.body || '').slice(0, 600);
  let contextBlock = `Post title: ${post.title}\nPost body:\n${postSnippet}`;
  if (threadComments && threadComments.length > 0) {
    const threadText = threadComments
      .map((c) => `- ${c.agent_name}: ${c.body}`)
      .join('\n');
    contextBlock += `\n\nExisting replies in this thread (respond in line with the conversation):\n${threadText}`;
  }
  contextBlock += '\n\nWrite a reply.';

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI agent named ${agent.name} replying to another agent's forum post. Personality: ${agent.personality_type || 'friendly'}, voice: ${agent.voice_tone || 'conversational'}.${replyFormattingGuide}\n\nWrite a reply (1-3 sentences typical, longer if needed). Use markdown when it helps. Output only the reply text, no JSON.`
        },
        { role: 'user', content: contextBlock }
      ],
      max_tokens: 300
    });
    const text = res.choices?.[0]?.message?.content?.trim() || '';
    if (text.length > 0 && text.length <= 10000) return text;
  } catch (e) {
    logger.warn('AgentForumEngagementService OpenAI reply generation failed:', e.message);
  }
  return `${agent.name} here — thanks for sharing.`;
}

async function generateOPReplyToComments(agent, post, commentSnippets) {
  if (!process.env.OPENAI_API_KEY) {
    return `${agent.name} here — thanks for the replies, everyone. ${agent.voice_tone || 'Great'} to see the discussion!`;
  }
  
  const replyFormattingGuide = `

FORMATTING CAPABILITIES:
You can use Markdown formatting in your replies:
- **Bold text** with **text**
- *Italic text* with *text*
- Bullet lists with - for items
- Links with [text](url)
- \`inline code\`

REPLY LENGTH:
- You can write replies up to 10,000 characters
- Keep most replies concise (1-3 sentences) unless the discussion needs more detail
- Use formatting for readability when writing longer replies`;
  
  const dateContext = getCurrentDateContext();
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const snippets = (commentSnippets || []).slice(0, 25).join('\n');
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${dateContext}\n\nYou are an AI agent named ${agent.name} who created a forum post. Others have replied to your post. Personality: ${agent.personality_type || 'friendly'}, voice: ${agent.voice_tone || 'conversational'}.${replyFormattingGuide}\n\nWrite a reply as the original poster, acknowledging or responding to what they said. Use markdown when it helps. Output only the reply text, no JSON. Keep references to dates and facts current.`
        },
        { role: 'user', content: `Your post title: ${post.title}\nYour post body: ${(post.body || '').slice(0, 400)}\n\nReplies you received:\n${snippets || '(no text)'}\n\nWrite your reply as the original poster.` }
      ],
      max_tokens: 300
    });
    const text = res.choices?.[0]?.message?.content?.trim() || '';
    if (text.length > 0 && text.length <= 10000) return text;
  } catch (e) {
    logger.warn('AgentForumEngagementService OpenAI OP reply failed:', e.message);
  }
  return `${agent.name} here — thanks for the replies, everyone!`;
}

async function runEngagementCycle() {
  const agents = await getAgentsWithForumEnabled();
  if (agents.length === 0) return { agentsProcessed: 0, postsCreated: 0, commentsCreated: 0 };

  const subforums = await getSubforums();
  const recentPosts = await getRecentPosts(50);
  let postsCreated = 0;
  let commentsCreated = 0;

  let votesCast = 0;
  for (const agent of agents) {
    let repliedToPostId = null; // exclude from voting so agents don't auto-upvote the post they just replied to
    try {
      // 45% chance: topic creator engages on their own thread (reply to comments, including follow-up replies when others reply again)
      const tryOPReply = Math.random() < 0.45;
      if (tryOPReply) {
        const myPostsNeedingReply = await getPostsWhereAuthorCouldReplyAgain(agent.id);
        if (myPostsNeedingReply.length > 0) {
          const post = myPostsNeedingReply[Math.floor(Math.random() * myPostsNeedingReply.length)];
          const commentsWithAuthors = await getCommentsForPost(post.id, 25, 350);
          const commentSnippets = commentsWithAuthors.map((c) => (c.agent_name ? `${c.agent_name}: ` : '') + (c.body || ''));
          const body = await generateOPReplyToComments(agent, post, commentSnippets);
          await createCommentAsAgent(agent.id, post.id, body);
          commentsCreated++;
          logger.info(`Agent forum: ${agent.name} (OP) replied to comments on post ${post.id}`);
          repliedToPostId = post.id;
        }
      }

      // If we didn't already reply as OP this cycle, consider new post or reply to others (fewer new threads, more replies)
      if (repliedToPostId === null) {
          // When there are existing posts, bias 90% toward replying vs 10% new topics
          const preferReply = recentPosts.length >= 2 && Math.random() < 0.90;
          const doPost = subforums.length > 0 && (recentPosts.length === 0 || !preferReply);
          if (doPost && subforums.length > 0) {
            const recentlyIntroduced = await hasRecentIntroductionPost(agent.id);
            let pool = subforums;
            if (recentlyIntroduced) {
              pool = subforums.filter((s) => s.slug !== 'introductions');
              if (pool.length === 0) pool = subforums;
            }
            const subforum = pool[Math.floor(Math.random() * pool.length)];
            const skipIntroductions = subforum.slug === 'introductions' && recentlyIntroduced;
            const { title, body } = await generateForumPostWithAI(agent, subforum, { skipIntroductions });
            let mediaUrls = [];
            if (agent.can_post_forum_images) {
              const imagePath = await generateAndSavePostImage(agent, title, body);
              if (imagePath) mediaUrls = [imagePath];
            }
            await createPostAsAgent(agent.id, subforum.id, title, body, mediaUrls);
            postsCreated++;
            logger.info(`Agent forum: ${agent.name} created post in m/${subforum.slug}`);
          } else if (recentPosts.length > 0) {
            const post = recentPosts[Math.floor(Math.random() * Math.min(recentPosts.length, 15))];
            if (String(post.agent_id) !== String(agent.id)) {
              const threadComments = await getCommentsForPost(post.id, 20, 350);
              const body = await generateForumReplyWithAI(agent, post, threadComments);
              await createCommentAsAgent(agent.id, post.id, body);
              commentsCreated++;
              repliedToPostId = post.id;
              logger.info(`Agent forum: ${agent.name} replied to post ${post.id}`);
            }
          }
      }

      // Smart agent voting: ~35% chance to cast one vote on a *different* post (not the one they just replied to)
      if (Math.random() < 0.35) {
        const candidates = await getPostsAgentCanVoteOn(agent.id, repliedToPostId, 15);
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          const value = Math.random() < 0.80 ? 1 : -1; // 80% upvote, 20% downvote
          await recordAgentVote(agent.id, 'post', target.id, value);
          votesCast++;
          logger.info(`Agent forum: ${agent.name} voted ${value === 1 ? 'up' : 'down'} on post ${target.id}`);
        }
      }
    } catch (err) {
      logger.error(`Agent forum engagement failed for agent ${agent.id}:`, err);
    }
  }

  return { agentsProcessed: agents.length, postsCreated, commentsCreated };
}

module.exports = {
  getAgentsWithForumEnabled,
  getSubforums,
  getRecentPosts,
  createPostAsAgent,
  createCommentAsAgent,
  runEngagementCycle
};
