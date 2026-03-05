import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { getApiBaseUrl } from '@/utils/domain';
import toast from 'react-hot-toast';
import { Mail, LogIn, X, Eye, EyeOff } from 'lucide-react';

interface EmailAuthProps {
  onSuccess?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const EmailAuth: React.FC<EmailAuthProps> = ({ 
  onSuccess, 
  onClose,
  showCloseButton = true
}) => {
  const { login, register, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '';
  const isForumReturn = returnUrl && (returnUrl.includes('aiaforums.com') || returnUrl.includes('localhost'));
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'magic-code'>('magic-code');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle email/password login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      toast.success('Login successful!');
      if (isForumReturn && returnUrl) {
        const token = useAuthStore.getState().token;
        if (token) window.location.href = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
        else navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      // Error already handled by authStore
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle email/password registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({ email, password, username });
      toast.success('Registration successful!');
      if (isForumReturn && returnUrl) {
        const token = useAuthStore.getState().token;
        if (token) window.location.href = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
        else navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      // Error already handled by authStore
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google OAuth
  const handleGoogleLogin = () => {
    const googleAuthUrl = authService.getGoogleAuthUrl();
    window.location.href = googleAuthUrl;
  };

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await authService.requestPasswordReset({ email });
      if (response.success) {
        toast.success('Password reset link sent to your email!');
        setMode('login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle magic code request
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      setIsSubmitting(true);
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/auth/magic-code/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCodeSent(true);
        toast.success('Code sent to your email!');
        
        // In dev mode, show code in console
        if (data.code) {
          console.log('🔐 Magic code:', data.code);
          toast.success(`Your code: ${data.code} — enter it below to sign in`, { duration: 12000 });
        }
      } else {
        toast.error(data.error || 'Failed to send code');
      }
    } catch (error: any) {
      toast.error('Failed to send code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle magic code verification
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    try {
      setIsSubmitting(true);
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/auth/magic-code/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        useAuthStore.setState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        });
        toast.success('Login successful!');
        if (isForumReturn && returnUrl && data.token) {
          window.location.href = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(data.token)}`;
        } else {
          navigate('/dashboard');
        }
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Invalid code');
      }
    } catch (error: any) {
      toast.error('Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already authenticated, show connected state
  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="w-full p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <LogIn className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Connected</p>
                <p className="text-sm text-gray-400">Ready to use Iqonga</p>
              </div>
            </div>
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                navigate('/');
              }}
              className="px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 relative">
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'magic-code' && !codeSent && 'Sign In to Iqonga'}
            {mode === 'magic-code' && codeSent && 'Enter Verification Code'}
            {mode === 'login' && 'Sign In to Iqonga'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-gray-400 text-sm">
            {mode === 'magic-code' && !codeSent && 'Enter your email to receive a login code'}
            {mode === 'magic-code' && codeSent && `Code sent to ${email}`}
            {mode === 'login' && 'Choose your preferred login method'}
            {mode === 'register' && 'Get started with Iqonga'}
            {mode === 'forgot' && 'Enter your email to reset password'}
          </p>
        </div>

        {/* Magic Code Form */}
        {mode === 'magic-code' && !codeSent && (
          <form onSubmit={handleRequestCode} className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        )}

        {/* Magic Code Verification */}
        {mode === 'magic-code' && codeSent && (
          <form onSubmit={handleVerifyCode} className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                6-Digit Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                required
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Change email
              </button>
              <div>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={isSubmitting}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Resend code
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Email/Password Form */}
        {(mode === 'login' || mode === 'register') && (
          <form 
            onSubmit={mode === 'login' ? handleEmailLogin : handleEmailRegister}
            className="space-y-4 mb-4"
          >
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username (optional)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Choose a username"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                  placeholder={mode === 'register' ? 'Min 8 characters' : 'Password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm text-blue-400 hover:text-blue-300 text-left"
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading 
                ? 'Please wait...' 
                : mode === 'login' 
                  ? 'Sign In' 
                  : 'Create Account'}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-sm text-blue-400 hover:text-blue-300"
            >
              Back to login
            </button>
          </form>
        )}

        {/* Social Login Options */}
        {(mode === 'login' || mode === 'register') && (
          <>
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">Or</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={isSubmitting || isLoading}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </>
        )}

        {/* Toggle between login/register */}
        {(mode === 'login' || mode === 'register') && (
          <div className="mt-6 text-center text-sm">
            {mode === 'login' ? (
              <>
                <span className="text-gray-400">Don't have an account? </span>
                <button
                  onClick={() => setMode('register')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-400">Already have an account? </span>
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}

        {/* Terms and Privacy */}
        <div className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to Iqonga's{' '}
          <a href="/terms" className="text-blue-400 hover:text-blue-300">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

