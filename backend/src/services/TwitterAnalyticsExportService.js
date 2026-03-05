const fs = require('fs').promises;
const path = require('path');
const database = require('../database/connection');
const TwitterAnalyticsService = require('./TwitterAnalyticsService');

/**
 * Service for exporting Twitter analytics data to CSV and PDF
 */
class TwitterAnalyticsExportService {
  constructor() {
    this.analyticsService = new TwitterAnalyticsService();
    this.exportsDir = path.join(__dirname, '../../exports/twitter-analytics');
    this._ensureExportsDir();
  }

  async _ensureExportsDir() {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create exports directory:', error);
    }
  }

  /**
   * Export overview data to CSV
   */
  async exportToCSV(userId, exportType = 'full', dateRange = null) {
    try {
      let data = [];
      let filename = 'twitter-analytics';

      if (exportType === 'overview' || exportType === 'full') {
        const overview = await this.analyticsService.getOverview(userId);
        data.push({
          Type: 'Overview',
          Username: overview.username,
          'Follower Count': overview.followerCount,
          'Total Tweets': overview.totalTweets,
          'Total Impressions': overview.impressions,
          'Engagement Rate (%)': overview.engagementRate,
          'Best Hour (UTC)': overview.bestHourLabel,
        });
        filename += '-overview';
      }

      if (exportType === 'posts' || exportType === 'full') {
        const posts = await this.analyticsService.getTopPosts(userId, 100);
        posts.forEach((post, index) => {
          data.push({
            Type: 'Post',
            Rank: index + 1,
            'Tweet ID': post.id,
            Text: post.text.substring(0, 100) + (post.text.length > 100 ? '...' : ''),
            'Created At': post.created_at,
            Likes: post.metrics.like_count || 0,
            Retweets: post.metrics.retweet_count || 0,
            Replies: post.metrics.reply_count || 0,
            Impressions: post.metrics.impression_count || 0,
            Score: post.score,
          });
        });
        filename += '-posts';
      }

      if (exportType === 'mentions' || exportType === 'full') {
        const mentions = await this.analyticsService.getMentions(userId, 100);
        mentions.forEach((mention, index) => {
          data.push({
            Type: 'Mention',
            Rank: index + 1,
            'Tweet ID': mention.id,
            Text: mention.text.substring(0, 100) + (mention.text.length > 100 ? '...' : ''),
            'Created At': mention.created_at,
            Likes: mention.metrics.like_count || 0,
            Retweets: mention.metrics.retweet_count || 0,
            Replies: mention.metrics.reply_count || 0,
          });
        });
        filename += '-mentions';
      }

      if (exportType === 'historical' || exportType === 'full') {
        const historical = await this.analyticsService.getHistoricalData(userId, dateRange?.days || 30);
        historical.forEach((snapshot) => {
          data.push({
            Type: 'Historical',
            Date: snapshot.snapshot_date,
            'Follower Count': snapshot.follower_count,
            'Follower Change': snapshot.follower_change,
            'Total Tweets': snapshot.total_tweets,
            'Total Impressions': snapshot.total_impressions,
            'Total Likes': snapshot.total_likes,
            'Total Retweets': snapshot.total_retweets,
            'Engagement Rate (%)': snapshot.engagement_rate,
          });
        });
        filename += '-historical';
      }

      // Convert to CSV
      if (data.length === 0) {
        throw new Error('No data to export');
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header] || '';
              // Escape commas and quotes in CSV
              if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filepath = path.join(this.exportsDir, `${filename}-${timestamp}.csv`);

      await fs.writeFile(filepath, csvContent, 'utf8');

      // Save export record
      const exportRecord = await database.query(
        `INSERT INTO twitter_analytics_exports 
         (user_id, export_type, export_format, date_range_start, date_range_end, file_path, file_size_bytes, status, completed_at)
         VALUES ($1, 'csv', $2, $3, $4, $5, $6, 'completed', NOW())
         RETURNING *`,
        [
          userId,
          exportType,
          dateRange?.start || null,
          dateRange?.end || null,
          filepath,
          csvContent.length,
        ]
      );

      return {
        success: true,
        filepath,
        filename: `${filename}-${timestamp}.csv`,
        size: csvContent.length,
        exportId: exportRecord.rows[0].id,
      };
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  }

  /**
   * Export to PDF (simplified version - can be enhanced with PDFKit)
   */
  async exportToPDF(userId, exportType = 'overview') {
    try {
      // For now, we'll create a simple text-based PDF
      // In production, use PDFKit or similar library
      const PDFDocument = require('pdfkit');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `twitter-analytics-${exportType}-${timestamp}.pdf`;
      const filepath = path.join(this.exportsDir, filename);

      const doc = new PDFDocument();
      const stream = require('fs').createWriteStream(filepath);
      doc.pipe(stream);

      // Add content
      doc.fontSize(20).text('Twitter Analytics Report', { align: 'center' });
      doc.moveDown();

      if (exportType === 'overview' || exportType === 'full') {
        const overview = await this.analyticsService.getOverview(userId);
        doc.fontSize(16).text('Overview', { underline: true });
        doc.fontSize(12);
        doc.text(`Username: ${overview.username}`);
        doc.text(`Followers: ${overview.followerCount}`);
        doc.text(`Total Tweets: ${overview.totalTweets}`);
        doc.text(`Impressions: ${overview.impressions}`);
        doc.text(`Engagement Rate: ${overview.engagementRate}%`);
        doc.moveDown();
      }

      if (exportType === 'posts' || exportType === 'full') {
        const posts = await this.analyticsService.getTopPosts(userId, 20);
        doc.fontSize(16).text('Top Posts', { underline: true });
        doc.fontSize(12);
        posts.forEach((post, index) => {
          doc.text(`${index + 1}. ${post.text.substring(0, 100)}...`);
          doc.text(`   Likes: ${post.metrics.like_count || 0} | Retweets: ${post.metrics.retweet_count || 0}`);
          doc.moveDown(0.5);
        });
      }

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', async () => {
          const stats = await fs.stat(filepath);
          
          // Save export record
          const exportRecord = await database.query(
            `INSERT INTO twitter_analytics_exports 
             (user_id, export_type, export_format, file_path, file_size_bytes, status, completed_at)
             VALUES ($1, 'pdf', $2, $3, $4, 'completed', NOW())
             RETURNING *`,
            [userId, exportType, filepath, stats.size]
          );

          resolve({
            success: true,
            filepath,
            filename,
            size: stats.size,
            exportId: exportRecord.rows[0].id,
          });
        });

        stream.on('error', reject);
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  }

  /**
   * Get export history for user
   */
  async getExportHistory(userId, limit = 20) {
    try {
      const result = await database.query(
        `SELECT * FROM twitter_analytics_exports 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get export history:', error);
      throw error;
    }
  }
}

module.exports = TwitterAnalyticsExportService;

