import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface DeletionStatusResponse {
  id: string;
  platform_user_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const statusDescriptions: Record<string, string> = {
  pending_manual_review:
    'Your request has been received and queued for review by the Ajentrix data protection team.',
  completed:
    'Your request has been completed. Any personally identifiable data connected to this app has been removed or anonymized.',
  error:
    'We encountered an issue while processing your request. Our support team has been notified.',
};

const DataDeletionStatus: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DeletionStatusResponse | null>(null);

  useEffect(() => {
    if (!requestId) {
      setError('Missing request ID');
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/meta/facebook/data-deletion-status/${requestId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Unable to fetch deletion status');
        }

        setStatus(data.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Unable to fetch deletion status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [requestId]);

  const renderStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
          <span>Checking status…</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/40 border border-red-500 text-red-100 px-4 py-3 rounded-lg">
          {error}
        </div>
      );
    }

    if (!status) {
      return (
        <div className="bg-yellow-900/40 border border-yellow-500 text-yellow-100 px-4 py-3 rounded-lg">
          No status available for this request yet. Please try again later.
        </div>
      );
    }

    const normalizedStatus = status.status || 'pending_manual_review';
    const description =
      statusDescriptions[normalizedStatus] ||
      'Your request is being processed. Please check back later for an update.';

    return (
      <div className="space-y-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-1">Request ID</p>
          <p className="font-mono text-white break-all">{status.id}</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-1">Current Status</p>
          <p className="text-xl font-semibold text-white capitalize">{normalizedStatus.replace(/_/g, ' ')}</p>
          <p className="text-gray-300 mt-2">{description}</p>
        </div>

        {status.notes && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-1">Notes</p>
            <p className="text-gray-200">{status.notes}</p>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-400 mb-1">Requested</p>
          <p className="text-gray-200">
            {new Date(status.created_at).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>

          <p className="text-sm text-gray-400 mt-4 mb-1">Last Updated</p>
          <p className="text-gray-200">
            {new Date(status.updated_at).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-white">
      <div className="mb-10">
        <p className="text-sm uppercase tracking-wide text-indigo-400 mb-2">Iqonga • Privacy</p>
        <h1 className="text-3xl font-bold">Facebook Data Deletion Status</h1>
        <p className="text-gray-300 mt-3">
          This page shows the current status of your data deletion request submitted through Facebook.
          Keep this link for your records. If you have additional questions, contact{' '}
          <a
            href="mailto:privacy@iqonga.org"
            className="text-indigo-300 hover:text-indigo-200 underline"
          >
            privacy@iqonga.org
          </a>.
        </p>
      </div>

      {renderStatus()}

      <div className="mt-10">
        <Link
          to="/privacy"
          className="text-indigo-300 hover:text-indigo-100 underline text-sm"
        >
          View Iqonga Privacy Policy
        </Link>
      </div>
    </div>
  );
};

export default DataDeletionStatus;

