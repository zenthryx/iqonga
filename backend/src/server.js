const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const database = require('./database/connection');
const { engagementJobProcessor } = require('./services/JobProcessor');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize Twitter client with OAuth 2.0 credentials
const { TwitterApi } = require('twitter-api-v2');
const twitterClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});



const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for production (behind Nginx)
app.set('trust proxy', 1);

// Initialize database connection on startup
async function initializeDatabase() {
  try {
    await database.connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Don't exit in production, let the app run without DB for now
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Initialize database
initializeDatabase();

// Middleware – CSP allows images from self and same-origin; no forum-only domains in open source
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'img-src': [
        "'self'",
        'data:',
        'https://www.iqonga.org',
        'https://iqonga.org',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
      ],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'https://iqonga.org',
      'https://www.iqonga.org',
      'https://demo.iqonga.org',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['*'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(204).send();
});

app.use(express.json({ limit: '100mb' })); // Increased for character image uploads (up to 10 images)
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(morgan('combined'));

// Serve widget files from frontend public directory
app.use('/widget', express.static(path.join(__dirname, '../../Frontend/public/widget')));

// Rate limiting with proper proxy trust (skip for our own read-heavy APIs: agent-forums, agent-city)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 to prevent blocking legitimate users
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = (req.originalUrl || req.url || '').split('?')[0];
    return path.startsWith('/api/agent-forums') || path.startsWith('/api/agent-city');
  },
});
app.use('/api/', limiter);

// Health check with database status and job processor status
app.get('/health', async (req, res) => {
  const dbHealthy = await database.isHealthy();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: database.isConnected,
      healthy: dbHealthy,
      connectionInfo: database.getConnectionInfo()
    },
    jobProcessor: {
      running: engagementJobProcessor.isRunning
    }
  });
});



// Auth middleware - supports both JWT and Privy tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token (works for both wallet and Privy auth)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check for Privy user ID or regular user ID
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }
    
    const userResult = await database.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        walletAddress: req.user.wallet_address,
        username: req.user.username,
        email: req.user.email
      }
    }
  });
});

// **EMAIL/PASSWORD AUTHENTICATION ROUTES**
// Add email/password auth routes (supplements wallet auth)
try {
  const authEmailRoutes = require('./routes/auth-email');
  app.use('/api/auth', authEmailRoutes);
  console.log('✅ Email/Password authentication routes loaded successfully');
} catch (e) {
  console.log('❌ Email/Password authentication routes not available:', e.message);
}

