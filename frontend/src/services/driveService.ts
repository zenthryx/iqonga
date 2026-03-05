import { apiService } from './api';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface DriveConnectionStatus {
  connected: boolean;
  email?: string;
  username?: string;
}

class DriveService {
  /**
   * Get Google Drive connection status
   */
  async getConnectionStatus(): Promise<DriveConnectionStatus> {
    try {
      const response = await apiService.get('/google-drive/status') as any;
      return {
        connected: response.connected || false,
        email: response.email,
        username: response.username
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { connected: false };
      }
      throw error;
    }
  }

  /**
   * Initiate Google Drive OAuth connection
   */
  async connect(): Promise<string> {
    try {
      const response = await apiService.get('/google-drive/auth') as any;
      if (response.authUrl) {
        // Redirect to Google OAuth
        window.location.href = response.authUrl;
        return response.authUrl;
      }
      throw new Error('No auth URL returned');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to initiate Google Drive connection');
    }
  }

  /**
   * Disconnect Google Drive
   */
  async disconnect(): Promise<void> {
    try {
      await apiService.post('/google-drive/disconnect');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to disconnect Google Drive');
    }
  }

  /**
   * List files in Google Drive
   */
  async listFiles(folderId?: string, mimeType?: string, limit: number = 50): Promise<DriveFile[]> {
    try {
      const response = await apiService.get('/google-drive/files', {
        params: {
          folderId: folderId || undefined,
          mimeType: mimeType || undefined,
          limit
        }
      }) as any;
      return response.files || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to list Drive files');
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    folderId?: string
  ): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const response = await apiService.post('/google-drive/upload', {
        filePath,
        fileName,
        mimeType,
        folderId: folderId || undefined
      }) as any;
      return {
        fileId: response.fileId,
        webViewLink: response.webViewLink
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to upload file to Drive');
    }
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(folderName: string, parentFolderId?: string): Promise<{ folderId: string; webViewLink: string }> {
    try {
      const response = await apiService.post('/google-drive/folder', {
        folderName,
        parentFolderId: parentFolderId || undefined
      }) as any;
      return {
        folderId: response.folderId,
        webViewLink: response.webViewLink
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create Drive folder');
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    try {
      const response = await apiService.get(`/google-drive/files/${fileId}`) as any;
      return response.file;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get file metadata');
    }
  }
}

export const driveService = new DriveService();

