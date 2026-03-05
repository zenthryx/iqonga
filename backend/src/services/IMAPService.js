/**
 * IMAP Email Service
 * Handles email retrieval via generic IMAP protocol
 * Supports Gmail (via app password), Outlook, Yahoo, iCloud, and custom IMAP servers
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const crypto = require('crypto');
const logger = require('../utils/logger');
const database = require('../database/connection');

class IMAPService {
  constructor() {
    // Encryption key for passwords (should be in env)
    this.encryptionKey = process.env.EMAIL_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      logger.warn('EMAIL_ENCRYPTION_KEY not set or too short, using padded key');
      this.encryptionKey = (this.encryptionKey || 'default-key').padEnd(32, '0').slice(0, 32);
    }
  }

  /**
   * Encrypt password for storage
   */
  encryptPassword(password) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt password for use
   */
  decryptPassword(encryptedPassword) {
    try {
      const parts = encryptedPassword.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting password:', error);
      throw new Error('Failed to decrypt email password');
    }
  }

  /**
   * Test IMAP connection with provided credentials
   */
  async testConnection(config) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.email,
        password: config.password,
        host: config.imapHost,
        port: config.imapPort || 993,
        tls: config.imapSecure !== false,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 5000
      });

      const timeout = setTimeout(() => {
        imap.end();
        reject(new Error('Connection timeout'));
      }, 15000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        imap.end();
        resolve({ success: true, message: 'IMAP connection successful' });
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        logger.error('IMAP connection error:', err);
        reject(new Error(err.message || 'IMAP connection failed'));
      });

      imap.connect();
    });
  }

  /**
   * Add a new IMAP email account
   */
  async addAccount(userId, accountConfig) {
    try {
      // Test connection first
      await this.testConnection(accountConfig);

      // Encrypt password
      const encryptedPassword = this.encryptPassword(accountConfig.password);

      // Check if account already exists
      const existing = await database.query(
        'SELECT id FROM user_email_accounts WHERE user_id = $1 AND email_address = $2',
        [userId, accountConfig.email]
      );

      if (existing.rows.length > 0) {
        // Update existing account
        const result = await database.query(`
          UPDATE user_email_accounts SET
            provider = $1,
            connection_type = 'imap_smtp',
            imap_host = $2,
            imap_port = $3,
            imap_secure = $4,
            smtp_host = $5,
            smtp_port = $6,
            smtp_secure = $7,
            email_password_encrypted = $8,
            display_name = $9,
            connection_status = 'connected',
            is_active = true,
            last_connection_error = NULL,
            updated_at = NOW()
          WHERE user_id = $10 AND email_address = $11
          RETURNING *
        `, [
          accountConfig.provider || 'custom_imap',
          accountConfig.imapHost,
          accountConfig.imapPort || 993,
          accountConfig.imapSecure !== false,
          accountConfig.smtpHost,
          accountConfig.smtpPort || 587,
          accountConfig.smtpSecure !== false,
          encryptedPassword,
          accountConfig.displayName || accountConfig.email.split('@')[0],
          userId,
          accountConfig.email
        ]);

        return result.rows[0];
      }

      // Insert new account
      const result = await database.query(`
        INSERT INTO user_email_accounts (
          user_id, provider, connection_type, email_address,
          imap_host, imap_port, imap_secure,
          smtp_host, smtp_port, smtp_secure,
          email_password_encrypted, display_name,
          connection_status, is_active, access_token
        ) VALUES ($1, $2, 'imap_smtp', $3, $4, $5, $6, $7, $8, $9, $10, $11, 'connected', true, 'imap_smtp_account')
        RETURNING *
      `, [
        userId,
        accountConfig.provider || 'custom_imap',
        accountConfig.email,
        accountConfig.imapHost,
        accountConfig.imapPort || 993,
        accountConfig.imapSecure !== false,
        accountConfig.smtpHost,
        accountConfig.smtpPort || 587,
        accountConfig.smtpSecure !== false,
        encryptedPassword,
        accountConfig.displayName || accountConfig.email.split('@')[0]
      ]);

      logger.info(`Added IMAP account for user ${userId}: ${accountConfig.email}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding IMAP account:', error);
      throw error;
    }
  }

  /**
   * Get account credentials from database
   */
  async getAccountCredentials(accountId) {
    const result = await database.query(`
      SELECT * FROM user_email_accounts WHERE id = $1 AND connection_type = 'imap_smtp'
    `, [accountId]);

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }

    const account = result.rows[0];
    return {
      ...account,
      password: this.decryptPassword(account.email_password_encrypted)
    };
  }

  /**
   * Create IMAP connection for an account
   */
  async createConnection(accountId) {
    const account = await this.getAccountCredentials(accountId);
    
    return new Imap({
      user: account.email_address,
      password: account.password,
      host: account.imap_host,
      port: account.imap_port,
      tls: account.imap_secure,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 10000
    });
  }

  /**
   * Fetch emails from IMAP account
   */
  async fetchEmails(accountId, options = {}) {
    const {
      folder = 'INBOX',
      limit = 50,
      since = null,
      unseen = false,
      days = 30  // Default to last 30 days
    } = options;

    return new Promise(async (resolve, reject) => {
      try {
        const imap = await this.createConnection(accountId);
        const emails = [];

        imap.once('ready', () => {
          imap.openBox(folder, false, (err, box) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            // Build search criteria - default to recent emails
            let searchCriteria = [];
            
            // Calculate date for SINCE filter (default: last 30 days)
            const sinceDate = since || new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const formattedDate = sinceDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            
            searchCriteria.push(['SINCE', formattedDate]);
            
            if (unseen) {
              searchCriteria.push('UNSEEN');
            }

            logger.info(`IMAP search criteria: ${JSON.stringify(searchCriteria)} for folder ${folder}`);

            imap.search(searchCriteria, (err, results) => {
              if (err) {
                logger.error('IMAP search error:', err);
                imap.end();
                return reject(err);
              }

              logger.info(`IMAP search found ${results?.length || 0} emails`);

              if (!results || results.length === 0) {
                imap.end();
                return resolve([]);
              }

              // Get the most recent emails up to limit (higher UIDs are typically newer)
              const toFetch = results.slice(-limit);
              logger.info(`Fetching ${toFetch.length} email UIDs: ${toFetch.slice(0, 10).join(', ')}...`);
              
              const fetch = imap.fetch(toFetch, {
                bodies: '',
                struct: true,
                markSeen: false
              });

              // Track parsing promises to wait for all to complete
              const parsePromises = [];
              let messageCount = 0;

              fetch.on('message', (msg, seqno) => {
                messageCount++;
                let buffer = '';
                let uid = null;

                msg.on('body', (stream) => {
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });
                });

                msg.once('attributes', (attrs) => {
                  uid = attrs.uid;
                });

                // Create a promise for this email's parsing
                const parsePromise = new Promise((resolveEmail) => {
                  msg.once('end', async () => {
                    try {
                      if (buffer.length > 0) {
                        const parsed = await simpleParser(buffer);
                        emails.push({
                          uid,
                          seqno,
                          messageId: parsed.messageId,
                          subject: parsed.subject,
                          from: parsed.from?.value?.[0] || { address: 'unknown', name: 'Unknown' },
                          to: parsed.to?.value || [],
                          cc: parsed.cc?.value || [],
                          date: parsed.date,
                          text: parsed.text,
                          html: parsed.html,
                          snippet: (parsed.text || '').substring(0, 200),
                          attachments: (parsed.attachments || []).map(att => ({
                            filename: att.filename,
                            contentType: att.contentType,
                            size: att.size
                          })),
                          hasAttachments: (parsed.attachments || []).length > 0
                        });
                      }
                    } catch (parseError) {
                      logger.error(`Error parsing email ${uid}:`, parseError.message);
                    }
                    resolveEmail();
                  });
                });
                
                parsePromises.push(parsePromise);
              });

              fetch.once('error', (err) => {
                logger.error('IMAP fetch error:', err);
                imap.end();
                reject(err);
              });

              fetch.once('end', async () => {
                logger.info(`Fetch complete. Processing ${messageCount} messages, waiting for ${parsePromises.length} parse operations...`);
                
                // Wait for ALL email parsing to complete before resolving
                await Promise.all(parsePromises);
                
                logger.info(`All parsing complete. Got ${emails.length} emails.`);
                imap.end();
                
                // Sort by date descending
                emails.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(emails);
              });
            });
          });
        });

        imap.once('error', (err) => {
          logger.error('IMAP error:', err);
          reject(err);
        });

        imap.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fetch folders/mailboxes from IMAP account
   */
  async fetchFolders(accountId) {
    return new Promise(async (resolve, reject) => {
      try {
        const imap = await this.createConnection(accountId);

        imap.once('ready', () => {
          imap.getBoxes((err, boxes) => {
            imap.end();
            
            if (err) {
              return reject(err);
            }

            const folders = this._flattenFolders(boxes);
            resolve(folders);
          });
        });

        imap.once('error', (err) => {
          reject(err);
        });

        imap.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Helper to flatten folder structure
   */
  _flattenFolders(boxes, prefix = '') {
    let folders = [];
    
    for (const name in boxes) {
      const fullName = prefix ? `${prefix}/${name}` : name;
      folders.push({
        name: fullName,
        displayName: name,
        delimiter: boxes[name].delimiter,
        attribs: boxes[name].attribs || []
      });

      if (boxes[name].children) {
        folders = folders.concat(this._flattenFolders(boxes[name].children, fullName));
      }
    }

    return folders;
  }

  /**
   * Mark email as read
   */
  async markAsRead(accountId, uid) {
    return this._modifyFlags(accountId, uid, ['\\Seen'], 'add');
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(accountId, uid) {
    return this._modifyFlags(accountId, uid, ['\\Seen'], 'remove');
  }

  /**
   * Star/flag an email
   */
  async starEmail(accountId, uid) {
    return this._modifyFlags(accountId, uid, ['\\Flagged'], 'add');
  }

  /**
   * Unstar/unflag an email
   */
  async unstarEmail(accountId, uid) {
    return this._modifyFlags(accountId, uid, ['\\Flagged'], 'remove');
  }

  /**
   * Helper to modify email flags
   */
  async _modifyFlags(accountId, uid, flags, action) {
    return new Promise(async (resolve, reject) => {
      try {
        const imap = await this.createConnection(accountId);

        imap.once('ready', () => {
          imap.openBox('INBOX', false, (err) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            const method = action === 'add' ? 'addFlags' : 'delFlags';
            imap[method](uid, flags, (err) => {
              imap.end();
              if (err) {
                return reject(err);
              }
              resolve({ success: true });
            });
          });
        });

        imap.once('error', reject);
        imap.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Delete/move email to trash
   */
  async deleteEmail(accountId, uid) {
    return new Promise(async (resolve, reject) => {
      try {
        const imap = await this.createConnection(accountId);

        imap.once('ready', () => {
          imap.openBox('INBOX', false, (err) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            // Try to move to Trash, or just mark as deleted
            imap.move(uid, 'Trash', (err) => {
              if (err) {
                // Fallback: mark as deleted
                imap.addFlags(uid, ['\\Deleted'], (err) => {
                  imap.end();
                  if (err) return reject(err);
                  resolve({ success: true, method: 'flagged' });
                });
              } else {
                imap.end();
                resolve({ success: true, method: 'moved' });
              }
            });
          });
        });

        imap.once('error', reject);
        imap.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Sync emails to database
   */
  async syncToDatabase(userId, accountId, emails) {
    const synced = [];

    for (const email of emails) {
      try {
        const result = await database.query(`
          INSERT INTO email_messages (
            account_id, user_id, provider_message_id, thread_id,
            subject, from_email, from_name, to_emails, cc_emails,
            body_text, body_html, snippet, received_at,
            has_attachments, attachment_count, is_read
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false)
          ON CONFLICT (account_id, provider_message_id) 
          DO UPDATE SET updated_at = NOW()
          RETURNING id
        `, [
          accountId,
          userId,
          email.messageId || `uid-${email.uid}`,
          email.messageId, // Use messageId as thread_id for now
          email.subject,
          email.from?.address,
          email.from?.name,
          email.to?.map(t => t.address) || [],
          email.cc?.map(c => c.address) || [],
          email.text,
          email.html,
          email.snippet,
          email.date,
          email.hasAttachments,
          email.attachments?.length || 0
        ]);

        synced.push(result.rows[0]);
      } catch (error) {
        logger.error(`Error syncing email ${email.messageId}:`, error);
      }
    }

    // Update last sync time
    await database.query(
      'UPDATE user_email_accounts SET last_sync_at = NOW(), last_imap_check_at = NOW() WHERE id = $1',
      [accountId]
    );

    return synced;
  }

  /**
   * Get provider presets
   */
  async getProviderPresets() {
    const result = await database.query(
      'SELECT * FROM email_provider_presets WHERE is_active = true ORDER BY display_name'
    );
    return result.rows;
  }
}

module.exports = new IMAPService();

