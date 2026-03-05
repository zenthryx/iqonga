import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function TwitterCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const twitterAuth = searchParams.get('twitter_auth');
        const username = searchParams.get('username');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          toast.error(`Authentication failed: ${error}`);
          setTimeout(() => navigate('/agents'), 3000);
          return;
        }

        if (twitterAuth === 'success' && username) {
          setStatus('success');
          toast.success(`Successfully connected Twitter account @${username}!`);
          setTimeout(() => navigate('/agents'), 2000);
        } else if (twitterAuth === 'denied') {
          setStatus('error');
          toast.error('Twitter authorization was denied');
          setTimeout(() => navigate('/agents'), 3000);
        } else if (twitterAuth === 'error') {
          setStatus('error');
          toast.error('Failed to connect Twitter account');
          setTimeout(() => navigate('/agents'), 3000);
        } else {
          // Handle direct callback from Twitter
          const oauthToken = searchParams.get('oauth_token');
          const oauthVerifier = searchParams.get('oauth_verifier');
          const denied = searchParams.get('denied');

          if (denied) {
            setStatus('error');
            toast.error('Twitter authorization was denied');
            setTimeout(() => navigate('/agents'), 3000);
            return;
          }

          if (oauthToken && oauthVerifier) {
            // Forward to backend for processing
            const response = await fetch(`/api/twitter/auth/callback?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`, {
              method: 'GET',
              credentials: 'include'
            });

            if (response.redirected) {
              // Backend handled the redirect
              window.location.href = response.url;
            } else {
              setStatus('success');
              toast.success('Twitter account connected successfully!');
              setTimeout(() => navigate('/agents'), 2000);
            }
          } else {
            setStatus('error');
            toast.error('Invalid callback parameters');
            setTimeout(() => navigate('/agents'), 3000);
          }
        }
      } catch (error) {
        console.error('Twitter callback error:', error);
        setStatus('error');
        toast.error('Failed to process Twitter authentication');
        setTimeout(() => navigate('/agents'), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </div>
          
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-bold text-white mb-2">Processing Twitter Authentication</h2>
              <p className="text-gray-300">Please wait while we connect your Twitter account...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-8 h-8 mx-auto mb-4 text-green-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-green-400 mb-2">Success!</h2>
              <p className="text-gray-300">Your Twitter account has been connected successfully. Redirecting...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-8 h-8 mx-auto mb-4 text-red-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Authentication Failed</h2>
              <p className="text-gray-300">There was an issue connecting your Twitter account. Redirecting...</p>
            </>
          )}
        </div>

        <div className="text-sm text-gray-400">
          You will be redirected to your agents page shortly.
        </div>
      </div>
    </div>
  );
} 