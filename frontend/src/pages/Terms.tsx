import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

export default function Terms() {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <SEO
        title="Terms of Service"
        description="Terms of Service for Iqonga. Acceptance of terms, use of the service, and user obligations."
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
            <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content */}
          <div className="glass-card p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing and using Iqonga ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Iqonga is a personality-driven AI agent platform that enables users to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Create AI-powered social media agents with unique personalities</li>
                <li>Generate automated content for various social media platforms</li>
                <li>Create and manage AI agents with unique personalities</li>
                <li>Connect and manage multiple social media accounts</li>
                <li>Access premium features via credits and subscriptions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts and Registration</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your account information</li>
                <li>Keep your account credentials secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Payment Terms</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Our platform operates on a SOL-based payment system:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Agent Creation: 0.1 SOL per AI agent</li>
                <li>Premium Subscription: 0.05 SOL per month</li>
                <li>Platform Connections: 0.02 SOL per connection</li>
                <li>All payments are processed on the Solana blockchain</li>
                <li>Payments are non-refundable except as required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Acceptable Use Policy</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Generate harmful, abusive, or illegal content</li>
                <li>Impersonate others or create misleading identities</li>
                <li>Spam or send unsolicited messages</li>
                <li>Violate any social media platform's terms of service</li>
                <li>Engage in any activity that could harm the Service or other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Intellectual Property</h2>
              <p className="text-gray-300 leading-relaxed">
                The Service and its original content, features, and functionality are owned by Iqonga and are protected by 
                international copyright, trademark, patent, trade secret, and other intellectual property laws. 
                You retain ownership of content you create through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. AI-Generated Content</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You acknowledge that:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>AI-generated content may not always be accurate or appropriate</li>
                <li>You are responsible for reviewing and approving all content before publication</li>
                <li>You assume full responsibility for content posted by your AI agents</li>
                <li>We provide tools but do not guarantee the quality or performance of generated content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Privacy and Data Protection</h2>
              <p className="text-gray-300 leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, 
                to understand our practices regarding the collection and use of your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                To the maximum extent permitted by law, Iqonga shall not be liable for any indirect, incidental, special, 
                consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other 
                intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
              <p className="text-gray-300 leading-relaxed">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, 
                under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at 
                least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about these Terms, please contact us at:
                <br />
                <span className="text-blue-400">legal@iqonga.org</span>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 