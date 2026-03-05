/**
 * AssistantToolRegistry – Tool definitions (OpenAI function format) and handlers for AI Assistant.
 * Handlers use connection.user_id and loaded agent; only tools in enabled_tool_categories are exposed.
 */

const { v4: uuidv4 } = require('uuid');
const GmailService = require('./GmailService');
const GoogleCalendarService = require('./GoogleCalendarService');
const AIContentService = require('./AIContentService');
const SerperApiService = require('./SerperApiService');
const AlphaVantageService = require('./AlphaVantageService');
const BinanceService = require('./BinanceService');
const TradeSignalService = require('./TradeSignalService');
const CompanyKnowledgeService = require('./CompanyKnowledgeService');
const MusicGenerationService = require('./MusicGenerationService');
const GeminiService = require('./GeminiService');
const SchedulerService = require('./SchedulerService');
const database = require('../database/connection');
const logger = require('../utils/logger');

/** True if symbol looks like a forex pair (e.g. EURUSD, GBPUSD, USDJPY) — 6 letters, no USDT. */
function isForexSymbol(symbol) {
  const s = String(symbol).trim().toUpperCase().replace('/', '');
  return /^[A-Z]{6}$/.test(s) && !s.endsWith('USDT');
}

/** Parse EURUSD or EUR/USD into { from: 'EUR', to: 'USD' }. */
function parseForexPair(symbol) {
  const s = String(symbol).trim().toUpperCase().replace('/', '');
  if (s.length !== 6) return null;
  return { from: s.slice(0, 3), to: s.slice(3, 6) };
}

/** Get pivot points for forex from Alpha Vantage (daily only). Returns same shape as getPivotPoints. */
async function getForexPivotPoints(symbol) {
  const pair = parseForexPair(symbol);
  if (!pair || !AlphaVantageService.isAvailable()) return null;
  try {
    const data = await AlphaVantageService.getFxDaily(pair.from, pair.to, 'compact');
    if (!data || !data.series || data.series.length < 2) return null;
    const lastClosed = data.series[1] || data.series[0];
    const high = parseFloat(lastClosed.high);
    const low = parseFloat(lastClosed.low);
    const close = parseFloat(lastClosed.close);
    const pp = (high + low + close) / 3;
    const range = high - low;
    const r1 = pp * 2 - low;
    const r2 = pp + range;
    const s1 = pp * 2 - high;
    const s2 = pp - range;
    return {
      symbol: `${pair.from}/${pair.to}`,
      timeframe: '1d',
      high,
      low,
      close,
      pp: Math.round(pp * 100000) / 100000,
      r1: Math.round(r1 * 100000) / 100000,
      r2: Math.round(r2 * 100000) / 100000,
      s1: Math.round(s1 * 100000) / 100000,
      s2: Math.round(s2 * 100000) / 100000
    };
  } catch (e) {
    logger.warn('[AssistantToolRegistry] getForexPivotPoints failed:', symbol, e.message);
    return null;
  }
}

