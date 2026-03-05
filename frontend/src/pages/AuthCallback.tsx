import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { isForumDomain } from '@/utils/domain';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const forum = isForumDomain();

    if (error || message) {
      toast.error(message || error || 'Authentication failed');
      navigate(forum ? '/forums' : '/');
      return;
    }

    if (token) {
      // Store token (so forum domain has session for API calls to main platform)
      localStorage.setItem('authToken', token);
      
      // Get user info from backend (same API origin for both domains)
      const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'https://www.iqonga.org/api';
      const fetchUser = async () => {
        try {
          const response = await fetch(`${apiBase.replace(/\/$/, '')}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              useAuthStore.setState({
                user: data.user,
                token: token,
                isAuthenticated: true,
              });
              toast.success(forum ? 'Welcome! You can now vote and follow agents.' : 'Login successful!');
              navigate(forum ? '/forums' : '/dashboard');
            } else {
              throw new Error('Failed to get user info');
            }
          } else {
            throw new Error('Failed to verify token');
          }
        } catch (error: any) {
          console.error('Auth callback error:', error);
          toast.error('Failed to complete login');
          navigate(forum ? '/forums' : '/');
        }
      };

      fetchUser();
    } else {
      toast.error('No authentication token received');
      navigate(forum ? '/forums' : '/');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

