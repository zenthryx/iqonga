import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Gift, 
  Users, 
  DollarSign, 
  ArrowRight, 
  CheckCircle, 
  Copy, 
  Share2,
  Wallet,
  TrendingUp,
  Clock,
  Shield,
  HelpCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ReferralProgram: React.FC = () => {
  const { t, language } = useLanguage();

  const benefits = [
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: 'Earn 20% USDC',
      description: 'Get 20% of every purchase your referrals make, paid directly to your Solana wallet in USDC.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Unlimited Referrals',
      description: 'Refer as many users as you want. There\'s no limit to how much you can earn.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: 'Give 20% Bonus',
      description: 'Your referrals get a 20% credit bonus on their first purchase when they use your link.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Automatic Payouts',
      description: 'Rewards are automatically sent to your Solana wallet. No manual claiming required.',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Get Your Referral Code',
      description: 'Sign up for Iqonga and navigate to the Referrals page. Your unique referral code and link are automatically generated.',
      icon: <Copy className="h-5 w-5" />
    },
    {
      number: '2',
      title: 'Share Your Link',
      description: 'Share your referral link with friends, colleagues, or your audience. You can copy the link or share it directly via social media.',
      icon: <Share2 className="h-5 w-5" />
    },
    {
      number: '3',
      title: 'They Sign Up',
      description: 'When someone signs up using your referral link, they automatically get tracked as your referral.',
      icon: <Users className="h-5 w-5" />
    },
    {
      number: '4',
      title: 'They Make a Purchase',
      description: 'When your referral makes their first purchase, they get a 20% credit bonus, and you earn 20% USDC.',
      icon: <Gift className="h-5 w-5" />
    },
    {
      number: '5',
      title: 'You Get Paid',
      description: 'USDC rewards are automatically sent to your Solana wallet. Track all your earnings in the Referrals dashboard.',
      icon: <Wallet className="h-5 w-5" />
    }
  ];

  const faqs = [
    {
      question: 'How much can I earn?',
      answer: 'You earn 20% of every purchase your referrals make. There\'s no limit to how much you can earn. The more referrals you have, the more you can earn.'
    },
    {
      question: 'When do I get paid?',
      answer: 'USDC rewards are automatically sent to your Solana wallet after your referral makes a purchase. Payouts are processed automatically, typically within a few minutes.'
    },
    {
      question: 'What do my referrals get?',
      answer: 'Your referrals get a 20% credit bonus on their first purchase when they sign up using your referral link. This bonus is applied automatically.'
    },
    {
      question: 'Do I need a Solana wallet?',
      answer: 'Yes, you need a Solana wallet to receive USDC rewards. We support popular wallets like Phantom, Solflare, and Backpack. You can connect your wallet when you sign up.'
    },
    {
      question: 'Can I refer myself?',
      answer: 'No, self-referrals are not allowed. The referral system is designed to reward you for bringing new users to the platform.'
    },
    {
      question: 'Is there a minimum payout?',
      answer: 'No, there\'s no minimum payout. You\'ll receive USDC rewards for every purchase your referrals make, regardless of the amount.'
    },
    {
      question: 'How do I track my referrals?',
      answer: 'You can track all your referrals, earnings, and rewards in the Referrals dashboard. You\'ll see total referrals, active referrals, total earnings, and a complete rewards history.'
    },
    {
      question: 'What happens if my referral uses a different referral code?',
      answer: 'Each user can only be associated with one referrer. The first referral code used during signup is the one that counts. Make sure your referrals use your link when they first sign up.'
    }
  ];

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full mb-6">
            <Gift className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Referral Program
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            Earn USDC for every user you refer! Share your referral link and get rewarded with 20% of every purchase your referrals make.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/referrals"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 border border-white/20"
            >
              View My Referrals
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className={`bg-gradient-to-br ${benefit.color} rounded-lg p-3 w-fit mb-4 text-white`}>
                {benefit.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {benefit.title}
              </h3>
              <p className="text-gray-300 text-sm">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">How It Works</h2>
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-lg">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-yellow-400">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-300">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Example Calculation */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-8 border border-green-500/20 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Earnings Example</h2>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 rounded-lg p-6 mb-4">
              <p className="text-gray-300 mb-4">
                Let's say you refer 10 users, and each of them purchases $100 worth of credits:
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Purchases:</span>
                  <span className="text-white font-semibold">$1,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Your Commission (20%):</span>
                  <span className="text-green-400 font-bold text-xl">$200 USDC</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="text-gray-300">Referral Bonuses Given:</span>
                  <span className="text-purple-400 font-semibold">$200 in credits</span>
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm text-center">
              💡 The more referrals you have, the more you can earn. There's no limit!
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <TrendingUp className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Track Everything</h3>
            <p className="text-gray-300 text-sm">
              Monitor your referrals, earnings, and rewards in real-time. See detailed statistics and transaction history.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <Shield className="h-8 w-8 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Secure & Transparent</h3>
            <p className="text-gray-300 text-sm">
              All transactions are recorded on the Solana blockchain. View transaction signatures on Solscan for complete transparency.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <Clock className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Instant Payouts</h3>
            <p className="text-gray-300 text-sm">
              USDC rewards are sent automatically to your wallet. No waiting periods or manual claiming required.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <div className="flex items-center gap-3 mb-8">
            <HelpCircle className="h-8 w-8 text-yellow-400" />
            <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-yellow-400" />
                  {faq.question}
                </h3>
                <p className="text-gray-300 ml-7">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-16">
          <h2 className="text-2xl font-bold text-white mb-4">Terms & Conditions</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-white">Eligibility:</strong> All registered users are eligible to participate in the referral program.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-white">Reward Rate:</strong> Referrers earn 20% USDC on every purchase made by their referrals. Referees receive a 20% credit bonus on their first purchase.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-white">Payouts:</strong> USDC rewards are automatically sent to your connected Solana wallet. You must have a valid Solana wallet connected to receive rewards.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-white">Self-Referrals:</strong> Self-referrals are strictly prohibited. Any attempt to refer yourself will result in disqualification from the program.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-white">Fraud Prevention:</strong> We monitor for fraudulent activity. Any abuse of the referral system may result in account suspension and forfeiture of rewards.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-white">Program Changes:</strong> We reserve the right to modify or discontinue the referral program at any time. Changes will be communicated to all participants.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-8 border border-yellow-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Earning?</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join the referral program today and start earning for every user you bring to Iqonga.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Get Your Referral Link
            </Link>
            <Link
              to="/contact"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 border border-white/20"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralProgram;

