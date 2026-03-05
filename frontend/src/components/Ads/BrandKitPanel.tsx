import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  SwatchIcon,
  PhotoIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

interface BrandKitProps {
  onBrandSelect: (brandKit: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    brandName?: string;
    brandVoice?: string;
    font?: string;
  }) => void;
}

const BrandKitPanel: React.FC<BrandKitProps> = ({ onBrandSelect }) => {
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [secondaryColor, setSecondaryColor] = useState('#EC4899');
  const [customLogo, setCustomLogo] = useState('');
  const [loading, setLoading] = useState(false);

  // Preset color palettes
  const colorPalettes = [
    { name: 'Purple Haze', primary: '#8B5CF6', secondary: '#EC4899' },
    { name: 'Ocean Blue', primary: '#3B82F6', secondary: '#06B6D4' },
    { name: 'Forest Green', primary: '#10B981', secondary: '#84CC16' },
    { name: 'Sunset Orange', primary: '#F97316', secondary: '#EF4444' },
    { name: 'Midnight', primary: '#1E293B', secondary: '#475569' },
    { name: 'Royal Gold', primary: '#F59E0B', secondary: '#B45309' },
    { name: 'Hot Pink', primary: '#EC4899', secondary: '#F43F5E' },
    { name: 'Tech Blue', primary: '#0EA5E9', secondary: '#6366F1' },
  ];

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/company/profile');
      if (response.success && response.data) {
        setCompanyProfile(response.data);
        // Auto-apply company brand if available
        if (response.data.brand_color) {
          setPrimaryColor(response.data.brand_color);
        }
      }
    } catch (error) {
      console.error('Failed to load company profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBrand = () => {
    onBrandSelect({
      primaryColor,
      secondaryColor,
      logoUrl: customLogo || companyProfile?.logo_url,
      brandName: companyProfile?.company_name,
      brandVoice: companyProfile?.brand_voice,
    });
    toast.success('Brand kit applied!');
  };

  const handleSelectPalette = (palette: { primary: string; secondary: string }) => {
    setPrimaryColor(palette.primary);
    setSecondaryColor(palette.secondary);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <SwatchIcon className="h-5 w-5 text-pink-400" />
        Brand Kit
      </h3>

      {/* Company Brand (if available) */}
      {companyProfile && (
        <div className="mb-4 p-3 bg-slate-700/30 rounded-xl">
          <div className="flex items-center gap-3">
            {companyProfile.logo_url ? (
              <img
                src={companyProfile.logo_url}
                alt={companyProfile.company_name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {companyProfile.company_name?.charAt(0) || 'B'}
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-white text-sm">
                {companyProfile.company_name || 'Your Company'}
              </p>
              <p className="text-xs text-gray-400">
                {companyProfile.brand_voice || 'Professional'}
              </p>
            </div>
            <button
              onClick={handleApplyBrand}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Color Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Brand Colors
        </label>
        
        {/* Color Palettes */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {colorPalettes.map((palette) => (
            <button
              key={palette.name}
              onClick={() => handleSelectPalette(palette)}
              className={`group relative h-10 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                primaryColor === palette.primary && secondaryColor === palette.secondary
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                  : ''
              }`}
              title={palette.name}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${palette.primary} 50%, ${palette.secondary} 50%)`
                }}
              />
              {primaryColor === palette.primary && secondaryColor === palette.secondary && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <CheckIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Custom Colors */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Primary</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Secondary</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Color Preview */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-2">Preview</label>
        <div
          className="h-20 rounded-xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
          }}
        >
          <div className="h-full flex items-center justify-center text-white font-bold text-lg drop-shadow-lg">
            {companyProfile?.company_name || 'Your Brand'}
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <PhotoIcon className="h-4 w-4 inline mr-1" />
          Custom Logo URL
        </label>
        <input
          type="url"
          value={customLogo}
          onChange={(e) => setCustomLogo(e.target.value)}
          placeholder="https://... (optional)"
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApplyBrand}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        Apply Brand Kit to Ad
      </button>

      {/* Tips */}
      <div className="mt-4 p-3 bg-slate-700/20 rounded-lg">
        <p className="text-xs text-gray-400">
          💡 <strong>Tip:</strong> Your brand colors and logo will be used to guide AI-generated visuals for consistent branding across all ads.
        </p>
      </div>
    </div>
  );
};

export default BrandKitPanel;