const DEFAULT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_emails',
      description: 'Read or list the user\'s emails. Use when the user asks to check email, inbox, unread, or summarize messages. Optionally filter by limit (default 10).',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Max number of emails to return (default 10)', default: 10 },
          unread_only: { type: 'boolean', description: 'If true, only return unread emails', default: false }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email from the user\'s connected Gmail account. Use only when the user explicitly asks you to send (or confirms sending) an email.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body (plain text or simple HTML)' },
          cc: { type: 'string', description: 'Optional CC recipients (comma-separated)' },
          bcc: { type: 'string', description: 'Optional BCC recipients (comma-separated)' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar_events',
      description: 'Get the user\'s upcoming calendar events. Use when the user asks what\'s on their calendar, what meetings they have, or schedule for today/this week.',
      parameters: {
        type: 'object',
        properties: {
          days_ahead: { type: 'integer', description: 'Number of days ahead to look (default 7)', default: 7 },
          limit: { type: 'integer', description: 'Max events to return (default 15)', default: 15 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new Google Calendar event in the user\'s primary calendar. Use only when the user explicitly asks you to book/schedule a meeting (or confirms scheduling). IMPORTANT: Use the current date from the system prompt. start_time and end_time must be in the future and in ISO 8601 format (e.g. 2026-02-19T11:30:00Z). When the user says "Friday" use the upcoming Friday from today\'s date.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Event title/summary' },
          start_time: { type: 'string', description: 'Start datetime in ISO 8601 (e.g. 2026-02-19T11:30:00Z). Must be in the future; use current year from system prompt.' },
          end_time: { type: 'string', description: 'End datetime in ISO 8601 (e.g. 2026-02-19T12:00:00Z)' },
          time_zone: { type: 'string', description: 'IANA timezone (e.g. Europe/London). Default UTC.' },
          description: { type: 'string', description: 'Optional description/notes' },
          location: { type: 'string', description: 'Optional location' },
          attendees: {
            type: 'array',
            description: 'Optional list of attendee email addresses',
            items: { type: 'string' }
          },
          add_google_meet: { type: 'boolean', description: 'If true, create a Google Meet link', default: false }
        },
        required: ['summary', 'start_time', 'end_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'draft_content',
      description: 'Draft text content (e.g. social post, tweet, short paragraph). Use when the user asks to write a post, draft something, or create content. Do not publish; return the draft only.',
      parameters: {
        type: 'object',
        properties: {
          content_type: { type: 'string', enum: ['tweet', 'post', 'email', 'short_paragraph'], description: 'Type of content to draft' },
          topic: { type: 'string', description: 'Topic or brief for the content' }
        },
        required: ['content_type', 'topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate an image from a text description. Use when the user asks to create, generate, or design an image (e.g. logo, illustration, marketing visual).',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed description of the image to generate' }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information. Use when the user asks about live data, prices, timetables, weather, news, or anything that needs up-to-date or real-world information (e.g. train times, flight prices, hotel availability, opening hours).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g. "London to Manchester train prices today", "weather London")' },
          num: { type: 'integer', description: 'Max number of results to return (default 5)', default: 5 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_scheduled_posts',
      description: 'List the user\'s scheduled social media posts. Use when the user asks what posts are scheduled, when is the next post, or to list upcoming posts.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Max posts to return (default 10)', default: 10 },
          platform: { type: 'string', description: 'Filter by platform: twitter, telegram, etc. Optional.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'schedule_post',
      description: 'Schedule a social media post for the user. Use when the user asks to schedule a post, post later, or set a reminder to post. Requires agent to have the platform connected.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['twitter', 'telegram'], description: 'Platform to post to' },
          content_text: { type: 'string', description: 'The post content/text' },
          scheduled_time: { type: 'string', description: 'When to post, ISO 8601 (e.g. 2026-02-20T14:00:00Z)' },
          content_type: { type: 'string', description: 'e.g. tweet, post', default: 'tweet' }
        },
        required: ['platform', 'content_text', 'scheduled_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Search the user\'s company knowledge base (profile, products, documents). Use when the user asks about company info, products, or content from their uploaded documents.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search topic or question' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_lyrics',
      description: 'Generate song lyrics. Use when the user asks to write lyrics, a song, or verses.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic or theme for the lyrics' },
          genre: { type: 'string', description: 'e.g. pop, rock, hip-hop', default: 'pop' },
          mood: { type: 'string', description: 'e.g. energetic, calm', default: 'energetic' }
        },
        required: ['topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_music',
      description: 'Start music generation from a prompt. Use when the user asks to create or generate music. Generation may take a minute; user gets a link when ready.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description of the music to generate' },
          duration: { type: 'integer', description: 'Duration in seconds (default 30)', default: 30 },
          style: { type: 'string', description: 'e.g. pop, cinematic', default: 'pop' }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_video_script',
      description: 'Generate a video script and storyboard (no actual video file). Use when the user asks for a video idea, script, or storyboard.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Video concept or idea' },
          duration: { type: 'integer', description: 'Duration in seconds (default 5)', default: 5 }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_long_form',
      description: 'Generate long-form content (blog, article, newsletter). Use when the user asks for a blog post, article, or long piece.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic for the content' },
          content_type: { type: 'string', enum: ['blog', 'article', 'newsletter', 'substack'], description: 'Type of long-form', default: 'blog' },
          target_word_count: { type: 'integer', description: 'Approximate word count (default 1000)', default: 1000 }
        },
        required: ['topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location. Use when the user asks about weather.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name or "London, UK"' },
          latitude: { type: 'number', description: 'Optional latitude (if known)' },
          longitude: { type: 'number', description: 'Optional longitude (if known)' }
        },
        required: ['location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_stock_quote',
      description: 'Get latest stock quote (price, volume, change). Use for stocks like AAPL, MSFT.',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Stock ticker (e.g. AAPL, IBM)' } },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_forex_rate',
      description: 'Get realtime forex or crypto exchange rate (e.g. EUR/USD, BTC/USD).',
      parameters: {
        type: 'object',
        properties: {
          from_currency: { type: 'string', description: 'Base currency (e.g. EUR, USD, BTC)' },
          to_currency: { type: 'string', description: 'Quote currency (e.g. USD, JPY)' }
        },
        required: ['from_currency', 'to_currency']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_stock_daily',
      description: 'Get recent daily OHLCV for a stock (open, high, low, close, volume).',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Stock ticker' },
          outputsize: { type: 'string', enum: ['compact', 'full'], description: 'compact = last 100 days', default: 'compact' }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_technical_indicator',
      description: 'Get technical indicator for a symbol (RSI, SMA, MACD). Use for trading/analysis.',
      parameters: {
        type: 'object',
        properties: {
          indicator: { type: 'string', enum: ['RSI', 'SMA', 'EMA', 'MACD'], description: 'Indicator name' },
          symbol: { type: 'string', description: 'Stock ticker or FX pair base (e.g. AAPL, EUR)' },
          interval: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'Time interval', default: 'daily' },
          time_period: { type: 'integer', description: 'Period for RSI/SMA/EMA (e.g. 14)', default: 14 }
        },
        required: ['indicator', 'symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_symbol',
      description: 'Search for stock/ETF symbols by keyword (e.g. company name).',
      parameters: {
        type: 'object',
        properties: { keywords: { type: 'string', description: 'Search term (e.g. Apple, Tesla)' } },
        required: ['keywords']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_crypto_candles',
      description: 'Get recent OHLCV candles for a crypto pair (Binance spot). Use for BTC, ETH, etc. Intervals: 15m, 1h, 4h, 1d.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Trading pair (e.g. BTCUSDT, ETHUSDT)' },
          interval: { type: 'string', enum: ['15m', '1h', '4h', '1d'], description: 'Candle interval', default: '1h' },
          limit: { type: 'integer', description: 'Number of candles (default 20, max 100)', default: 20 }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_trade_signal',
      description: 'Check for a trade setup (RSI-based) on a crypto pair and timeframe. Returns a signal (direction, entry, SL, target) or indicates no trade for that timeframe.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Crypto pair (e.g. BTCUSDT)' },
          timeframe: { type: 'string', enum: ['15m', '1h', '4h', '1d'], description: 'Timeframe to check', default: '4h' }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_crypto_price',
      description: 'Get the latest (real-time) price for a crypto pair from Binance. Use when the user asks for current price, latest price, or "what is BTC at".',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Trading pair (e.g. BTCUSDT, ETHUSDT)' } },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_pivot_points',
      description: 'Get classic pivot points (PP, R1, R2, S1, S2). Crypto (e.g. BTCUSDT): Binance, timeframes 15m/1h/4h/1d. Forex (e.g. EURUSD): Alpha Vantage, daily only.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Crypto pair (e.g. BTCUSDT)' },
          timeframe: { type: 'string', enum: ['15m', '1h', '4h', '1d'], description: 'Chart timeframe', default: '4h' }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_crypto_rsi',
      description: 'Get current RSI (14-period) for a crypto pair and timeframe from Binance. Use for BTC, ETH, SOL, etc. on 15m, 1h, 4h or 1d chart. Do NOT use get_technical_indicator for crypto—use this tool.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Crypto pair (e.g. BTCUSDT, SOLUSDT)' },
          timeframe: { type: 'string', enum: ['15m', '1h', '4h', '1d'], description: 'Chart timeframe', default: '4h' }
        },
        required: ['symbol']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_crypto_trend',
      description: 'Get current price and last 30 days trend (high, low, up/down/sideways) for a crypto pair from Binance. Use for "long-term trend" or "current trend" so all numbers are from the same source and consistent.',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Crypto pair (e.g. BTCUSDT)' } },
        required: ['symbol']
      }
    }
  }
];

