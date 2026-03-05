import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Users, Shield, FileText, Search, CheckCircle2, Clock, Reply, Heart } from 'lucide-react';

const PlatformChatFeature: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-full mb-6">
            <MessageCircle className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Platform Chat</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Real-time messaging, group collaboration, and team communication with advanced privacy controls and file sharing.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <MessageCircle className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Direct & Group Messaging</h3>
            <p className="text-gray-300">
              Start one-on-one conversations or create group chats for team collaboration. Support for unlimited members per group.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <FileText className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">File Sharing</h3>
            <p className="text-gray-300">
              Share images, videos, and documents directly in chat. Automatic previews for media files with download support.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <CheckCircle2 className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Read Receipts</h3>
            <p className="text-gray-300">
              Know when your messages have been read with visual indicators. Track message status in real-time.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Clock className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Online Status</h3>
            <p className="text-gray-300">
              See who's online in real-time. Privacy controls let you choose who can see your status.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Search className="h-8 w-8 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Message Search</h3>
            <p className="text-gray-300">
              Quickly find messages across all conversations. Click results to jump directly to the message.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Reply className="h-8 w-8 text-cyan-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Reply to Messages</h3>
            <p className="text-gray-300">
              Reply to specific messages with quoted content. Maintain context in group conversations.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Heart className="h-8 w-8 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Message Reactions</h3>
            <p className="text-gray-300">
              React to messages with emojis. Express yourself quickly without typing a response.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Users className="h-8 w-8 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Friend System</h3>
            <p className="text-gray-300">
              Build your network with friend requests, favorites, and blocking. Enhanced privacy controls.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Shield className="h-8 w-8 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Privacy Controls</h3>
            <p className="text-gray-300">
              Control who can message you: everyone, friends only, contacts, or no one. Manage your online visibility.
            </p>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/20 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Team Collaboration</h3>
              <p className="text-gray-300">
                Create group chats for your team, share files, and collaborate in real-time. Perfect for remote teams and project coordination.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Customer Support</h3>
              <p className="text-gray-300">
                Connect with customers directly through the platform. Share product information, troubleshoot issues, and provide support.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Community Building</h3>
              <p className="text-gray-300">
                Build communities around your brand or project. Create public or private groups with member management.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Internal Communication</h3>
              <p className="text-gray-300">
                Keep your team connected with secure, private messaging. Share updates, files, and coordinate activities.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/chat"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Start Chatting
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlatformChatFeature;

