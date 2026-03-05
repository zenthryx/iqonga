import { ApiResponse, User } from '@/types';
import { apiService } from './api';
import { getApiBaseUrl } from '@/utils/domain';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  walletAddress?: string; // Optional - email users don't need wallet
}

interface WalletLoginRequest {
  walletAddress: string;
  signature: string;
}

interface RefreshTokenResponse {
  token: string;
  user: User;
}

interface VerifyEmailRequest {
  token: string;
}

interface ResetPasswordRequest {
  email: string;
}

interface ConfirmPasswordResetRequest {
  token: string;
  newPassword: string;
}

export class AuthService {
  // Login with email and password
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/auth/login', data);
  }

  // Register new user (email/password - wallet optional)
  async register(data: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/auth/register', data);
  }

  // Migrate Privy user to email/password
  async migratePrivyUser(data: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/migrate-privy', data);
  }

  // Connect wallet to existing email account
  async connectWallet(data: {
    walletAddress: string;
  }): Promise<ApiResponse<User>> {
    return apiService.post<User>('/auth/connect-wallet', data);
  }

  // Request password reset
  async requestPasswordReset(data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/forgot-password', data);
  }

  // Reset password with token
  async resetPassword(data: {
    resetToken: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/reset-password', data);
  }

  // Google OAuth login (redirect to backend)
  getGoogleAuthUrl(): string {
    const baseUrl = getApiBaseUrl().replace(/\/api\/?$/, '') || 'https://www.iqonga.org';
    return `${baseUrl}/api/auth/google`;
  }

  // Login with Solana wallet
  async loginWithWallet(data: WalletLoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/auth/wallet-login', data);
  }

  // Logout (invalidate token)
  async logout(): Promise<ApiResponse<void>> {
    return apiService.post('/auth/logout');
  }

  // Refresh authentication token
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    return apiService.post<RefreshTokenResponse>('/auth/refresh');
  }

  // Get current user profile
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/auth/me');
  }

  // Update user profile
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.patch<User>('/auth/profile', data);
  }

  // Change password
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post('/auth/change-password', data);
  }

  // Request email verification
  async requestEmailVerification(): Promise<ApiResponse<void>> {
    return apiService.post('/auth/request-verification');
  }

  // Verify email address
  async verifyEmail(data: VerifyEmailRequest): Promise<ApiResponse<void>> {
    return apiService.post('/auth/verify-email', data);
  }

  // Confirm password reset (legacy - use resetPassword instead)
  async confirmPasswordReset(data: ConfirmPasswordResetRequest): Promise<ApiResponse<void>> {
    return apiService.post('/auth/confirm-reset', data);
  }

  // Link Solana wallet to existing account
  async linkWallet(data: {
    walletAddress: string;
    signature: string;
  }): Promise<ApiResponse<User>> {
    return apiService.post<User>('/auth/link-wallet', data);
  }

  // Unlink Solana wallet from account
  async unlinkWallet(): Promise<ApiResponse<User>> {
    return apiService.post<User>('/auth/unlink-wallet');
  }

  // Get wallet message to sign for authentication
  async getWalletMessage(walletAddress: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/wallet-message', {
      walletAddress,
    });
  }

  // Check if a wallet is whitelisted
  async checkWhitelist(walletAddress: string): Promise<ApiResponse<{ isWhitelisted: boolean }>> {
    return apiService.get<{ isWhitelisted: boolean }>(`/auth/is-whitelisted/${walletAddress}`);
  }

  // Check if username is available
  async checkUsernameAvailability(username: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiService.get<{ available: boolean }>(`/auth/check-username/${username}`);
  }

  // Check if email is available
  async checkEmailAvailability(email: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiService.get<{ available: boolean }>(`/auth/check-email/${email}`);
  }

  // Delete user account
  async deleteAccount(data: { password: string }): Promise<ApiResponse<void>> {
    return apiService.post('/auth/delete-account', data);
  }

  // Get user's active sessions
  async getActiveSessions(): Promise<ApiResponse<Array<{
    id: string;
    device: string;
    location: string;
    last_active: string;
    is_current: boolean;
  }>>> {
    return apiService.get('/auth/sessions');
  }

  // Revoke a specific session
  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiService.delete(`/auth/sessions/${sessionId}`);
  }

  // Revoke all sessions except current
  async revokeAllSessions(): Promise<ApiResponse<void>> {
    return apiService.post('/auth/revoke-all-sessions');
  }

  // Two-factor authentication methods
  async enableTwoFactor(): Promise<ApiResponse<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  }>> {
    return apiService.post('/auth/2fa/enable');
  }

  async verifyTwoFactor(data: {
    token: string;
    backupCodes?: string[];
  }): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return apiService.post('/auth/2fa/verify', data);
  }

  async disableTwoFactor(data: { token: string }): Promise<ApiResponse<void>> {
    return apiService.post('/auth/2fa/disable', data);
  }

  async generateBackupCodes(): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return apiService.post('/auth/2fa/backup-codes');
  }

  // Social platform authentication
  async connectTwitter(): Promise<ApiResponse<{ authUrl: string }>> {
    return apiService.get('/auth/twitter/connect');
  }

  async connectTelegram(data: {
    chatId: string;
    token: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post('/auth/telegram/connect', data);
  }

  async disconnectPlatform(platform: string): Promise<ApiResponse<void>> {
    return apiService.delete(`/auth/platforms/${platform}`);
  }

  // Privy authentication
  async syncPrivyUser(data: {
    privyUserId: string;
    email?: string;
    googleEmail?: string;
    googleName?: string;
    solanaWallet?: string;
    ethereumWallet?: string;
  }): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/auth/privy/sync', data);
  }
}

export const authService = new AuthService(); 