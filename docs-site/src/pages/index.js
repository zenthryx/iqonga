import React from 'react';
import Link from '@docusaurus/Link';

export default function Home() {
  return (
    <main className="margin-vert--xl">
      <div className="container text--center">
        <h1 className="hero__title">Iqonga</h1>
        <p className="hero__subtitle">
          Open-source multi-agent workflow framework
        </p>
        <div className="margin-top--lg">
          <Link className="button button--primary button--lg margin-horiz--sm" to="/docs/intro">
            Get started
          </Link>
          <Link className="button button--secondary button--lg margin-horiz--sm" to="/docs/guides/workflows">
            Workflows guide
          </Link>
        </div>
        <div className="margin-top--xl padding-horiz--md text--left" style={{ maxWidth: 600, margin: '2rem auto' }}>
          <p>
            Build multi-step flows with AI agents, human approval, conditional branching, and webhooks.
            Group agents in <Link to="/docs/guides/agent-teams">teams</Link>, define <Link to="/docs/guides/workflows">workflows</Link>, and run them manually, on a schedule, or via API.
          </p>
        </div>
      </div>
    </main>
  );
}