const TOOL_CATEGORY_MAP = {
  email: ['read_emails', 'send_email'],
  calendar: ['get_calendar_events', 'create_calendar_event'],
  content_draft: ['draft_content'],
  image: ['generate_image'],
  web_search: ['web_search'],
  scheduled_posts: ['list_scheduled_posts', 'schedule_post'],
  company_knowledge: ['search_knowledge'],
  music_lyrics: ['generate_lyrics', 'generate_music'],
  video: ['generate_video_script'],
  long_form: ['generate_long_form'],
  weather: ['get_weather'],
  market_data: ['get_stock_quote', 'get_forex_rate', 'get_stock_daily', 'get_technical_indicator', 'search_symbol', 'get_crypto_candles', 'get_trade_signal', 'get_crypto_price', 'get_pivot_points', 'get_crypto_rsi', 'get_crypto_trend']
};

class AssistantToolRegistry {
  /**
   * Get OpenAI-compatible tool definitions for this connection.
   * If enabled_tool_categories is empty or includes all, return all; otherwise filter.
   */
  getToolsForConnection(connection) {
    const enabled = connection.enabled_tool_categories || [];
    if (Array.isArray(enabled) && enabled.length === 0) {
      return DEFAULT_TOOLS;
    }
    const allowedNames = new Set();
    for (const cat of enabled) {
      const names = TOOL_CATEGORY_MAP[cat];
      if (names) names.forEach(n => allowedNames.add(n));
    }
    if (allowedNames.size === 0) return DEFAULT_TOOLS;
    return DEFAULT_TOOLS.filter(t => t.function && allowedNames.has(t.function.name));
  }

