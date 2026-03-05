import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'a1b'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'ee6'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '19c'),
            routes: [
              {
                path: '/docs/deployment',
                component: ComponentCreator('/docs/deployment', '9a4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/development/workflow-enhancements',
                component: ComponentCreator('/docs/development/workflow-enhancements', 'b96'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started',
                component: ComponentCreator('/docs/getting-started', '3fb'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/agent-teams',
                component: ComponentCreator('/docs/guides/agent-teams', '2e9'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/ai-agents',
                component: ComponentCreator('/docs/guides/ai-agents', '120'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/analytics',
                component: ComponentCreator('/docs/guides/analytics', '1b6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/company-knowledge',
                component: ComponentCreator('/docs/guides/company-knowledge', '9df'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/content-generation',
                component: ComponentCreator('/docs/guides/content-generation', '63e'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/integrations',
                component: ComponentCreator('/docs/guides/integrations', '71f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/security',
                component: ComponentCreator('/docs/guides/security', '6e4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/troubleshooting',
                component: ComponentCreator('/docs/guides/troubleshooting', 'b6c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/guides/workflows',
                component: ComponentCreator('/docs/guides/workflows', 'f06'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '058'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/showcase',
                component: ComponentCreator('/docs/showcase', '8a3'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', '2e1'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
