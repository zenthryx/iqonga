import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  GlobeAltIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface BrandExtractionProps {
  onExtractionComplete?: () => void;
}

const BrandExtraction: React.FC<BrandExtractionProps> = ({ onExtractionComplete }) => {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!websiteUrl.trim()) {
      setError('Please enter a website URL');
      toast.error('Please enter a website URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.post('/brand-extraction/extract', {
        websiteUrl: websiteUrl.trim(),
        downloadImages: true
      });

      if (response.data.success) {
        setResult(response.data.data);
        toast.success('Brand extracted successfully! Review the results below.');
        
        // Callback to refresh brand book
        if (onExtractionComplete) {
          setTimeout(() => {
            onExtractionComplete();
          }, 1000);
        }
      } else {
        throw new Error(response.data.error || 'Extraction failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to extract brand from website';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleExtract();
    }
  };

  return (
    <div className="brand-extraction bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <GlobeAltIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Extract Brand from Website</h2>
          <p className="text-sm text-gray-500">Enter your website URL and we'll automatically extract your brand colors, fonts, images, and voice.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* URL Input */}
        <div>
          <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              id="website-url"
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://yourwebsite.com or yourwebsite.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder:text-gray-400"
              disabled={loading}
            />
            <button
              onClick={handleExtract}
              disabled={loading || !websiteUrl.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  Extract Brand
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
              <XCircleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">Extraction Complete!</h3>
                <div className="space-y-2 text-sm text-green-800">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Company Name:</span>
                    <span>{result.extractedData?.companyName || 'Not found'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Colors Extracted:</span>
                    <span>
                      {result.extractedData?.colors?.primary?.length || 0} primary,{' '}
                      {result.extractedData?.colors?.secondary?.length || 0} secondary
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Images Downloaded:</span>
                    <span>{result.imagesDownloaded || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Videos Found:</span>
                    <span>{result.videosDownloaded || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Media Stored:</span>
                    <span>{result.mediaStored || 0} items in your media library</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Brand Voice:</span>
                    <span>{result.extractedData?.brandVoice?.brandVoice || 'Analyzed'}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-green-700">
                  Your brand data has been saved to your Brand Book. You can review and customize it in the sections below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>What we extract:</strong> Brand colors from CSS, company name, tagline, fonts, logos, hero images, 
            product images, videos, and brand voice analysis from your website content. All media is automatically stored in your media library for easy access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrandExtraction;
