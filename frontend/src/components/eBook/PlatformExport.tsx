import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { driveService, DriveFile } from '../../services/driveService';
import { toast } from 'react-hot-toast';
import DriveFilePicker from './DriveFilePicker';
import {
  Download,
  Loader,
  X,
  Book,
  Apple,
  Globe,
  CheckCircle,
  ExternalLink,
  FileText,
  Info,
  Folder,
  FolderOpen
} from 'lucide-react';

interface PlatformExportProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}

interface PlatformResult {
  success: boolean;
  platform: string;
  packageUrl?: string;
  fileUrl?: string;
  files?: Record<string, string>;
  metadata?: any;
  instructions?: {
    steps: string[];
    requirements: string[];
    links: string[];
  };
}

const PlatformExport: React.FC<PlatformExportProps> = ({
  projectId,
  projectTitle,
  onClose
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<PlatformResult | null>(null);
  const [metadata, setMetadata] = useState({
    author: '',
    publisher: 'Self-Published',
    isbn: '',
    categories: '',
    keywords: '',
    price: ''
  });
  const [saveToDrive, setSaveToDrive] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();

  useEffect(() => {
    checkDriveConnection();
  }, []);

  const checkDriveConnection = async () => {
    try {
      const status = await driveService.getConnectionStatus();
      setDriveConnected(status.connected);
    } catch (error) {
      setDriveConnected(false);
    }
  };

  const platforms = [
    {
      id: 'kindle',
      name: 'Amazon Kindle',
      description: 'Publish to Amazon Kindle Direct Publishing',
      icon: Book,
      color: 'text-orange-400'
    },
    {
      id: 'apple',
      name: 'Apple Books',
      description: 'Publish to Apple Books (iBooks)',
      icon: Apple,
      color: 'text-gray-400'
    },
    {
      id: 'kobo',
      name: 'Kobo',
      description: 'Publish to Kobo Writing Life',
      icon: Globe,
      color: 'text-red-400'
    }
  ];

  const handleExport = async (platformId: string) => {
    setExporting(true);
    setSelectedPlatform(platformId);
    setResult(null);

    try {
      const response = await apiService.post(
        `/content/ebook/projects/${projectId}/platform/${platformId}`,
        {
          author: metadata.author || undefined,
          publisher: metadata.publisher || undefined,
          isbn: metadata.isbn || undefined,
          categories: metadata.categories ? metadata.categories.split(',').map(c => c.trim()) : undefined,
          keywords: metadata.keywords ? metadata.keywords.split(',').map(k => k.trim()) : undefined,
          price: metadata.price ? parseFloat(metadata.price) : undefined,
          saveToDrive: saveToDrive && driveConnected ? true : undefined,
          folderId: saveToDrive && driveConnected && selectedFolderId ? selectedFolderId : undefined
        }
      ) as any;

      if (response.success) {
        setResult(response);
        const platformName = platforms.find(p => p.id === platformId)?.name;
        if (saveToDrive && response.driveLink) {
          toast.success(`${platformName} package created and saved to Google Drive!`, {
            duration: 5000
          });
          // Open Drive link in new tab
          setTimeout(() => {
            window.open(response.driveLink, '_blank');
          }, 1000);
        } else {
          toast.success(`${platformName} package created successfully!`);
        }
      } else {
        toast.error(response.error || 'Failed to create package');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create package');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    window.open(url, '_blank');
  };

  const handleFolderSelect = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setSelectedFolderId(file.id);
      setShowFolderPicker(false);
      toast.success(`Selected folder: ${file.name}`);
    } else {
      toast.error('Please select a folder, not a file');
    }
  };

  return (
    <>
      {showFolderPicker && (
        <DriveFilePicker
          onSelectFile={handleFolderSelect}
          onClose={() => setShowFolderPicker(false)}
          allowedMimeTypes={['application/vnd.google-apps.folder']}
        />
      )}
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-purple-400" />
            Platform Export
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!result ? (
          <>
            {/* Platform Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-4">Select Platform</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => handleExport(platform.id)}
                      disabled={exporting}
                      className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left disabled:opacity-50"
                    >
                      <Icon className={`w-8 h-8 ${platform.color} mb-2`} />
                      <div className="font-semibold text-white mb-1">{platform.name}</div>
                      <div className="text-xs text-gray-400">{platform.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save to Drive Option */}
            {driveConnected && (
              <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="saveToDrive"
                      checked={saveToDrive}
                      onChange={(e) => {
                        setSaveToDrive(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedFolderId(undefined);
                        }
                      }}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="saveToDrive" className="flex items-center gap-2 text-white cursor-pointer">
                      <Folder className="h-4 w-4 text-green-400" />
                      <span>Save to Google Drive</span>
                    </label>
                  </div>
                  {saveToDrive && (
                    <button
                      onClick={() => setShowFolderPicker(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                    >
                      {selectedFolderId ? (
                        <>
                          <FolderOpen className="h-4 w-4" />
                          <span>Change Folder</span>
                        </>
                      ) : (
                        <>
                          <Folder className="h-4 w-4" />
                          <span>Select Folder</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {saveToDrive && selectedFolderId && (
                  <p className="text-xs text-gray-400 mt-2">
                    Files will be saved to the selected folder in Google Drive
                  </p>
                )}
              </div>
            )}

            {/* Metadata Form */}
            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-4">Book Metadata (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Author</label>
                  <input
                    type="text"
                    value={metadata.author}
                    onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                    placeholder="Author name"
                    className="input-field w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={metadata.publisher}
                    onChange={(e) => setMetadata({ ...metadata, publisher: e.target.value })}
                    placeholder="Publisher name"
                    className="input-field w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ISBN (Optional)</label>
                  <input
                    type="text"
                    value={metadata.isbn}
                    onChange={(e) => setMetadata({ ...metadata, isbn: e.target.value })}
                    placeholder="ISBN-13"
                    className="input-field w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Categories (comma-separated)</label>
                  <input
                    type="text"
                    value={metadata.categories}
                    onChange={(e) => setMetadata({ ...metadata, categories: e.target.value })}
                    placeholder="Fiction, Mystery"
                    className="input-field w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={metadata.keywords}
                    onChange={(e) => setMetadata({ ...metadata, keywords: e.target.value })}
                    placeholder="keyword1, keyword2"
                    className="input-field w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Price (Optional)</label>
                  <input
                    type="number"
                    value={metadata.price}
                    onChange={(e) => setMetadata({ ...metadata, price: e.target.value })}
                    placeholder="9.99"
                    step="0.01"
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>
            </div>

            {exporting && (
              <div className="text-center py-8">
                <Loader className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-gray-400">Preparing package for {platforms.find(p => p.id === selectedPlatform)?.name}...</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-green-400 mb-1">
                  Package Created Successfully!
                </div>
                <div className="text-sm text-gray-300">
                  Your eBook is ready for {platforms.find(p => p.id === result.platform)?.name}
                </div>
              </div>
            </div>

            {/* Files */}
            {result.files && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">Package Files</h4>
                <div className="space-y-2">
                  {Object.entries(result.files).map(([key, filename]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white">{filename}</span>
                      </div>
                      <button
                        onClick={() => handleDownload(
                          result.packageUrl || result.fileUrl || '',
                          filename
                        )}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {result.instructions && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Publishing Instructions
                </h4>
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-2">Steps:</div>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                      {result.instructions.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-2">Requirements:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      {result.instructions.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  {result.instructions.links && result.instructions.links.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-2">Helpful Links:</div>
                      <div className="space-y-1">
                        {result.instructions.links.map((link, index) => (
                          <a
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            {link}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedPlatform(null);
                }}
                className="flex-1 btn-secondary"
              >
                Export to Another Platform
              </button>
              <button
                onClick={onClose}
                className="flex-1 btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default PlatformExport;

