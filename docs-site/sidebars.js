/**
 * Creating a sidebar enables you to:
 * - create an ordered group of docs
 * - render a sidebar for each doc of that group
 * - provide next/previous navigation
 *
 * Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    'showcase',
    'getting-started',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/ai-agents',
        'guides/agent-teams',
        'guides/workflows',
        'guides/content-generation',
        'guides/integrations',
        'guides/company-knowledge',
        'guides/analytics',
        'guides/security',
        'guides/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Deployment & development',
      items: [
        'deployment',
        'build-with-cursor',
        'development/workflow-enhancements',
      ],
    },
  ],
};

module.exports = sidebars;
