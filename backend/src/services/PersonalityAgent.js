class PersonalityAgent {
  constructor(agentConfig) {
    this.config = agentConfig;
    this.personality = agentConfig.personality_config || {};
    this.targetTopics = agentConfig.target_topics || [];
  }

  // Generate content based on type and context
  async generateContent(options) {
    const { type, platform, originalTweet, conversationContext } = options;

    try {
      switch (type) {
        case 'original_post':
          return await this.generateOriginalPost(options);
        case 'reply':
          return await this.generateReply(originalTweet, options);
        case 'conversation_reply':
          return await this.generateConversationReply(originalTweet, conversationContext, options);
        case 'thread':
          return await this.generateThread(options);
        default:
          throw new Error(`Unsupported content type: ${type}`);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  // Generate original post content
  async generateOriginalPost(options) {
    const { trends = [], platform } = options;
    
    // This would integrate with OpenAI GPT-4 in production
    const prompt = `Generate a ${platform} post about ${this.targetTopics.join(', ')}. 
    Current trends: ${trends.join(', ')}. 
    Personality: ${JSON.stringify(this.personality)}. 
    Make it engaging and authentic to the agent's personality.`;

    // For now, return a placeholder response
    return `🚀 Exciting developments in ${this.targetTopics[0] || 'AI'}! 
    ${this.personality.core_traits?.[0] || 'Innovation'} is key to progress. 
    What are your thoughts on this? #${this.targetTopics[0]?.replace(/\s+/g, '') || 'AI'} #Innovation`;
  }

  // Generate reply to a tweet
  async generateReply(tweet, options) {
    const { type, platform, originalTweet, conversationContext } = options;
    
    // Extract the actual tweet text and context
    const tweetText = tweet.text || tweet;
    const authorUsername = tweet.author?.username || 'user';
    
    // Check if this is a question
    const isQuestion = tweetText.includes('?') || 
                      tweetText.toLowerCase().includes('what') ||
                      tweetText.toLowerCase().includes('how') ||
                      tweetText.toLowerCase().includes('when') ||
                      tweetText.toLowerCase().includes('where') ||
                      tweetText.toLowerCase().includes('why') ||
                      tweetText.toLowerCase().includes('cost') ||
                      tweetText.toLowerCase().includes('price');
    
    // Check for specific topics in the tweet
    const hasZenthryx = tweetText.toLowerCase().includes('zenthryx');
    const hasCFD = tweetText.toLowerCase().includes('cfd');
    const hasStrategy = tweetText.toLowerCase().includes('strategy');
    const hasTrading = tweetText.toLowerCase().includes('trading');
    const hasCost = tweetText.toLowerCase().includes('cost') || tweetText.toLowerCase().includes('price');
    
    let replyContent = '';
    
    // Generate contextual reply based on content
    if (isQuestion && hasZenthryx && hasCFD && hasStrategy && hasCost) {
      // Specific question about Zenthryx CFD Strategy builder cost
      replyContent = `Great question! The Zenthryx CFD Strategy Builder pricing varies based on your needs. We offer flexible packages starting from $99/month for basic strategies to $299/month for advanced algorithmic trading. Would you like me to send you our detailed pricing guide?`;
    } else if (isQuestion && hasZenthryx) {
      // General question about Zenthryx
      replyContent = `Thanks for asking about Zenthryx! We offer various AI-powered trading tools. Our CFD Strategy Builder is particularly popular for creating automated trading strategies. What specific aspect of Zenthryx are you most interested in?`;
    } else if (isQuestion && hasTrading) {
      // General trading question
      replyContent = `Great question about trading! ${this.personality.core_traits?.[0] || 'Strategy'} is key to success. What type of trading are you focusing on? I'd love to share some insights!`;
    } else if (hasZenthryx) {
      // Mention of Zenthryx without specific question
      replyContent = `Thanks for mentioning Zenthryx! We're excited about helping traders leverage AI for better results. Have you tried our strategy builder yet?`;
    } else {
      // Generic but more contextual reply
      const topics = this.targetTopics.join(', ');
      const personality = this.personality.core_traits?.[0] || 'interesting';
      
      replyContent = `Thanks for sharing this ${personality} perspective on ${topics}! ${this.generateFollowUpQuestion(tweetText)}`;
    }
    
    // Ensure reply is not too long for Twitter
    if (replyContent.length > 280) {
      replyContent = replyContent.substring(0, 277) + '...';
    }
    
    return replyContent;
  }

  // Generate conversation reply with context
  async generateConversationReply(tweet, conversationContext, options) {
    const { previousReplies, conversationTone, userSentiment } = conversationContext;
    
    // Extract the actual tweet text
    const tweetText = tweet.text || tweet;
    const authorUsername = tweet.author?.username || 'user';
    
    // Check if this is a question
    const isQuestion = tweetText.includes('?') || 
                      tweetText.toLowerCase().includes('what') ||
                      tweetText.toLowerCase().includes('how') ||
                      tweetText.toLowerCase().includes('when') ||
                      tweetText.toLowerCase().includes('where') ||
                      tweetText.toLowerCase().includes('why') ||
                      tweetText.toLowerCase().includes('cost') ||
                      tweetText.toLowerCase().includes('price');
    
    // Check for specific topics
    const hasZenthryx = tweetText.toLowerCase().includes('zenthryx');
    const hasCFD = tweetText.toLowerCase().includes('cfd');
    const hasStrategy = tweetText.toLowerCase().includes('strategy');
    const hasTrading = tweetText.toLowerCase().includes('trading');
    const hasCost = tweetText.toLowerCase().includes('cost') || tweetText.toLowerCase().includes('price');
    
    let replyContent = '';
    
    // Generate contextual reply based on content and conversation history
    if (isQuestion && hasZenthryx && hasCFD && hasStrategy && hasCost) {
      // Specific question about Zenthryx CFD Strategy builder cost
      replyContent = `Great question! The Zenthryx CFD Strategy Builder pricing varies based on your needs. We offer flexible packages starting from $99/month for basic strategies to $299/month for advanced algorithmic trading. Would you like me to send you our detailed pricing guide?`;
    } else if (isQuestion && hasZenthryx) {
      // General question about Zenthryx
      replyContent = `Thanks for asking about Zenthryx! We offer various AI-powered trading tools. Our CFD Strategy Builder is particularly popular for creating automated trading strategies. What specific aspect of Zenthryx are you most interested in?`;
    } else if (isQuestion && hasTrading) {
      // General trading question
      replyContent = `Great question about trading! ${this.personality.core_traits?.[0] || 'Strategy'} is key to success. What type of trading are you focusing on? I'd love to share some insights!`;
    } else if (hasZenthryx) {
      // Mention of Zenthryx without specific question
      replyContent = `Thanks for mentioning Zenthryx! We're excited about helping traders leverage AI for better results. Have you tried our strategy builder yet?`;
    } else {
      // Generic but contextual response based on conversation tone
      const contextualResponse = this.generateContextualResponse(conversationTone, userSentiment);
      const followUpQuestion = this.generateFollowUpQuestion(tweetText);
      replyContent = `${contextualResponse} ${followUpQuestion}`;
    }
    
    // Ensure reply is not too long for Twitter
    if (replyContent.length > 280) {
      replyContent = replyContent.substring(0, 277) + '...';
    }
    
    return replyContent;
  }

  // Generate thread content
  async generateThread(options) {
    const { platform, topic } = options;
    
    const prompt = `Generate a ${platform} thread about ${topic || this.targetTopics[0]}. 
    Personality: ${JSON.stringify(this.personality)}. 
    Make it informative and engaging.`;

    // For now, return a placeholder thread
    return [
      `🧵 Let's dive into ${topic || this.targetTopics[0] || 'AI'}! Here's what you need to know:`,
      `1️⃣ First, ${this.personality.core_traits?.[0] || 'understanding'} the basics is crucial`,
      `2️⃣ Then, we can explore ${this.personality.expertise_areas?.[0] || 'advanced concepts'}`,
      `3️⃣ Finally, let's discuss ${this.personality.expertise_areas?.[1] || 'practical applications'}`
    ];
  }

  // Determine if agent should engage with a tweet
  async shouldEngageWithTweet(tweet, agentConfig) {
    try {
      // Check if tweet is from a verified user or has high engagement
      const isHighValue = tweet.author.verified ||
                         (tweet.public_metrics?.like_count || 0) > 100;

      // Check topic relevance
      const relevanceScore = this.calculateTopicRelevance(tweet.text, agentConfig.target_topics);

      // Check engagement threshold
      const engagementThreshold = agentConfig.min_engagement_threshold || 50;
      const meetsEngagementThreshold = (tweet.public_metrics?.like_count || 0) >= engagementThreshold;

      // Check if we've already replied recently (this would need database integration)
      const hasRepliedRecently = false; // TODO: Implement database check

      // Calculate priority score
      let priority = 'low';
      let reason = '';

      if (relevanceScore > 0.8 && isHighValue && meetsEngagementThreshold) {
        priority = 'high';
        reason = 'High relevance, verified user, good engagement';
      } else if (relevanceScore > 0.6 && meetsEngagementThreshold) {
        priority = 'medium';
        reason = 'Good relevance and engagement';
      } else if (relevanceScore > 0.4 && isHighValue) {
        priority = 'medium';
        reason = 'Verified user with moderate relevance';
      } else {
        reason = 'Low relevance or engagement';
      }

      const shouldEngage = relevanceScore > 0.4 && meetsEngagementThreshold && !hasRepliedRecently;

      return {
        shouldEngage,
        reason,
        priority,
        suggestedResponse: shouldEngage ? await this.generateQuickResponse(tweet, agentConfig) : undefined
      };
    } catch (error) {
      console.error('Error in engagement decision:', error);
      return {
        shouldEngage: false,
        reason: 'Error processing tweet',
        priority: 'low'
      };
    }
  }

  // Generate quick response for engagement
  async generateQuickResponse(tweet, agentConfig) {
    const tweetText = tweet.text || tweet;
    
    // Check if this is a question
    const isQuestion = tweetText.includes('?') || 
                      tweetText.toLowerCase().includes('what') ||
                      tweetText.toLowerCase().includes('how') ||
                      tweetText.toLowerCase().includes('when') ||
                      tweetText.toLowerCase().includes('where') ||
                      tweetText.toLowerCase().includes('why') ||
                      tweetText.toLowerCase().includes('cost') ||
                      tweetText.toLowerCase().includes('price');
    
    // Check for specific topics
    const hasZenthryx = tweetText.toLowerCase().includes('zenthryx');
    const hasCFD = tweetText.toLowerCase().includes('cfd');
    const hasStrategy = tweetText.toLowerCase().includes('strategy');
    const hasTrading = tweetText.toLowerCase().includes('trading');
    
    let response = '';
    
    if (isQuestion && hasZenthryx && hasCFD && hasStrategy) {
      response = `Great question! Zenthryx CFD Strategy Builder pricing starts at $99/month. Would you like our detailed guide?`;
    } else if (isQuestion && hasZenthryx) {
      response = `Thanks for asking about Zenthryx! Our AI-powered tools help traders create automated strategies. What interests you most?`;
    } else if (isQuestion && hasTrading) {
      response = `Great trading question! Strategy is key to success. What type of trading are you focusing on?`;
    } else if (hasZenthryx) {
      response = `Thanks for mentioning Zenthryx! Have you tried our strategy builder yet?`;
    } else {
      response = `Great insight on ${this.targetTopics[0] || 'this'}! ${this.generateFollowUpQuestion(tweetText)}`;
    }
    
    // Ensure response is under 100 characters
    if (response.length > 100) {
      response = response.substring(0, 97) + '...';
    }
    
    return response;
  }

  // Calculate topic relevance score
  calculateTopicRelevance(tweetText, targetTopics) {
    if (!targetTopics || targetTopics.length === 0) return 0;

    const tweetWords = tweetText.toLowerCase().split(/\s+/);
    let matchCount = 0;

    targetTopics.forEach(topic => {
      const topicWords = topic.toLowerCase().split(/\s+/);
      topicWords.forEach(word => {
        if (tweetWords.includes(word)) {
          matchCount++;
        }
      });
    });

    return Math.min(matchCount / targetTopics.length, 1.0);
  }

  // Analyze conversation sentiment
  async analyzeConversationSentiment(conversationTweets) {
    // This would integrate with sentiment analysis API in production
    // For now, return neutral sentiment
    return 'neutral';
  }

  // Determine conversation tone
  async determineConversationTone(conversationTweets) {
    // This would analyze the overall tone of the conversation
    // For now, return casual tone
    return 'casual';
  }

  // Generate follow-up question
  generateFollowUpQuestion(tweetText) {
    const questions = [
      'What do you think?',
      'Any thoughts on this?',
      'How do you see this evolving?',
      'What\'s your take?',
      'Interested in your perspective!'
    ];
    
    return questions[Math.floor(Math.random() * questions.length)];
  }

  // Generate contextual response
  generateContextualResponse(tone, sentiment) {
    if (tone === 'professional') {
      return 'This is a fascinating development in our field.';
    } else if (sentiment === 'positive') {
      return 'Love the energy in this conversation!';
    } else {
      return 'Great to see such thoughtful discussion.';
    }
  }

  // Check if should reply to tweet (legacy method)
  shouldReplyToTweet(tweet, agentConfig) {
    // This is a simplified version for backward compatibility
    const relevanceScore = this.calculateTopicRelevance(tweet.text, agentConfig.target_topics);
    const engagementThreshold = agentConfig.min_engagement_threshold || 50;
    const meetsEngagementThreshold = (tweet.public_metrics?.like_count || 0) >= engagementThreshold;
    
    return relevanceScore > 0.5 && meetsEngagementThreshold;
  }
}

module.exports = {
  PersonalityAgent
};