// POST /api/auth/refresh - Refresh JWT token (email-code auth only for v1)
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  try {
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Static file serving for uploads (must match backend/uploads, not backend/src/uploads)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Import and use existing routes
try {
  const agentRoutes = require('./routes/agents');
  app.use('/api/agents', agentRoutes);
  console.log('✅ Agents route loaded successfully');
} catch (e) {
  console.log('❌ Agents route not available:', e.message);
}

try {
  const workflowRoutes = require('./routes/workflows');
  app.use('/api/workflows', workflowRoutes);
  console.log('✅ Workflows route loaded successfully');
} catch (e) {
  console.log('❌ Workflows route not available:', e.message);
}

try {
  const agentTeamsRoutes = require('./routes/agentTeams');
  app.use('/api/agent-teams', agentTeamsRoutes);
  console.log('✅ Agent teams route loaded successfully');
} catch (e) {
  console.log('❌ Agent teams route not available:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const agentForumsRoutes = require('./routes/agentForums');
//   app.use('/api/agent-forums', agentForumsRoutes);
//   console.log('✅ Agent Forums route loaded successfully');
// } catch (e) {
//   console.log('❌ Agent Forums route not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const agentCityRoutes = require('./routes/agentCity');
//   app.use('/api/agent-city', agentCityRoutes);
//   console.log('✅ Agent City route loaded successfully');
// } catch (e) {
//   console.log('❌ Agent City route not available:', e.message);
// }

try {
  const twitterRoutes = require('./routes/twitter');
  app.use('/api/twitter', twitterRoutes);
  console.log('✅ Twitter route loaded successfully');
} catch (e) {
  console.log('❌ Twitter route not available:', e.message);
}

try {
  const contentRoutes = require('./routes/content');
  app.use('/api/content', contentRoutes);
  console.log('✅ Content routes loaded successfully');
  // Also serve music files from /api/uploads/music/generated/ for frontend compatibility
  // Add CORS headers for static music files
  app.use('/api/uploads/music/generated', (req, res, next) => {
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      return res.status(204).end();
    }
    
    // Set CORS headers for actual requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Accept-Ranges', 'bytes');
    next();
  }, express.static(path.join(__dirname, '../uploads/music/generated')));
  
  // Also serve music video files from /api/uploads/videos/music-videos/ for frontend compatibility
  // Add CORS headers for static music video files
  app.use('/api/uploads/videos/music-videos', (req, res, next) => {
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      return res.status(204).end();
    }
    
    // Set CORS headers for actual requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Accept-Ranges', 'bytes');
    next();
  }, express.static(path.join(__dirname, '../uploads/videos/music-videos')));
  
  // Serve eBook cover images from /api/uploads/ebook-covers/
  app.use('/api/uploads/ebook-covers', express.static(path.join(__dirname, '../uploads/ebook-covers')));
  
  // Serve eBook chapter images from /api/uploads/ebook-images/
  app.use('/api/uploads/ebook-images', express.static(path.join(__dirname, '../uploads/ebook-images')));
  
  // Serve eBook export files from /api/uploads/ebook-exports/
  app.use('/api/uploads/ebook-exports', express.static(path.join(__dirname, '../uploads/ebook-exports')));
  
  console.log('✅ Content route loaded successfully');
} catch (e) {
  console.log('❌ Content route not available:', e.message);
  console.error('Content route error details:', e.stack);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const contentSeriesRoutes = require('./routes/contentSeries');
//   app.use('/api/content-series', contentSeriesRoutes);
//   console.log('✅ Content Series routes loaded successfully');
// } catch (e) {
//   console.log('❌ Content Series routes not available:', e.message);
// }

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✅ Users route loaded successfully');
} catch (e) {
  console.log('❌ Users route not available:', e.message);
}

try {
  const scheduledPostsRoutes = require('./routes/scheduledPosts');
  app.use('/api/scheduled-posts', scheduledPostsRoutes);
  console.log('✅ Scheduled posts route loaded successfully');
} catch (e) {
  console.log('❌ Scheduled posts route not available:', e.message);
}

try {
  const companyRoutes = require('./routes/company');
  app.use('/api/company', companyRoutes);
  console.log('✅ Company routes loaded successfully');
} catch (e) {
  console.log('❌ Company routes not available:', e.message);
}

try {
  const customDataRoutes = require('./routes/customData');
  app.use('/api/custom-data', customDataRoutes);
  console.log('✅ Custom data routes loaded successfully');
} catch (e) {
  console.log('❌ Custom data routes not available:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const creditRoutes = require('./routes/credits');
//   app.use('/api/credits', creditRoutes);
//   console.log('✅ Credit routes loaded successfully');
// } catch (e) {
//   console.log('❌ Credit routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const paymentRoutes = require('./routes/payments');
//   app.use('/api/payments', paymentRoutes);
//   console.log('✅ Payment routes loaded successfully');
// } catch (e) {
//   console.log('❌ Payment routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const twitterAnalyticsRoutes = require('./routes/twitterAnalytics');
//   app.use('/api/twitter-analytics', twitterAnalyticsRoutes);
//   console.log('✅ Twitter analytics routes loaded successfully');
// } catch (e) {
//   console.log('❌ Twitter analytics routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const referralRoutes = require('./routes/referrals');
//   app.use('/api/referrals', referralRoutes);
//   console.log('✅ Referral routes loaded successfully');
// } catch (e) {
//   console.log('❌ Referral routes not available:', e.message);
// }

// Media routes (Iqonga: keep minimal)
try {
  const mediaRoutes = require('./routes/media');
  app.use('/api/media', mediaRoutes);
  console.log('✅ Media routes loaded successfully');
  // --- Iqonga Phase 1: characters disabled ---
  // try {
  //   const characterRoutes = require('./routes/characters');
  //   app.use('/api/characters', characterRoutes);
  //   console.log('✅ Character routes loaded successfully');
  // } catch (e) {
  //   console.log('❌ Character routes not available:', e.message);
  // }
} catch (e) {
  console.log('❌ Media routes not available:', e.message);
}

// Telegram routes
try {
  const telegramRoutes = require('./routes/telegram');
  app.use('/api/telegram', telegramRoutes);
  console.log('✅ Telegram routes loaded successfully');
} catch (e) {
  console.log('❌ Telegram routes not available:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const telegramWebhookRoutes = require('./routes/telegramWebhook');
//   app.use('/api/telegram-webhook', telegramWebhookRoutes);
//   console.log('✅ Telegram webhook routes loaded successfully');
// } catch (e) {
//   console.log('❌ Telegram webhook routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const webhookRoutes = require('./routes/webhooks');
//   app.use('/api/webhooks', webhookRoutes);
//   console.log('✅ Webhooks routes loaded successfully');
// } catch (e) {
//   console.log('❌ Webhooks routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const telegramEngagementRoutes = require('./routes/telegramEngagement');
//   app.use('/api/telegram-engagement', telegramEngagementRoutes);
//   console.log('✅ Telegram engagement routes loaded successfully');
// } catch (e) {
//   console.log('❌ Telegram engagement routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const tokenAccessRoutes = require('./routes/tokenAccess');
//   app.use('/api/token-access', tokenAccessRoutes);
//   console.log('✅ Token access routes loaded successfully');
// } catch (e) {
//   console.log('❌ Token access routes not available:', e.message);
// }

// Widget routes
try {
  const widgetRoutes = require('./routes/widget');
  app.use('/api/widget', widgetRoutes);
  console.log('✅ Widget routes loaded successfully');
} catch (e) {
  console.log('❌ Widget routes not available:', e.message);
  console.error('Widget routes error details:', e);
}

// Admin routes
try {
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes loaded successfully');
} catch (e) {
  console.log('❌ Admin routes not available:', e.message);
  console.error('Admin routes error details:', e);
  console.error('Admin routes error stack:', e.stack);
}

// Voice routes
try {
  const voiceRoutes = require('./routes/voice');
  app.use('/api/voice', voiceRoutes);
  console.log('✅ Voice routes loaded successfully');
} catch (e) {
  console.log('❌ Voice routes not available:', e.message);
}

// Analytics routes (server-side tracking) - MUST be before WordPress routes to avoid conflict
try {
  const analyticsRoutes = require('./routes/analytics');
  app.use('/api/analytics', analyticsRoutes);
  console.log('✅ Analytics routes loaded successfully');
} catch (e) {
  console.error('❌ Analytics routes failed:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const externalApiRoutes = require('./routes/externalApi');
//   app.use('/api/v1/external', externalApiRoutes);
//   console.log('✅ External API routes loaded successfully');
// } catch (e) {
//   console.error('❌ External API routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const externalForumApiKeysRoutes = require('./routes/externalForumApiKeys');
//   app.use('/api', externalForumApiKeysRoutes);
//   console.log('✅ External Forum API Key routes loaded successfully');
// } catch (e) {
//   console.error('❌ External Forum API Key routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const wordpressRoutes = require('./routes/wordpress');
//   app.use('/api', wordpressRoutes);
//   console.log('✅ WordPress plugin routes loaded successfully');
// } catch (e) {
//   console.log('❌ WordPress routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const woocommerceRoutes = require('./routes/woocommerce');
//   app.use('/api/woocommerce', woocommerceRoutes);
//   console.log('✅ WooCommerce integration routes loaded successfully');
// } catch (e) {
//   console.log('❌ WooCommerce routes not available:', e.message);
// }

// API key management routes
try {
  const apiKeyRoutes = require('./routes/apiKeys');
  app.use('/api', apiKeyRoutes);
  console.log('✅ API key routes loaded successfully');
} catch (e) {
  console.log('❌ API key routes not available:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const instagramRoutes = require('./routes/instagram');
//   app.use('/api/instagram', instagramRoutes);
//   console.log('✅ Instagram routes loaded successfully');
//   const metaRoutes = require('./routes/meta');
//   app.use('/api/meta', metaRoutes);
//   console.log('✅ Meta routes loaded successfully');
// } catch (e) {
//   console.log('❌ Instagram routes not available:', e.message);
// }

// (Voice routes already loaded above - duplicate removed)

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const discordRoutes = require('./routes/discord');
//   app.use('/api/discord', discordRoutes);
//   console.log('✅ Discord routes loaded successfully');
// } catch (e) {
//   console.log('❌ Discord routes not available:', e.message);
// }

// Gmail AI routes (MUST BE FIRST - more specific route)
try {
  const gmailAIRoutes = require('./routes/gmailAI');
  app.use('/api/gmail/ai', gmailAIRoutes);
  console.log('✅ Gmail AI routes loaded successfully');
} catch (e) {
  console.log('❌ Gmail AI routes not available:', e.message);
}

// Gmail OAuth routes
try {
  const gmailOAuthRoutes = require('./routes/gmailOAuth');
  app.use('/api/gmail', gmailOAuthRoutes);
  console.log('✅ Gmail OAuth routes loaded successfully');
} catch (e) {
  console.log('❌ Gmail OAuth routes not available:', e.message);
}

// Gmail integration routes (general routes LAST)
try {
  const gmailRoutes = require('./routes/gmail');
  app.use('/api/gmail', gmailRoutes);
  console.log('✅ Gmail routes loaded successfully');
} catch (e) {
  console.log('❌ Gmail routes not available:', e.message);
}

// Gmail Actions routes (Archive, Star, Mark Read)
try {
  const gmailActionsRoutes = require('./routes/gmailActions');
  app.use('/api/gmail/actions', gmailActionsRoutes);
  console.log('✅ Gmail Actions routes loaded successfully');
} catch (e) {
  console.log('❌ Gmail Actions routes not available:', e.message);
}

// Email Connections routes (IMAP/SMTP support)
try {
  const emailConnectionsRoutes = require('./routes/emailConnections');
  app.use('/api/email-connections', emailConnectionsRoutes);
  console.log('✅ Email Connections (IMAP/SMTP) routes loaded successfully');
} catch (e) {
  console.log('❌ Email Connections routes not available:', e.message);
}

// Google Calendar OAuth routes
try {
  const calendarOAuthRoutes = require('./routes/calendarOAuth');
  app.use('/api/calendar', calendarOAuthRoutes);
  console.log('✅ Calendar OAuth routes loaded successfully');
} catch (e) {
  console.log('❌ Calendar OAuth routes not available:', e.message);
}

// Google Calendar integration routes
try {
  const calendarRoutes = require('./routes/calendar');
  app.use('/api/calendar', calendarRoutes);
  console.log('✅ Calendar routes loaded successfully');
} catch (e) {
  console.log('❌ Calendar routes not available:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const meetingPrepRoutes = require('./routes/meetingPrep');
//   app.use('/api/meeting-prep', meetingPrepRoutes);
//   console.log('✅ AI Meeting Prep routes loaded successfully');
// } catch (e) {
//   console.log('❌ AI Meeting Prep routes not available:', e.message);
// }

// Reminder Settings routes
try {
  const reminderSettingsRoutes = require('./routes/reminderSettings');
  app.use('/api/reminder-settings', reminderSettingsRoutes);
  console.log('✅ Reminder Settings routes loaded successfully');
} catch (e) {
  console.log('❌ Reminder Settings routes not available:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const smartSchedulingRoutes = require('./routes/smartScheduling');
//   app.use('/api/smart-scheduling', smartSchedulingRoutes);
//   console.log('✅ Smart Scheduling routes loaded successfully');
// } catch (e) {
//   console.log('❌ Smart Scheduling routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const shopifyRoutes = require('./routes/shopify');
//   app.use('/api/shopify', shopifyRoutes);
//   console.log('✅ Shopify routes loaded successfully');
// } catch (e) {
//   console.log('❌ Shopify routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const shopifyOAuthRoutes = require('./routes/shopifyOAuth');
//   app.use('/api/shopify', shopifyOAuthRoutes);
//   console.log('✅ Shopify OAuth routes loaded successfully');
// } catch (e) {
//   console.log('❌ Shopify OAuth routes not available:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const youtubeRoutes = require('./routes/youtube');
//   app.use('/api/youtube', youtubeRoutes);
//   console.log('✅ YouTube routes loaded successfully');
// } catch (e) {
//   console.log('❌ YouTube routes not available:', e.message);
// }

// Google Drive: stub status for Settings (full route disabled for Phase 1)
app.get('/api/google-drive/status', authenticateToken, (req, res) => {
  res.json({ connected: false });
});

// Dashboard routes
try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✅ Dashboard routes loaded successfully');
} catch (e) {
  console.error('❌ Dashboard routes failed:', e.message);
}

// Translation routes
try {
  const translationRoutes = require('./routes/translation');
  app.use('/api/translation', translationRoutes);
  console.log('✅ Translation routes loaded successfully');
} catch (e) {
  console.error('❌ Translation routes failed:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const smartAdsRoutes = require('./routes/smartAds');
//   app.use('/api/smart-ads', smartAdsRoutes);
//   console.log('✅ Smart Ads routes loaded successfully');
// } catch (e) {
//   console.error('❌ Smart Ads routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const smartCampaignsRoutes = require('./routes/smartCampaigns');
//   app.use('/api/smart-campaigns', smartCampaignsRoutes);
//   console.log('✅ Smart Campaigns routes loaded successfully');
// } catch (e) {
//   console.error('❌ Smart Campaigns routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const manualCampaignsRoutes = require('./routes/manualCampaigns');
//   app.use('/api/manual-campaigns', manualCampaignsRoutes);
//   console.log('✅ Manual Campaign Builder routes loaded successfully');
// } catch (e) {
//   console.error('❌ Manual Campaign Builder routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const whiteboardsRoutes = require('./routes/whiteboards');
//   app.use('/api/whiteboards', whiteboardsRoutes);
//   console.log('✅ Whiteboard routes loaded successfully');
// } catch (e) {
//   console.error('❌ Whiteboard routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const influencersRoutes = require('./routes/influencers');
//   app.use('/api/influencers', influencersRoutes);
//   console.log('✅ Influencer Marketing routes loaded successfully');
// } catch (e) {
//   console.error('❌ Influencer Marketing routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const cryptoRoutes = require('./routes/crypto');
//   app.use('/api/crypto', cryptoRoutes);
//   console.log('✅ Crypto Intelligence routes loaded successfully');
// } catch (e) {
//   console.error('❌ Crypto Intelligence routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const keywordIntelligenceRoutes = require('./routes/keywordIntelligence');
//   app.use('/api/keyword-intelligence', keywordIntelligenceRoutes);
//   console.log('✅ Keyword & Hashtag Intelligence routes loaded successfully');
// } catch (e) {
//   console.error('❌ Keyword & Hashtag Intelligence routes failed:', e.message);
// }

// Chat & Messaging routes
try {
  const chatRoutes = require('./routes/chat');
  app.use('/api/chat', chatRoutes);
  console.log('✅ Chat & Messaging routes loaded successfully');
} catch (e) {
  console.error('❌ Chat & Messaging routes failed:', e.message);
}

// AI Assistant: channel connections (authenticated) and webhook (no auth)
try {
  const assistantConnectionsRoutes = require('./routes/assistantConnections');
  app.use('/api/assistant/connections', assistantConnectionsRoutes);
  const assistantWebhookRoutes = require('./routes/assistantWebhook');
  app.use('/api/assistant-webhook', assistantWebhookRoutes);
  console.log('✅ AI Assistant routes loaded successfully');
} catch (e) {
  console.error('❌ AI Assistant routes failed:', e.message);
}

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const whatsappRoutes = require('./routes/whatsapp');
//   app.use('/api/whatsapp', whatsappRoutes);
//   console.log('✅ WhatsApp Business API routes loaded successfully');
// } catch (e) {
//   console.error('❌ WhatsApp Business API routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const whatsappWebhookRoutes = require('./routes/whatsappWebhook');
//   app.use('/api/whatsapp', whatsappWebhookRoutes);
//   console.log('✅ WhatsApp Webhook routes loaded successfully');
// } catch (e) {
//   console.error('❌ WhatsApp Webhook routes failed:', e.message);
// }

// --- Iqonga Phase 1: Sales & CRM routes (disabled) ---
// try {
//   const leadsRoutes = require('./routes/leads');
//   app.use('/api/leads', leadsRoutes);
//   console.log('✅ Leads routes loaded successfully');
// } catch (e) {
//   console.error('❌ Leads routes failed:', e.message);
// }
// try {
//   const pipelineRoutes = require('./routes/pipeline');
//   app.use('/api/pipeline', pipelineRoutes);
//   console.log('✅ Pipeline routes loaded successfully');
// } catch (e) {
//   console.error('❌ Pipeline routes failed:', e.message);
// }
// try {
//   const activitiesRoutes = require('./routes/activities');
//   app.use('/api/activities', activitiesRoutes);
//   console.log('✅ Activities routes loaded successfully');
// } catch (e) {
//   console.error('❌ Activities routes failed:', e.message);
// }
// try {
//   const salesEmailRoutes = require('./routes/salesEmail');
//   app.use('/api/sales-email', salesEmailRoutes);
//   console.log('✅ Sales Email routes loaded successfully');
// } catch (e) {
//   console.error('❌ Sales Email routes failed:', e.message);
// }
// try {
//   const salesAnalyticsRoutes = require('./routes/salesAnalytics');
//   app.use('/api/sales-analytics', salesAnalyticsRoutes);
//   console.log('✅ Sales Analytics routes loaded successfully');
// } catch (e) {
//   console.error('❌ Sales Analytics routes failed:', e.message);
// }
// try {
//   const meetingSchedulerRoutes = require('./routes/meetingScheduler');
//   app.use('/api/meeting-scheduler', meetingSchedulerRoutes);
//   console.log('✅ Meeting Scheduler routes loaded successfully');
// } catch (e) {
//   console.error('❌ Meeting Scheduler routes failed:', e.message);
// }
// try {
//   const leadScoringRoutes = require('./routes/leadScoring');
//   app.use('/api/lead-scoring', leadScoringRoutes);
//   console.log('✅ Lead Scoring routes loaded successfully');
// } catch (e) {
//   console.error('❌ Lead Scoring routes failed:', e.message);
// }
// try {
//   const bulkActionsRoutes = require('./routes/bulkActions');
//   app.use('/api/bulk-actions', bulkActionsRoutes);
//   console.log('✅ Bulk Actions routes loaded successfully');
// } catch (e) {
//   console.error('❌ Bulk Actions routes failed:', e.message);
// }
// try {
//   const salesCadencesRoutes = require('./routes/salesCadences');
//   app.use('/api/sales-cadences', salesCadencesRoutes);
//   console.log('✅ Sales Cadences routes loaded successfully');
// } catch (e) {
//   console.error('❌ Sales Cadences routes failed:', e.message);
// }
// try {
//   const visitorIntelligenceRoutes = require('./routes/visitorIntelligence');
//   app.use('/api/visitor-intelligence', visitorIntelligenceRoutes);
//   console.log('✅ Visitor Intelligence routes loaded successfully');
// } catch (e) {
//   console.error('❌ Visitor Intelligence routes failed:', e.message);
// }
// try {
//   const proxyRoutes = require('./routes/proxy');
//   app.use('/api/proxy', proxyRoutes);
//   console.log('✅ Proxy routes loaded successfully');
// } catch (e) {
//   console.error('❌ Proxy routes failed:', e.message);
// }

// --- Iqonga Phase 1: solution route (disabled) ---
// try {
//   const brandBookRoutes = require('./routes/brandBook');
//   app.use('/api/brand-book', brandBookRoutes);
//   console.log('✅ Brand Book routes loaded successfully');
// } catch (e) {
//   console.error('❌ Brand Book routes failed:', e.message);
// }
// try {
//   const brandExtractionRoutes = require('./routes/brandExtraction');
//   app.use('/api/brand-extraction', brandExtractionRoutes);
//   console.log('✅ Brand Extraction routes loaded successfully');
// } catch (e) {
//   console.error('❌ Brand Extraction routes failed:', e.message);
// }
// try {
//   const canvaRoutes = require('./routes/canva');
//   app.use('/api/canva', canvaRoutes);
//   console.log('✅ Canva Integration routes loaded successfully');
// } catch (e) {
//   console.error('❌ Canva Integration routes failed:', e.message);
// }
// try {
//   const templateAdsRoutes = require('./routes/templateAds');
//   app.use('/api/template-ads', templateAdsRoutes);
//   console.log('✅ Template Ads routes loaded successfully');
// } catch (e) {
//   console.error('❌ Template Ads routes failed:', e.message);
// }
// try {
//   const productImagesRoutes = require('./routes/productImages');
//   app.use('/api/product-images', productImagesRoutes);
//   console.log('✅ Product Images routes loaded successfully');
// } catch (e) {
//   console.error('❌ Product Images routes failed:', e.message);
// }
// try {
//   const userImagesRoutes = require('./routes/userImages');
//   app.use('/api/user-images', userImagesRoutes);
//   console.log('✅ User Images routes loaded successfully');
// } catch (e) {
//   console.error('❌ User Images routes failed:', e.message);
// }
// try {
//   const aiImageEditorRoutes = require('./routes/aiImageEditor');
//   app.use('/api/ai-image-editor', aiImageEditorRoutes);
//   console.log('✅ AI Image Editor routes loaded successfully');
// } catch (e) {
//   console.error('❌ AI Image Editor routes failed:', e.message);
// }

// Test route to verify callback is working
app.get('/test-twitter-callback', (req, res) => {
  console.log('Test Twitter callback route hit!');
  res.json({ message: 'Test Twitter callback working', query: req.query });
});





app.get('/api/auth/status', (req, res) => {
  res.json({ message: 'Auth endpoint working', status: 'ok' });
});

// Sitemap route (at root, not /api)
try {
  const sitemapRoutes = require('./routes/sitemap');
  app.use('/', sitemapRoutes);
  console.log('✅ Sitemap routes loaded successfully');
} catch (e) {
  console.error('❌ Sitemap routes failed:', e.message);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to database first
    await database.connect();
    console.log('✅ Database connected successfully');
    
    // Log all registered routes for debugging
    console.log('🔍 Registered routes:');
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        console.log(`  ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
      }
    });
    
    // Create HTTP server for WebSocket support
    const http = require('http');
    const httpServer = http.createServer(app);
    
    // Initialize WebSocket server for Voice chat
    const WebSocketServer = require('./websocket/WebSocketServer');
    const wsServer = new WebSocketServer(httpServer);
    
    // Initialize Chat WebSocket server
    try {
      const ChatServer = require('./websocket/ChatServer');
      const chatServer = new ChatServer(httpServer);
      console.log('💬 Chat WebSocket server initialized');
    } catch (error) {
      console.error('❌ Chat WebSocket server failed to initialize:', error.message);
    }
    
    // Initialize Keyword Intelligence WebSocket server
    let keywordWsServer = null;
    try {
      const KeywordIntelligenceServer = require('./websocket/KeywordIntelligenceServer');
      keywordWsServer = new KeywordIntelligenceServer(httpServer);
      console.log('🔍 Keyword Intelligence WebSocket server initialized');
    } catch (error) {
      console.error('❌ Keyword Intelligence WebSocket server failed to initialize:', error.message);
    }
    
    // Start server
    httpServer.listen(PORT, async () => {
      console.log(`🚀 SocialAI Backend server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: Connected and ready`);
      console.log(`🐦 Twitter callback: http://localhost:${PORT}/api/auth/twitter/callback`);
      console.log(`🔊 WebSocket voice chat: ws://localhost:${PORT}/ws/voice-chat`);
      console.log(`💬 WebSocket chat: ws://localhost:${PORT}/socket.io/chat`);
      console.log(`🔍 WebSocket keyword intelligence: ws://localhost:${PORT}/socket.io/keyword-intelligence`);
      
      // Iqonga v1: only scheduled content delivery job
      try {
        await engagementJobProcessor.start();
        console.log('⏰ Iqonga scheduled content job started');
      } catch (error) {
        console.error('❌ Scheduled content job failed to start:', error.message);
      }

      // Workflow scheduler (cron-triggered workflows)
      try {
        const WorkflowScheduler = require('./services/WorkflowScheduler');
        WorkflowScheduler.start();
        console.log('⏰ Workflow scheduler started');
      } catch (error) {
        console.error('❌ Workflow scheduler failed to start:', error.message);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
// Handle unhandled promise rejections (e.g., Redis adapter errors)
// Set this up early to catch Redis adapter errors silently
process.on('unhandledRejection', (reason, promise) => {
  // Silently ignore Redis client closed errors - this is expected when Redis disconnects
  // Socket.io will automatically fall back to in-memory mode
  if (reason && reason.message && reason.message.includes('The client is closed')) {
    return; // Silently ignore
  }
  
  // Log other unhandled rejections as errors
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    const WorkflowScheduler = require('./services/WorkflowScheduler');
    WorkflowScheduler.stop();
  } catch (_) {}
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    const WorkflowScheduler = require('./services/WorkflowScheduler');
    WorkflowScheduler.stop();
  } catch (_) {}
  await database.disconnect();
  process.exit(0);
});

startServer();

module.exports = app;
