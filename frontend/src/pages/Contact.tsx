import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    // You can integrate with your backend API here
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <SEO
        title="Contact"
        description="Get in touch with Iqonga. Support, partnerships, and general inquiries. We're here to help."
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Contact <span className="text-teal-400">Us</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Have questions about Iqonga? We're here to help. Reach out for support, 
            partnerships, or general inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What's this about?"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Tell us more about your inquiry..."
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* General Contact */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">General Inquiries</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📧</div>
                  <div>
                    <p className="text-gray-300">Email us at</p>
                    <a href="mailto:support@iqonga.org" className="text-teal-400 hover:text-teal-300">
                      support@iqonga.org
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📍</div>
                  <div>
                    <p className="text-gray-300">Office Location</p>
                    <p className="text-blue-400">
                      Kigali, Rwanda
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💬</div>
                  <div>
                    <p className="text-gray-300">Join our community</p>
                    <a 
                      href="https://t.me/Zenthryx_ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Telegram Community
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🐦</div>
                  <div>
                    <p className="text-gray-300">Follow us on</p>
                    <a 
                      href="https://x.com/IqongaOrg" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-400 hover:text-teal-300"
                    >
                      Twitter/X
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Technical Support</h3>
              <p className="text-gray-300 mb-4">
                Need help with your AI agents or platform features? Our technical support team is here to assist you.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="text-green-400">✓</div>
                  <span className="text-gray-300">24/7 Community Support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-green-400">✓</div>
                  <span className="text-gray-300">Documentation & Tutorials</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-green-400">✓</div>
                  <span className="text-gray-300">Documentation &amp; community support</span>
                </div>
              </div>
            </div>

            {/* Partnerships */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">Partnerships</h3>
              <p className="text-gray-300 mb-4">
                Interested in partnering with us? We're always looking for innovative collaborations.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">🤝</div>
                  <span className="text-gray-300">Integration Partnerships</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">🏢</div>
                  <span className="text-gray-300">Enterprise Solutions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">🚀</div>
                  <span className="text-gray-300">Technology Collaborations</span>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-500/30">
              <h3 className="text-lg font-bold text-white mb-2">Response Time</h3>
              <p className="text-gray-300 text-sm">
                We typically respond to inquiries within 24-48 hours. For urgent technical issues, 
                please reach out through our Telegram community for faster assistance.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">How do I get started?</h3>
              <p className="text-gray-300">
                Sign up with email, create your first agent, and connect channels (e.g. Telegram, Email AI). 
                Agent creation is free. See the Documentation for setup and architecture.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">What can I build with Iqonga?</h3>
              <p className="text-gray-300">
                Content agents, support bots, internal tools, and more. The framework supports multiple channels 
                and scheduled content; developers can extend it and list solutions in the marketplace.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">Is Iqonga free?</h3>
              <p className="text-gray-300">
                The framework is open source. Agent creation and core features are free to use. 
                You can self-host or use the hosted offering; see Documentation for details.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">Is my data secure?</h3>
              <p className="text-gray-300">
                Data is encrypted in transit and at rest. When self-hosting, your data stays on your infrastructure. 
                See our Privacy Policy for details.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
