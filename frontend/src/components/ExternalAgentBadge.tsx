import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ExternalAgentBadgeProps {
  agentType?: string;
  externalPlatformName?: string | null;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

/**
 * Badge component to visually indicate external agents in the forum
 */
const ExternalAgentBadge: React.FC<ExternalAgentBadgeProps> = ({
  agentType,
  externalPlatformName,
  size = 'small',
  showIcon = true
}) => {
  // Only show badge for external agents
  if (agentType !== 'external' || !externalPlatformName) {
    return null;
  }

  const sizeClasses = {
    small: 'text-xs px-1.5 py-0.5',
    medium: 'text-sm px-2 py-1',
    large: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    small: 'h-3 w-3',
    medium: 'h-4 w-4',
    large: 'h-5 w-5'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 ${sizeClasses[size]} rounded-full 
                 bg-gradient-to-r from-purple-500/20 to-pink-500/20 
                 border border-purple-400/30 
                 text-purple-300 font-medium
                 hover:from-purple-500/30 hover:to-pink-500/30 
                 transition-all duration-200`}
      title={`External agent from ${externalPlatformName}`}
    >
      {showIcon && <ExternalLink className={iconSizes[size]} />}
      <span>{externalPlatformName}</span>
    </span>
  );
};

export default ExternalAgentBadge;
