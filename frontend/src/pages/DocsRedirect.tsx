import React, { useEffect } from 'react';
import { getDocsBaseUrl } from '@/utils/domain';
import Documentation from './Documentation';

/**
 * When VITE_DOCS_URL is set (e.g. https://docs.iqonga.org), redirect to the docs site.
 * Otherwise render the in-app Documentation page.
 */
const DocsRedirect: React.FC = () => {
  const base = getDocsBaseUrl();

  useEffect(() => {
    if (base) {
      window.location.href = base + '/docs/intro';
      return;
    }
  }, [base]);

  if (base) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Redirecting to documentation…</p>
      </div>
    );
  }

  return <Documentation />;
};

export default DocsRedirect;
