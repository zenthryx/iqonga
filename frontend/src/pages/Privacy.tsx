import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

export default function Privacy() {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <SEO
        title="Privacy Policy"
        description="How Iqonga collects, uses, and protects your information. Privacy policy and data practices."
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content */}
          <div className="glass-card p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We collect information you provide directly to us, such as when you create an account, use our services, or contact us:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Account Information:</strong> Username, email address, wallet address</li>
                <li><strong>Profile Information:</strong> AI agent configurations, personality settings, preferences</li>
                <li><strong>Social Media Tokens:</strong> Encrypted access tokens for connected platforms (Twitter, etc.)</li>
                <li><strong>Content Data:</strong> Generated content, posts, analytics, and performance metrics</li>
                <li><strong>Payment Information:</strong> Solana transaction records and wallet interactions</li>
                <li><strong>Usage Data:</strong> How you interact with our platform, features used, and session information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Provide, maintain, and improve our AI agent services</li>
                <li>Generate personalized content based on your agent's personality</li>
                <li>Connect and manage your social media accounts</li>
                <li>Process payments and manage subscriptions</li>
                <li>Provide customer support and respond to your requests</li>
                <li>Send you technical notices, updates, and security alerts</li>
                <li>Analyze usage patterns to improve our platform</li>
                <li>Comply with legal obligations and protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Information Sharing and Disclosure</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Social Media Platforms:</strong> When you authorize posting to connected accounts</li>
                <li><strong>Service Providers:</strong> Third-party services that help us operate our platform (hosting, analytics)</li>
                <li><strong>Blockchain Networks:</strong> Public transaction data on Solana blockchain</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We implement appropriate security measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Encryption:</strong> All sensitive data is encrypted in transit and at rest</li>
                <li><strong>Access Controls:</strong> Limited access to personal information on a need-to-know basis</li>
                <li><strong>Secure Infrastructure:</strong> Industry-standard security practices and regular audits</li>
                <li><strong>Token Security:</strong> Social media tokens are encrypted using AES-256 encryption</li>
                <li><strong>Blockchain Security:</strong> Leveraging Solana's built-in security features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. AI and Machine Learning</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Our AI services process your data to provide personalized experiences:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Content generation is based on your agent's personality and preferences</li>
                <li>We use OpenAI's GPT models for content creation (subject to their privacy policy)</li>
                <li>AI training data does not include your personal conversations or private content</li>
                <li>Generated content is attributed to your AI agents, not stored for training purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Blockchain and Cryptocurrency</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Data we store and how we use it:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Account & agents:</strong> Your profile and AI agent data are stored securely on our servers</li>
                <li><strong>Payments:</strong> Payment and credit usage are processed according to our payment provider terms</li>
                <li><strong>Content:</strong> Agent-generated content may be stored for delivery and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Social Media Integration</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                When you connect social media accounts:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>We store encrypted access tokens to post on your behalf</li>
                <li>We access only the permissions you explicitly grant</li>
                <li>You can revoke access at any time through your account settings</li>
                <li>We comply with each platform's API terms and privacy policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Data Retention</h2>
              <p className="text-gray-300 leading-relaxed">
                We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. 
                You can request deletion of your account and associated data at any time, though some information may be retained for 
                legal or operational purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Your Rights and Choices</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. International Data Transfers</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are hosted globally, and your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your information during such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from 
                children under 13. If you become aware that we have collected personal information from a child under 13, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy 
                on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Contact Us</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
                <br />
                <span className="text-teal-400">privacy@iqonga.org</span>
                <br />
                <br />
                For data protection inquiries in the EU, you can also contact our Data Protection Officer at:
                <br />
                <span className="text-teal-400">dpo@iqonga.org</span>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 