import React from 'react';
import { PuzzlePieceIcon, CreditCardIcon, SparklesIcon, CubeIcon } from '@heroicons/react/24/outline';

const Marketplace: React.FC = () => {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Marketplace</h1>
        <p className="text-gray-400 mt-1">
          Add-ons and extensions for your Iqonga instance
        </p>
      </div>

      <div className="glass-card p-8">
        <h2 className="text-xl font-semibold text-white mb-2">Marketplace Coming Soon</h2>
        <p className="text-gray-400 mb-6">
          The Marketplace will let you discover and install add-ons to extend Iqonga. Core features stay free; chargeable services can be added via optional add-ons.
        </p>

        <h3 className="text-lg font-medium text-white mb-3">Planned add-on types</h3>
        <ul className="space-y-4 text-gray-300">
          <li className="flex items-start gap-3">
            <CreditCardIcon className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <span><strong className="text-white">Credit & billing</strong> — Pay-as-you-go or subscription add-ons (e.g. per-image or per-minute billing) for teams who want usage-based pricing on top of the free core.</span>
          </li>
          <li className="flex items-start gap-3">
            <PuzzlePieceIcon className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <span><strong className="text-white">Integrations</strong> — Extra channels, CRM, analytics, or third-party APIs (Slack, Discord, custom webhooks, etc.) as installable modules.</span>
          </li>
          <li className="flex items-start gap-3">
            <SparklesIcon className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <span><strong className="text-white">AI & models</strong> — Additional AI providers, voices, or content templates that plug into agents and content generation.</span>
          </li>
          <li className="flex items-start gap-3">
            <CubeIcon className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
            <span><strong className="text-white">Themes & branding</strong> — Custom dashboards, white-label options, or UI themes for deployers who want to rebrand the platform.</span>
          </li>
        </ul>
        <p className="text-gray-500 text-sm mt-6">
          If you want to build a chargeable service, you can implement a credit or billing add-on on your fork or via the Marketplace when it’s available.
        </p>
      </div>
    </div>
  );
};

export default Marketplace; 