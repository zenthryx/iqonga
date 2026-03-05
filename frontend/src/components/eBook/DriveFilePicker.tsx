import React, { useState, useEffect } from 'react';
import { driveService, DriveFile } from '../../services/driveService';
import { toast } from 'react-hot-toast';
import {
  Folder,
  File,
  Loader,
  X,
  RefreshCw,
  CheckCircle,
  FolderOpen,
  ArrowLeft
} from 'lucide-react';

interface DriveFilePickerProps {
  onSelectFile: (file: DriveFile) => void;
  onClose: () => void;
  allowedMimeTypes?: string[];
  folderId?: string;
}

const DriveFilePicker: React.FC<DriveFilePickerProps> = ({
  onSelectFile,
  onClose,
  allowedMimeTypes,
  folderId
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(folderId);
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  useEffect(() => {
    loadFiles();
  }, [currentFolderId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const driveFiles = await driveService.listFiles(
        currentFolderId,
        undefined,
        100
      );
      
      // Filter by mime type if specified
      let filteredFiles = driveFiles;
      if (allowedMimeTypes && allowedMimeTypes.length > 0) {
        filteredFiles = driveFiles.filter(file => 
          allowedMimeTypes.some(type => file.mimeType.includes(type))
        );
      }
      
      setFiles(filteredFiles);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load Drive files');
      console.error('Drive file loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: DriveFile) => {
    if (folder.mimeType === 'application/vnd.google-apps.folder') {
      setFolderStack([...folderStack, currentFolderId || 'root']);
      setCurrentFolderId(folder.id);
      setSelectedFile(null);
    }
  };

  const handleBackClick = () => {
    if (folderStack.length > 0) {
      const newStack = [...folderStack];
      const parentFolderId = newStack.pop();
      setFolderStack(newStack);
      setCurrentFolderId(parentFolderId);
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (file: DriveFile) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onSelectFile(selectedFile);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return Folder;
    }
    return File;
  };

  const formatFileSize = (size?: string) => {
    if (!size) return '';
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-400" />
            Select File from Google Drive
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Breadcrumb */}
        {folderStack.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-300 text-sm">
              {folderStack.length > 0 ? 'Folder' : 'My Drive'}
            </span>
          </div>
        )}

        {/* File List */}
        <div className="border border-gray-700 rounded-lg bg-gray-900 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="h-6 w-6 text-purple-400 animate-spin" />
              <span className="ml-2 text-gray-300">Loading files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-400">
              <FolderOpen className="h-12 w-12 mb-2 opacity-50" />
              <p>No files found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                const isSelected = selectedFile?.id === file.id;
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                return (
                  <button
                    key={file.id}
                    onClick={() => isFolder ? handleFolderClick(file) : handleFileSelect(file)}
                    className={`w-full p-4 text-left hover:bg-gray-700 transition-colors ${
                      isSelected ? 'bg-purple-900 bg-opacity-30 border-l-4 border-purple-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 ${
                          isFolder ? 'text-blue-400' : 'text-gray-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">
                          {file.name}
                        </div>
                        {!isFolder && (
                          <div className="text-xs text-gray-400 mt-1">
                            {formatFileSize(file.size)}
                            {file.modifiedTime && (
                              <span className="ml-2">
                                • {new Date(file.modifiedTime).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-purple-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={loadFiles}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedFile}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Select File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveFilePicker;

