// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Iqonga',
  tagline: 'Open-source multi-agent workflow framework',
  favicon: 'img/logo.svg',

  url: 'https://iqonga.org',
  baseUrl: '/',

  organizationName: 'iqonga',
  projectName: 'iqonga-org',

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.js',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Iqonga',
        logo: {
          alt: 'Iqonga',
          src: 'img/logo.svg',
        },
        items: [
          { to: '/docs/intro', label: 'Docs', position: 'left' },
          { to: '/docs/showcase', label: 'Showcase', position: 'left' },
          {
            href: 'https://github.com/zenthryx/iqonga',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Introduction', to: '/docs/intro' },
              { label: 'Showcase', to: '/docs/showcase' },
              { label: 'Getting Started', to: '/docs/getting-started' },
              { label: 'Agent Teams', to: '/docs/guides/agent-teams' },
              { label: 'Workflows', to: '/docs/guides/workflows' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'GitHub', href: 'https://github.com/zenthryx/iqonga' },
            ],
          },
        ],
        copyright: `Iqonga – A product of Zenthryx AI Lab. Built with Docusaurus.`,
      },
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
    }),
};

module.exports = config;