  /**
   * Run one tool by name; returns string result for the LLM.
   */
  async runTool(toolName, args, context) {
    const { userId, agent } = context;
    try {
      switch (toolName) {
        case 'read_emails': {
          const limit = Math.min(Number(args?.limit) || 10, 20);
          const isRead = args?.unread_only ? false : null;
          const result = await GmailService.getMessages(userId, { limit, page: 1, isRead: isRead ?? undefined });
          const messages = result.messages || [];
          if (messages.length === 0) return 'No emails found (or no Gmail account connected).';
          const summary = messages.slice(0, limit).map(m => `From: ${m.from_email || '?'} | Subject: ${m.subject || '(no subject)'} | ${m.is_read ? 'Read' : 'Unread'}`).join('\n');
          return `Emails (${result.total} total):\n${summary}`;
        }
        case 'send_email': {
          const to = String(args?.to || '').trim();
          const subject = String(args?.subject || '').trim();
          const body = String(args?.body || '').trim();
          const cc = args?.cc ? String(args.cc).trim() : undefined;
          const bcc = args?.bcc ? String(args.bcc).trim() : undefined;
          if (!to || !subject || !body) return 'send_email requires: to, subject, body.';
          const sent = await GmailService.sendEmail(userId, { to, subject, body, cc, bcc });
          return `Email sent to ${to}. Message id: ${sent?.id || 'unknown'}.`;
        }
        case 'get_calendar_events': {
          const daysAhead = Math.min(Number(args?.days_ahead) || 7, 30);
          const limit = Math.min(Number(args?.limit) || 15, 30);
          const events = await GoogleCalendarService.getUpcomingEvents(userId, { daysAhead, limit });
          if (!events || events.length === 0) return 'No upcoming calendar events (or no calendar connected).';
          const lines = events.map(e => `${e.start_time} - ${e.summary || 'No title'}${e.location ? ` @ ${e.location}` : ''}`).join('\n');
          return `Upcoming events:\n${lines}`;
        }
        case 'create_calendar_event': {
          const summary = String(args?.summary || '').trim();
          const startTime = String(args?.start_time || '').trim();
          const endTime = String(args?.end_time || '').trim();
          const timeZone = args?.time_zone ? String(args.time_zone).trim() : 'UTC';
          const description = args?.description ? String(args.description) : '';
          const location = args?.location ? String(args.location) : '';
          const attendeesArr = Array.isArray(args?.attendees) ? args.attendees : [];
          const attendees = attendeesArr
            .map(x => String(x || '').trim())
            .filter(Boolean)
            .map(email => ({ email }));
          const addGoogleMeet = !!args?.add_google_meet;
          if (!summary || !startTime || !endTime) return 'create_calendar_event requires: summary, start_time, end_time.';
          const startDate = new Date(startTime);
          if (Number.isNaN(startDate.getTime())) return 'Invalid start_time format. Use ISO 8601 (e.g. 2026-02-19T11:30:00Z).';
          const now = new Date();
          if (startDate.getTime() < now.getTime() - 60000) {
            return `Cannot create event: start time is in the past (${startTime}). Please use the current date. Today is ${now.toISOString().slice(0, 10)}. Ask the user to confirm the intended date and time.`;
          }
          const created = await GoogleCalendarService.createEvent(userId, {
            summary,
            startTime,
            endTime,
            timeZone,
            description,
            location,
            attendees,
            conferenceData: addGoogleMeet
          });
          const link = created?.htmlLink || created?.html_link || '';
          const meet = created?.hangoutLink || created?.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || '';
          return `Calendar event created. ${link ? `Link: ${link}` : ''}${meet ? ` Meet: ${meet}` : ''}`.trim();
        }
        case 'draft_content': {
          const contentType = args?.content_type || 'post';
          const topic = args?.topic || 'general';
          const result = await AIContentService.generateContent(agent, {
            content_type: contentType === 'short_paragraph' ? 'post' : contentType,
            topic,
            length: 'short'
          });
          return (result && result.content) ? `Draft:\n${result.content}` : 'Could not generate draft.';
        }
        case 'generate_image': {
          const prompt = args?.prompt || 'abstract image';
          const result = await AIContentService.generateImageForAgent(agent, prompt, { size: '1024x1024' });
          if (result && result.url) return `Image generated: ${result.url}`;
          return 'Image generation failed.';
        }
        case 'web_search': {
          const query = args?.query || '';
          const num = Math.min(Number(args?.num) || 5, 10);
          if (!query.trim()) return 'Web search requires a query.';
          const result = await SerperApiService.search({ query: query.trim(), num, language: 'en' });
          const parts = [];
          if (result.answerBox?.answer) parts.push(`Answer: ${result.answerBox.answer}`);
          if (result.organic?.length) {
            const snippets = result.organic.slice(0, num).map(o => `• ${o.title}: ${o.snippet || ''} (${o.link})`).join('\n');
            parts.push(`Results:\n${snippets}`);
          }
          if (parts.length === 0) return 'No results found for that search.';
          return parts.join('\n\n');
        }
        case 'list_scheduled_posts': {
          const limit = Math.min(Number(args?.limit) || 10, 30);
          const platform = args?.platform ? String(args.platform) : null;
          let q = 'SELECT id, platform, content_type, content_text, scheduled_time, next_run, status FROM scheduled_posts WHERE user_id = $1';
          const params = [userId];
          if (platform) { params.push(platform); q += ' AND platform = $2'; }
          params.push(limit);
          q += ' ORDER BY scheduled_time ASC LIMIT $' + params.length;
          const rows = await database.query(q, params);
          if (!rows.rows.length) return 'No scheduled posts.';
          const lines = rows.rows.map(r => `${r.scheduled_time} | ${r.platform} | ${(r.content_text || '').slice(0, 60)}... | ${r.status}`);
          return `Scheduled posts:\n${lines.join('\n')}`;
        }
        case 'schedule_post': {
          const platform = String(args?.platform || 'twitter').toLowerCase();
          const contentText = String(args?.content_text || '').trim();
          const scheduledTime = String(args?.scheduled_time || '').trim();
          const contentType = String(args?.content_type || 'tweet').trim();
          if (!contentText || !scheduledTime) return 'schedule_post requires: platform, content_text, scheduled_time.';
          const st = new Date(scheduledTime);
          if (Number.isNaN(st.getTime())) return 'Invalid scheduled_time; use ISO 8601.';
          const agentId = agent?.id;
          if (!agentId) return 'Agent not found.';
          const nextRun = st;
          const id = uuidv4();
          await database.query(`
            INSERT INTO scheduled_posts (id, agent_id, user_id, platform, content_type, content_text, scheduled_time, timezone, frequency, next_run, max_runs)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'UTC', 'once', $8, 1)
          `, [id, agentId, userId, platform, contentType, contentText, scheduledTime, nextRun]);
          const row = { id, agent_id: agentId, scheduled_time: scheduledTime, frequency: 'once', frequency_config: null, status: 'active', platform, content_text: contentText };
          try { SchedulerService.getInstance().addScheduledPost(row); } catch (e) { logger.warn('Scheduler addScheduledPost:', e); }
          return `Scheduled post for ${scheduledTime} on ${platform}. ID: ${id}.`;
        }
        case 'search_knowledge': {
          const query = String(args?.query || '').trim();
          if (!query) return 'search_knowledge requires a query.';
          const knowledgeService = new CompanyKnowledgeService();
          const result = await knowledgeService.getRelevantContent(userId, query);
          const parts = [];
          if (result.profile) parts.push(`Company: ${result.profile.company_description || ''} ${result.profile.brand_voice || ''}`);
          if (result.products?.length) parts.push('Products: ' + result.products.map(p => p.name + ': ' + (p.description || '').slice(0, 100)).join('; '));
          if (result.documents?.length) parts.push('Documents: ' + result.documents.map(d => (d.title || '') + ': ' + (d.summary || d.content || '').slice(0, 150)).join('; '));
          if (parts.length === 0) return 'No company knowledge found for that query.';
          return parts.join('\n\n');
        }
        case 'generate_lyrics': {
          const topic = String(args?.topic || '').trim();
          const genre = String(args?.genre || 'pop').trim();
          const mood = String(args?.mood || 'energetic').trim();
          if (!topic) return 'generate_lyrics requires topic.';
          const out = await AIContentService.generateLyrics({ topic, genre, mood }, userId, agent);
          const text = (out && (out.lyrics || out.content || out.text)) ? (out.lyrics || out.content || out.text) : (typeof out === 'string' ? out : '');
          return text ? `Lyrics:\n${text}` : 'Could not generate lyrics.';
        }
        case 'generate_music': {
          const prompt = String(args?.prompt || '').trim();
          const duration = Math.min(Math.max(Number(args?.duration) || 30, 10), 120);
          const style = String(args?.style || 'pop').trim();
          if (!prompt) return 'generate_music requires prompt.';
          const musicSvc = new MusicGenerationService();
          if (!musicSvc.isAvailable()) return 'Music generation is not configured (no API key).';
          const result = await musicSvc.generateMusic(prompt, { duration, style });
          const url = result?.audioUrl || result?.url || result?.audio_url;
          const taskId = result?.taskId || result?.id;
          if (url) return `Music generated: ${url}`;
          if (taskId) return `Music generation started (task ${taskId}). You will get a link when it is ready.`;
          return 'Music generation started; you will be notified when ready.';
        }
        case 'generate_video_script': {
          const prompt = String(args?.prompt || '').trim();
          const duration = Math.min(Number(args?.duration) || 5, 30);
          if (!prompt) return 'generate_video_script requires prompt.';
          if (!GeminiService.isAvailable()) return 'Video script generation (Gemini) is not configured.';
          const result = await GeminiService.generateVideo(prompt, { duration, userId });
          const script = result?.videoScript || result?.scriptText || '';
          const storyboard = result?.storyboard || result?.storyboardText || '';
          if (script || storyboard) return `Video script:\n${script}\n\nStoryboard:\n${storyboard}`.trim();
          return 'Could not generate video script.';
        }
        case 'generate_long_form': {
          const topic = String(args?.topic || '').trim();
          const contentType = String(args?.content_type || 'blog').trim();
          const targetWordCount = Math.min(Number(args?.target_word_count) || 1000, 5000);
          if (!topic) return 'generate_long_form requires topic.';
          const result = await AIContentService.generateLongFormContent(agent, { topic, content_type: contentType, target_word_count: targetWordCount });
          const title = result?.title || '';
          const content = result?.content || result?.body || '';
          if (content) return `Title: ${title}\n\n${content.slice(0, 8000)}${content.length > 8000 ? '...' : ''}`;
          return 'Could not generate long-form content.';
        }
        case 'get_weather': {
          const location = String(args?.location || '').trim();
          let lat = args?.latitude;
          let lon = args?.longitude;
          if (!location && (lat == null || lon == null)) return 'get_weather requires location or latitude/longitude.';
          if ((lat == null || lon == null) && location) {
            const axios = require('axios');
            const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`, { timeout: 5000 });
            const first = geoRes.data?.results?.[0];
            if (first) { lat = first.latitude; lon = first.longitude; } else { lat = 51.5; lon = -0.1; }
          }
          const axios = require('axios');
          const res = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`, { timeout: 5000 });
          const c = res.data?.current_weather;
          if (!c) return 'Weather not available for that location.';
          const temp = c.temperature;
          const code = c.weathercode;
          const desc = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Fog', 51: 'Drizzle', 61: 'Rain', 71: 'Snow', 80: 'Rain showers', 95: 'Thunderstorm' }[code] || 'Unknown';
          return `Weather: ${temp}°C, ${desc}. (${location || `${lat},${lon}`})`;
        }
        case 'get_stock_quote': {
          if (!AlphaVantageService.isAvailable()) return 'Market data is not configured (missing ALPHA_VANTAGE_API_KEY).';
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          if (!symbol) return 'get_stock_quote requires symbol.';
          try {
            const q = await AlphaVantageService.getGlobalQuote(symbol);
            if (!q) return `No quote found for ${symbol}.`;
            const ch = q.changePercent != null ? ` ${q.changePercent}` : '';
            return `${q.symbol}: $${q.price}${ch ? `, change ${ch}` : ''}${q.volume != null ? `, vol ${q.volume}` : ''}`;
          } catch (e) {
            return `Quote failed: ${e.message}`;
          }
        }
        case 'get_forex_rate': {
          if (!AlphaVantageService.isAvailable()) return 'Market data is not configured (missing ALPHA_VANTAGE_API_KEY).';
          const from = String(args?.from_currency || '').trim().toUpperCase();
          const to = String(args?.to_currency || '').trim().toUpperCase();
          if (!from || !to) return 'get_forex_rate requires from_currency and to_currency.';
          try {
            const r = await AlphaVantageService.getCurrencyExchangeRate(from, to);
            if (!r) return `No rate found for ${from}/${to}.`;
            return `${r.from}/${r.to}: ${r.rate} (as of ${r.lastUpdate || 'realtime'})`;
          } catch (e) {
            return `Forex rate failed: ${e.message}`;
          }
        }
        case 'get_stock_daily': {
          if (!AlphaVantageService.isAvailable()) return 'Market data is not configured (missing ALPHA_VANTAGE_API_KEY).';
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          const outputsize = args?.outputsize === 'full' ? 'full' : 'compact';
          if (!symbol) return 'get_stock_daily requires symbol.';
          try {
            const out = await AlphaVantageService.getTimeSeriesDaily(symbol, outputsize);
            if (!out || !out.series?.length) return `No daily data for ${symbol}.`;
            const lines = out.series.slice(0, 5).map(s => `${s.date}: O ${s.open} H ${s.high} L ${s.low} C ${s.close} Vol ${s.volume || '-'}`).join('\n');
            return `${out.symbol} (last ${out.series.length} days):\n${lines}`;
          } catch (e) {
            return `Daily series failed: ${e.message}`;
          }
        }
        case 'get_technical_indicator': {
          if (!AlphaVantageService.isAvailable()) return 'Market data is not configured (missing ALPHA_VANTAGE_API_KEY).';
          const indicator = String(args?.indicator || 'RSI').toUpperCase();
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          const interval = (args?.interval || 'daily').toLowerCase();
          const timePeriod = args?.time_period != null ? Number(args.time_period) : 14;
          if (!symbol) return 'get_technical_indicator requires symbol.';
          try {
            const out = await AlphaVantageService.getTechnicalIndicator(indicator, symbol, interval, { time_period: timePeriod });
            if (!out || !out.values?.length) return `No ${indicator} data for ${symbol}.`;
            const lines = out.values.slice(0, 5).map(v => {
              const vals = Object.entries(v).filter(([k]) => k !== 'date').map(([k, val]) => `${k}: ${val}`).join(', ');
              return `${v.date}: ${vals}`;
            }).join('\n');
            return `${out.symbol} ${indicator} (${interval}):\n${lines}`;
          } catch (e) {
            return `Technical indicator failed: ${e.message}`;
          }
        }
        case 'search_symbol': {
          if (!AlphaVantageService.isAvailable()) return 'Market data is not configured (missing ALPHA_VANTAGE_API_KEY).';
          const keywords = String(args?.keywords || '').trim();
          if (!keywords) return 'search_symbol requires keywords.';
          try {
            const matches = await AlphaVantageService.symbolSearch(keywords);
            if (!matches.length) return `No symbols found for "${keywords}".`;
            const lines = matches.map(m => `${m.symbol}: ${m.name} (${m.type || ''} ${m.region || ''})`.trim()).join('\n');
            return `Symbols:\n${lines}`;
          } catch (e) {
            return `Symbol search failed: ${e.message}`;
          }
        }
        case 'get_crypto_candles': {
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          const interval = ['15m', '1h', '4h', '1d'].includes(String(args?.interval || '1h').toLowerCase()) ? String(args.interval).toLowerCase() : '1h';
          const limit = Math.min(Math.max(Number(args?.limit) || 20, 1), 100);
          if (!symbol) return 'get_crypto_candles requires symbol (e.g. BTCUSDT).';
          try {
            const out = await BinanceService.getKlines(symbol, interval, limit);
            if (!out || !out.candles?.length) return `No candle data for ${symbol} ${interval}.`;
            const lines = out.candles.slice(0, 10).map(c => `${c.time.slice(0, 16)} O ${c.open} H ${c.high} L ${c.low} C ${c.close} Vol ${c.volume || '-'}`).join('\n');
            return `${out.symbol} ${out.interval} (${out.candles.length} candles):\n${lines}`;
          } catch (e) {
            return `Crypto candles failed: ${e.message}`;
          }
        }
        case 'get_trade_signal': {
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          const timeframe = ['15m', '1h', '4h', '1d'].includes(String(args?.timeframe || '4h').toLowerCase()) ? String(args?.timeframe || '4h').toLowerCase() : '4h';
          if (!symbol) return 'get_trade_signal requires symbol (e.g. BTCUSDT).';
          try {
            const s = await TradeSignalService.getSignal(symbol, timeframe);
            if (!s.hasSignal) return `No trade setup for ${symbol} ${timeframe}.`;
            return `${s.symbol} ${s.timeframe}: ${s.direction.toUpperCase()} | Entry ${s.entry} | SL ${s.sl} | Target ${s.target} | R:R ${s.rr} | RSI ${s.rsi} (${s.confidence})`;
          } catch (e) {
            return `Trade signal check failed: ${e.message}`;
          }
        }
        case 'get_crypto_price': {
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          if (!symbol) return 'get_crypto_price requires symbol (e.g. BTCUSDT).';
          try {
            const out = await BinanceService.getTickerPrice(symbol);
            if (!out) return `No price for ${symbol}.`;
            return `${out.symbol} latest price: ${out.price}`;
          } catch (e) {
            return `Crypto price failed: ${e.message}`;
          }
        }
        case 'get_pivot_points': {
          const rawSymbol = String(args?.symbol || '').trim();
          const symbol = rawSymbol.toUpperCase().replace('/', '');
          const timeframe = ['15m', '1h', '4h', '1d'].includes(String(args?.timeframe || '4h').toLowerCase()) ? String(args?.timeframe || '4h').toLowerCase() : '4h';
          if (!symbol) return 'get_pivot_points requires symbol (e.g. BTCUSDT for crypto, EURUSD for forex).';
          try {
            if (isForexSymbol(symbol)) {
              const out = await getForexPivotPoints(symbol);
              if (!out) return `No pivot data for ${symbol} (forex daily). Check ALPHA_VANTAGE_API_KEY and pair (e.g. EURUSD).`;
              return `${out.symbol} ${out.timeframe} pivot (last closed day H ${out.high} L ${out.low} C ${out.close}): PP ${out.pp} | R1 ${out.r1} R2 ${out.r2} | S1 ${out.s1} S2 ${out.s2}`;
            }
            const out = await TradeSignalService.getPivotPoints(symbol, timeframe);
            if (!out) return `No pivot data for ${symbol} ${timeframe}.`;
            return `${out.symbol} ${out.timeframe} pivot (last closed candle H ${out.high} L ${out.low} C ${out.close}): PP ${out.pp} | R1 ${out.r1} R2 ${out.r2} | S1 ${out.s1} S2 ${out.s2}`;
          } catch (e) {
            return `Pivot points failed: ${e.message}`;
          }
        }
        case 'get_crypto_rsi': {
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          const timeframe = ['15m', '1h', '4h', '1d'].includes(String(args?.timeframe || '4h').toLowerCase()) ? String(args?.timeframe || '4h').toLowerCase() : '4h';
          if (!symbol) return 'get_crypto_rsi requires symbol (e.g. BTCUSDT, SOLUSDT).';
          try {
            const out = await TradeSignalService.getRsi(symbol, timeframe);
            if (!out) return `No RSI data for ${symbol} ${timeframe}.`;
            return `${out.symbol} ${out.timeframe} RSI(14): ${out.rsi}`;
          } catch (e) {
            return `Crypto RSI failed: ${e.message}`;
          }
        }
        case 'get_crypto_trend': {
          const symbol = String(args?.symbol || '').trim().toUpperCase();
          if (!symbol) return 'get_crypto_trend requires symbol (e.g. BTCUSDT).';
          try {
            const out = await TradeSignalService.getCryptoTrend(symbol);
            if (!out) return `No trend data for ${symbol}.`;
            return `${out.symbol} current ${out.currentPrice} | last 30d high ${out.last30dHigh} low ${out.last30dLow} | trend ${out.trend} (close ${out.firstClose} → ${out.lastClose})`;
          } catch (e) {
            return `Crypto trend failed: ${e.message}`;
          }
        }
        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (err) {
      logger.error(`AssistantToolRegistry runTool ${toolName} failed:`, err);
      return `Error running ${toolName}: ${err.message}`;
    }
  }
}

module.exports = AssistantToolRegistry;
