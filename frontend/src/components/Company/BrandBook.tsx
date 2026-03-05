import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  PaintBrushIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import BrandExtraction from './BrandExtraction';
import CanvaIntegration from './CanvaIntegration';

interface Color {
  name: string;
  hex: string;
  usage?: string;
}

interface BrandBook {
  id: string;
  brand_name: string;
  brand_description: string;
  primary_logo_url: string;
  secondary_logo_url: string;
  favicon_url: string;
  primary_colors: Color[];
  secondary_colors: Color[];
  accent_colors: Color[];
  neutral_colors: Color[];
  primary_font: string;
  secondary_font: string;
  heading_font: string;
  body_font: string;
  brand_voice: string;
  brand_personality: string[];
  brand_values: string[];
  brand_messaging: string;
  tone_of_voice: string;
  assets: any[];
}

const BrandBook: React.FC = () => {
  const [brandBook, setBrandBook] = useState<BrandBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  // Form states
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [primaryColors, setPrimaryColors] = useState<Color[]>([]);
  const [secondaryColors, setSecondaryColors] = useState<Color[]>([]);
  const [accentColors, setAccentColors] = useState<Color[]>([]);
  const [neutralColors, setNeutralColors] = useState<Color[]>([]);
  const [primaryFont, setPrimaryFont] = useState('');
  const [secondaryFont, setSecondaryFont] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [brandPersonality, setBrandPersonality] = useState<string[]>([]);
  const [brandValues, setBrandValues] = useState<string[]>([]);
  const [brandMessaging, setBrandMessaging] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');

  useEffect(() => {
    loadBrandBook();
  }, []);

  const loadBrandBook = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/brand-book');
      if (response.success) {
        const data = response.data;
        setBrandBook(data);
        setBrandName(data.brand_name || '');
        setBrandDescription(data.brand_description || '');
        setPrimaryColors(data.primary_colors || []);
        setSecondaryColors(data.secondary_colors || []);
        setAccentColors(data.accent_colors || []);
        setNeutralColors(data.neutral_colors || []);
        setPrimaryFont(data.primary_font || '');
        setSecondaryFont(data.secondary_font || '');
        setBrandVoice(data.brand_voice || '');
        setBrandPersonality(data.brand_personality || []);
        setBrandValues(data.brand_values || []);
        setBrandMessaging(data.brand_messaging || '');
        setToneOfVoice(data.tone_of_voice || '');
      }
    } catch (error: any) {
      console.error('Failed to load brand book:', error);
      toast.error('Failed to load brand book');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = {
        brand_name: brandName,
        brand_description: brandDescription,
        primary_colors: primaryColors,
        secondary_colors: secondaryColors,
        accent_colors: accentColors,
        neutral_colors: neutralColors,
        primary_font: primaryFont,
        secondary_font: secondaryFont,
        brand_voice: brandVoice,
        brand_personality: brandPersonality,
        brand_values: brandValues,
        brand_messaging: brandMessaging,
        tone_of_voice: toneOfVoice
      };

      const brandBookId = brandBook?.id;
      if (!brandBookId) {
        toast.error('Brand book not found');
        return;
      }

      const response = await apiService.put(`/brand-book/${brandBookId}`, updates);
      if (response.success) {
        toast.success('Brand book saved successfully!');
        await loadBrandBook();
        setEditingSection(null);
      } else {
        throw new Error(response.error || 'Failed to save');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save brand book');
    } finally {
      setSaving(false);
    }
  };

  const handleColorAdd = (colorArray: Color[], setColorArray: React.Dispatch<React.SetStateAction<Color[]>>) => {
    const newColor: Color = { name: '', hex: '#000000' };
    setColorArray([...colorArray, newColor]);
  };

  const handleColorUpdate = (
    index: number,
    colorArray: Color[],
    setColorArray: React.Dispatch<React.SetStateAction<Color[]>>,
    field: keyof Color,
    value: string
  ) => {
    const updated = [...colorArray];
    updated[index] = { ...updated[index], [field]: value };
    setColorArray(updated);
  };

  const handleColorDelete = (
    index: number,
    colorArray: Color[],
    setColorArray: React.Dispatch<React.SetStateAction<Color[]>>
  ) => {
    setColorArray(colorArray.filter((_, i) => i !== index));
  };

  const handleAssetUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !brandBook) return;

    try {
      setUploadingAsset(true);
      const formData = new FormData();
      formData.append('asset', file);
      formData.append('asset_name', file.name);
      formData.append('asset_type', 'image');
      formData.append('asset_category', 'other');

      const response = await apiService.post(`/brand-book/${brandBook.id}/assets`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.success) {
        toast.success('Asset uploaded successfully!');
        await loadBrandBook();
      } else {
        throw new Error(response.error || 'Failed to upload asset');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload asset');
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleAssetDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const response = await apiService.delete(`/brand-book/assets/${assetId}`);
      if (response.success) {
        toast.success('Asset deleted successfully');
        await loadBrandBook();
      } else {
        throw new Error(response.error || 'Failed to delete asset');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete asset');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading brand book...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <PaintBrushIcon className="h-6 w-6 text-purple-400" />
            Brand Book
          </h2>
          <p className="text-gray-400 mt-1">
            Manage your brand identity, guidelines, and visual assets
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Brand Extraction Component */}
      <BrandExtraction onExtractionComplete={loadBrandBook} />

      <CanvaIntegration />

      {/* Brand Identity */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Brand Identity</h3>
          <button
            onClick={() => setEditingSection(editingSection === 'identity' ? null : 'identity')}
            className="text-purple-400 hover:text-purple-300"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
        </div>

        {editingSection === 'identity' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                rows={3}
                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-white font-medium">{brandName || 'Not set'}</p>
            <p className="text-gray-400 text-sm mt-1">{brandDescription || 'No description'}</p>
          </div>
        )}
      </div>

      {/* Color Palette */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Color Palette</h3>

        {/* Primary Colors */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-300">Primary Colors</h4>
            <button
              onClick={() => handleColorAdd(primaryColors, setPrimaryColors)}
              className="text-purple-400 hover:text-purple-300"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {primaryColors.map((color, index) => (
              <div key={index} className="flex items-center gap-3 bg-gray-600 rounded-lg p-3">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => handleColorUpdate(index, primaryColors, setPrimaryColors, 'hex', e.target.value)}
                  className="w-12 h-12 rounded border-2 border-gray-500"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => handleColorUpdate(index, primaryColors, setPrimaryColors, 'name', e.target.value)}
                    placeholder="Color name"
                    className="w-full bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white text-sm mb-1"
                  />
                  <input
                    type="text"
                    value={color.hex}
                    onChange={(e) => handleColorUpdate(index, primaryColors, setPrimaryColors, 'hex', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
                <button
                  onClick={() => handleColorDelete(index, primaryColors, setPrimaryColors)}
                  className="text-red-400 hover:text-red-300"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary Colors */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-300">Secondary Colors</h4>
            <button
              onClick={() => handleColorAdd(secondaryColors, setSecondaryColors)}
              className="text-purple-400 hover:text-purple-300"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {secondaryColors.map((color, index) => (
              <div key={index} className="flex items-center gap-3 bg-gray-600 rounded-lg p-3">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => handleColorUpdate(index, secondaryColors, setSecondaryColors, 'hex', e.target.value)}
                  className="w-12 h-12 rounded border-2 border-gray-500"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => handleColorUpdate(index, secondaryColors, setSecondaryColors, 'name', e.target.value)}
                    placeholder="Color name"
                    className="w-full bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white text-sm mb-1"
                  />
                  <input
                    type="text"
                    value={color.hex}
                    onChange={(e) => handleColorUpdate(index, secondaryColors, setSecondaryColors, 'hex', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
                <button
                  onClick={() => handleColorDelete(index, secondaryColors, setSecondaryColors)}
                  className="text-red-400 hover:text-red-300"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Typography</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Primary Font</label>
            <input
              type="text"
              value={primaryFont}
              onChange={(e) => setPrimaryFont(e.target.value)}
              placeholder="e.g., Inter, Arial"
              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Secondary Font</label>
            <input
              type="text"
              value={secondaryFont}
              onChange={(e) => setSecondaryFont(e.target.value)}
              placeholder="e.g., Roboto, Helvetica"
              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Brand Voice & Messaging */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Brand Voice & Messaging</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Brand Voice</label>
            <textarea
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              rows={3}
              placeholder="Describe your brand's voice and personality..."
              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Brand Messaging</label>
            <textarea
              value={brandMessaging}
              onChange={(e) => setBrandMessaging(e.target.value)}
              rows={3}
              placeholder="Key messaging guidelines..."
              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tone of Voice</label>
            <textarea
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
              rows={2}
              placeholder="Tone guidelines (e.g., professional, friendly, innovative)..."
              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Brand Assets */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Brand Assets</h3>
          <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors cursor-pointer">
            <ArrowUpTrayIcon className="h-5 w-5 inline mr-2" />
            Upload Asset
            <input
              type="file"
              accept="image/*"
              onChange={handleAssetUpload}
              className="hidden"
              disabled={uploadingAsset}
            />
          </label>
        </div>

        {brandBook?.assets && brandBook.assets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {brandBook.assets.map((asset) => (
              <div key={asset.id} className="bg-gray-600 rounded-lg p-3 relative group">
                <img
                  src={asset.file_url}
                  alt={asset.asset_name}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <p className="text-white text-sm truncate">{asset.asset_name}</p>
                <button
                  onClick={() => handleAssetDelete(asset.id)}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <PhotoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No assets uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandBook;

