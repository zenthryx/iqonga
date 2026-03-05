import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  Share2,
  X,
  Copy,
  CheckCircle,
  Globe,
  Lock,
  Eye,
  Link,
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  Code,
  ExternalLink,
  BookOpen,
  Download,
  Loader,
  RefreshCw,
  Settings
} from 'lucide-react';

interface SharingPublishingProps {
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  coverImageUrl?: string;
  onClose: () => void;
  onUpdate?: () => void;
}

type Visibility = 'private' | 'public' | 'unlisted';

const SharingPublishing: React.FC<SharingPublishingProps> = ({
  projectId,
  projectTitle,
  projectDescription,
  coverImageUrl,
  onClose,
  onUpdate
}) => {
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [shareToken, setShareToken] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [embedCode, setEmbedCode] = useState<string>('');
  const [showEmbedCode, setShowEmbedCode] = useState(false);

  useEffect(() => {
    loadProjectSettings();
  }, [projectId]);

  useEffect(() => {
    if (shareToken) {
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/ebook/share/${shareToken}`);
      generateEmbedCode();
    }
  }, [shareToken, projectTitle, projectDescription, coverImageUrl]);

  const loadProjectSettings = async () => {
    try {
      const response = await apiService.get(`/content/ebook/projects/${projectId}`) as any;
      if (response.success && response.data) {
        setVisibility(response.data.visibility || 'private');
        setShareToken(response.data.share_token || '');
      }
    } catch (error) {
      console.error('Failed to load project settings:', error);
    }
  };

  const generateEmbedCode = () => {
    if (!shareToken) return;
    
    const embedHtml = `<iframe 
  src="${window.location.origin}/ebook/embed/${shareToken}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  allowfullscreen
  title="${projectTitle}">
</iframe>`;
    
    setEmbedCode(embedHtml);
  };

  const handleUpdateVisibility = async () => {
    setUpdating(true);
    try {
      const response = await apiService.put(
        `/content/ebook/projects/${projectId}`,
        { visibility }
      ) as any;

      if (response.success) {
        toast.success('Visibility settings updated!');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        toast.error('Failed to update visibility');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update visibility');
    } finally {
      setUpdating(false);
    }
  };

  const handleRegenerateToken = async () => {
    setRegenerating(true);
    try {
      // Regenerate share token by updating project
      const response = await apiService.put(
        `/content/ebook/projects/${projectId}`,
        { regenerateShareToken: true }
      ) as any;

      if (response.success && response.data.share_token) {
        setShareToken(response.data.share_token);
        toast.success('Share link regenerated!');
        if (onUpdate) {
          onUpdate();
        }
      } else {
        // If backend doesn't support regenerate, create a new share token manually
        // This would require backend support
        toast.error('Token regeneration not available');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate token');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) {
      toast.error('No share link available');
      return;
    }

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handleCopyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      toast.success('Embed code copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy embed code');
    });
  };

  const handleSocialShare = (platform: string) => {
    const encodedTitle = encodeURIComponent(projectTitle);
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedDescription = encodeURIComponent(projectDescription || '');

    let shareUrlPlatform = '';

    switch (platform) {
      case 'twitter':
        shareUrlPlatform = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrlPlatform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrlPlatform = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'email':
        shareUrlPlatform = `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`;
        break;
    }

    if (shareUrlPlatform) {
      window.open(shareUrlPlatform, '_blank', 'width=600,height=400');
    }
  };

  const handleCloneProject = async () => {
    try {
      const response = await apiService.post(
        `/content/ebook/projects/${projectId}/clone`,
        { newTitle: `${projectTitle} (Copy)` }
      ) as any;

      if (response.success) {
        toast.success('Project cloned successfully!');
        if (onUpdate) {
          onUpdate();
        }
        onClose();
      } else {
        toast.error('Failed to clone project');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to clone project');
    }
  };

  const getVisibilityIcon = (vis: Visibility) => {
    switch (vis) {
      case 'public':
        return Globe;
      case 'unlisted':
        return Eye;
      case 'private':
        return Lock;
    }
  };

  const getVisibilityDescription = (vis: Visibility) => {
    switch (vis) {
      case 'public':
        return 'Anyone with the link can view your eBook';
      case 'unlisted':
        return 'Only people with the link can view (not searchable)';
      case 'private':
        return 'Only you can view this eBook';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-400" />
            Share & Publish
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Visibility Settings */}
          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Visibility Settings
            </h4>

            <div className="space-y-3 mb-4">
              {(['private', 'unlisted', 'public'] as Visibility[]).map((vis) => {
                const Icon = getVisibilityIcon(vis);
                return (
                  <label
                    key={vis}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      visibility === vis
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={vis}
                      checked={visibility === vis}
                      onChange={(e) => setVisibility(e.target.value as Visibility)}
                      className="w-4 h-4 text-purple-600"
                    />
                    <Icon className={`h-5 w-5 ${
                      visibility === vis ? 'text-purple-400' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="text-white font-medium capitalize">{vis}</div>
                      <div className="text-xs text-gray-400">{getVisibilityDescription(vis)}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleUpdateVisibility}
              disabled={updating}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Save Visibility</span>
                </>
              )}
            </button>
          </div>

          {/* Share Link */}
          {(visibility === 'public' || visibility === 'unlisted') && (
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Link className="h-4 w-4" />
                Share Link
              </h4>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={handleRegenerateToken}
                  disabled={regenerating}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {regenerating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Regenerating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Regenerate Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Social Sharing */}
          {(visibility === 'public' || visibility === 'unlisted') && shareUrl && (
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <h4 className="text-sm font-medium text-white mb-4">Share on Social Media</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => handleSocialShare('twitter')}
                  className="p-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Twitter className="h-5 w-5 text-white" />
                  <span className="text-white text-sm">Twitter</span>
                </button>
                <button
                  onClick={() => handleSocialShare('facebook')}
                  className="p-3 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Facebook className="h-5 w-5 text-white" />
                  <span className="text-white text-sm">Facebook</span>
                </button>
                <button
                  onClick={() => handleSocialShare('linkedin')}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Linkedin className="h-5 w-5 text-white" />
                  <span className="text-white text-sm">LinkedIn</span>
                </button>
                <button
                  onClick={() => handleSocialShare('email')}
                  className="p-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="h-5 w-5 text-white" />
                  <span className="text-white text-sm">Email</span>
                </button>
              </div>
            </div>
          )}

          {/* Embed Code */}
          {(visibility === 'public' || visibility === 'unlisted') && shareToken && (
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed Code
                </h4>
                <button
                  onClick={() => setShowEmbedCode(!showEmbedCode)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {showEmbedCode ? 'Hide' : 'Show'}
                </button>
              </div>

              {showEmbedCode && (
                <div className="space-y-2">
                  <textarea
                    value={embedCode}
                    readOnly
                    rows={6}
                    className="input-field w-full text-xs font-mono"
                  />
                  <button
                    onClick={handleCopyEmbedCode}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Embed Code</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Publishing Platforms */}
          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Publish to Platforms
            </h4>
            <p className="text-xs text-gray-400 mb-4">
              Export your eBook and publish to major platforms
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href={`/ebook-editor/${projectId}?export=kindle`}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">Amazon Kindle</div>
                  <div className="text-xs text-gray-400">Export for Kindle</div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>

              <a
                href={`/ebook-editor/${projectId}?export=apple`}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">Apple Books</div>
                  <div className="text-xs text-gray-400">Export for iBooks</div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>

              <a
                href={`/ebook-editor/${projectId}?export=kobo`}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">Kobo</div>
                  <div className="text-xs text-gray-400">Export for Kobo</div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Clone Project */}
          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h4 className="text-sm font-medium text-white mb-2">Project Actions</h4>
            <button
              onClick={handleCloneProject}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="h-4 w-4" />
              <span>Clone Project</span>
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Create a copy of this eBook project with all chapters
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharingPublishing;

