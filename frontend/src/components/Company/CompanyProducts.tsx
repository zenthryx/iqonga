import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { PhotoIcon, TrashIcon, StarIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  key_features: string[];
  benefits: string[];
  pricing_info: string;
  target_customers: string;
  use_cases: string[];
  competitive_advantages: string[];
  status: 'active' | 'inactive';
  created_at: string;
  image_urls?: string[];
}

interface ProductImage {
  id: string;
  image_name: string;
  image_type: string;
  is_primary: boolean;
  file_url: string;
  alt_text?: string;
  caption?: string;
}

const CompanyProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string>('');
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [viewingProductImages, setViewingProductImages] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    key_features: [''],
    benefits: [''],
    pricing_info: '',
    target_customers: '',
    use_cases: [''],
    competitive_advantages: ['']
  });

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Load images when viewing product images
  useEffect(() => {
    if (viewingProductImages) {
      loadProductImages(viewingProductImages);
    }
  }, [viewingProductImages]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }
      
      console.log('Fetching products with token:', token.substring(0, 20) + '...');
      
      const response = await fetch('/api/company/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
        
        // Load images for all products
        for (const product of data.data || []) {
          await loadProductImages(product.id);
        }
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      setError('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const loadProductImages = async (productId: string) => {
    try {
      const response = await apiService.get(`/product-images/${productId}`);
      if (response.success) {
        setProductImages(prev => ({
          ...prev,
          [productId]: response.data || []
        }));
      }
    } catch (error) {
      console.error('Failed to load product images:', error);
    }
  };

  const handleImageUpload = async (productId: string, file: File) => {
    try {
      setUploadingImage(productId);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('image_name', file.name);
      formData.append('image_type', 'product');

      const response = await apiService.post(`/product-images/${productId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.success) {
        toast.success('Image uploaded successfully!');
        await loadProductImages(productId);
      } else {
        throw new Error(response.error || 'Failed to upload image');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleImageDelete = async (imageId: string, productId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await apiService.delete(`/product-images/${imageId}`);
      if (response.success) {
        toast.success('Image deleted successfully');
        await loadProductImages(productId);
      } else {
        throw new Error(response.error || 'Failed to delete image');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete image');
    }
  };

  const handleSetPrimary = async (imageId: string, productId: string) => {
    try {
      const response = await apiService.put(`/product-images/${imageId}`, { is_primary: true });
      if (response.success) {
        toast.success('Primary image updated');
        await loadProductImages(productId);
      } else {
        throw new Error(response.error || 'Failed to set primary image');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to set primary image');
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: keyof Pick<typeof formData, 'key_features' | 'benefits' | 'use_cases' | 'competitive_advantages'>, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => 
        i === index ? value : item
      )
    }));
  };

  const addArrayField = (field: keyof Pick<typeof formData, 'key_features' | 'benefits' | 'use_cases' | 'competitive_advantages'>) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }));
  };

  const removeArrayField = (field: keyof Pick<typeof formData, 'key_features' | 'benefits' | 'use_cases' | 'competitive_advantages'>, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      key_features: [''],
      benefits: [''],
      pricing_info: '',
      target_customers: '',
      use_cases: [''],
      competitive_advantages: ['']
    });
    setIsAddingProduct(false);
    setEditingProduct(null);
    setError(null); // Clear any errors
    setSuccess(''); // Clear success message
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }
      
      console.log('Submitting product with token:', token.substring(0, 20) + '...');
      
      // If editing, include the product ID
      const productData = editingProduct 
        ? { ...formData, id: editingProduct.id }
        : formData;

      const response = await fetch('/api/company/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchProducts();
          resetForm();
          // Show success message
          setSuccess(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
          setError(null); // Clear any previous errors
          // Clear success message after 3 seconds
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(result.error || 'Failed to save product');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save product');
      }
    } catch (err) {
      setError('Error saving product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      key_features: product.key_features.length > 0 ? product.key_features : [''],
      benefits: product.benefits.length > 0 ? product.benefits : [''],
      pricing_info: product.pricing_info,
      target_customers: product.target_customers,
      use_cases: product.use_cases.length > 0 ? product.use_cases : [''],
      competitive_advantages: product.competitive_advantages.length > 0 ? product.competitive_advantages : ['']
    });
    setIsAddingProduct(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`/api/company/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        await fetchProducts();
      } else {
        setError('Failed to delete product');
      }
    } catch (err) {
      setError('Error deleting product');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Products & Services</h2>
          <p className="text-gray-400">Manage your company's products and services</p>
        </div>
        <button
          onClick={() => setIsAddingProduct(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <span>+</span>
          <span>Add Product</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Add/Edit Product Form */}
      {isAddingProduct && (
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Software, Service, Product"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Customers
                  </label>
                  <input
                    type="text"
                    value={formData.target_customers}
                    onChange={(e) => handleInputChange('target_customers', e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Who is this product for?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pricing Information
                  </label>
                  <input
                    type="text"
                    value={formData.pricing_info}
                    onChange={(e) => handleInputChange('pricing_info', e.target.value)}
                    className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., $99/month, Free tier available"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe what this product does and how it helps customers..."
                  required
                />
              </div>
            </div>

            {/* Array Fields */}
            <div className="space-y-6">
              {/* Key Features */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Key Features
                </label>
                <div className="space-y-2">
                  {formData.key_features.map((feature, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleArrayFieldChange('key_features', index, e.target.value)}
                        className="flex-1 bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter key feature"
                      />
                      {formData.key_features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayField('key_features', index)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('key_features')}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    + Add Feature
                  </button>
                </div>
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Benefits
                </label>
                <div className="space-y-2">
                  {formData.benefits.map((benefit, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => handleArrayFieldChange('benefits', index, e.target.value)}
                        className="flex-1 bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter benefit"
                      />
                      {formData.benefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayField('benefits', index)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('benefits')}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    + Add Benefit
                  </button>
                </div>
              </div>

              {/* Use Cases */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Use Cases
                </label>
                <div className="space-y-2">
                  {formData.use_cases.map((useCase, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={useCase}
                        onChange={(e) => handleArrayFieldChange('use_cases', index, e.target.value)}
                        className="flex-1 bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter use case"
                      />
                      {formData.use_cases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayField('use_cases', index)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('use_cases')}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    + Add Use Case
                  </button>
                </div>
              </div>

              {/* Competitive Advantages */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Competitive Advantages
                </label>
                <div className="space-y-2">
                  {formData.competitive_advantages.map((advantage, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={advantage}
                        onChange={(e) => handleArrayFieldChange('competitive_advantages', index, e.target.value)}
                        className="flex-1 bg-gray-600 border border-gray-500 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter competitive advantage"
                      />
                      {formData.competitive_advantages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayField('competitive_advantages', index)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('competitive_advantages')}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    + Add Advantage
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Your Products ({products.length})</h3>
        
        {products.length === 0 ? (
          <div className="text-center py-12 bg-gray-700 rounded-xl">
            <div className="text-gray-400 text-4xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Products Yet</h3>
            <p className="text-gray-400 mb-4">Start by adding your first product or service</p>
            <button
              onClick={() => setIsAddingProduct(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const images = productImages[product.id] || [];
              const primaryImage = images.find(img => img.is_primary) || images[0];
              
              return (
              <div key={product.id} className="bg-gray-700 rounded-xl p-4 space-y-3">
                {/* Product Image */}
                {primaryImage ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-600">
                    <img
                      src={primaryImage.file_url}
                      alt={primaryImage.alt_text || product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => setViewingProductImages(product.id)}
                        className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded transition-colors"
                        title="Manage Images"
                      >
                        <PhotoIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-lg bg-gray-600 flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-500" />
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">{product.name}</h4>
                    {product.category && (
                      <span className="text-sm text-purple-400 bg-purple-900/20 px-2 py-1 rounded-full">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewingProductImages(product.id)}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                      title="Manage Images"
                    >
                      📷
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-300 text-sm line-clamp-3">
                  {product.description}
                </p>
                
                {product.key_features.length > 0 && product.key_features[0] && (
                  <div>
                    <span className="text-xs text-gray-400">Features:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.key_features.slice(0, 3).map((feature, index) => (
                        <span key={index} className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                      {product.key_features.length > 3 && (
                        <span className="text-xs text-gray-400">+{product.key_features.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Added {new Date(product.created_at).toLocaleDateString()}
                  </div>
                  {images.length > 0 && (
                    <div className="text-xs text-gray-400">
                      {images.length} image{images.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Product Images Modal */}
      {viewingProductImages && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Product Images - {products.find(p => p.id === viewingProductImages)?.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">Upload and manage product images</p>
              </div>
              <button
                onClick={() => setViewingProductImages(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-gray-400 text-2xl">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Upload Section */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-300">
                  Upload New Image
                </label>
                <div className="flex items-center gap-4">
                  <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors cursor-pointer">
                    <ArrowUpTrayIcon className="h-5 w-5 inline mr-2" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(viewingProductImages, file);
                        }
                      }}
                      className="hidden"
                      disabled={uploadingImage === viewingProductImages}
                    />
                  </label>
                  {uploadingImage === viewingProductImages && (
                    <span className="text-gray-400 text-sm">Uploading...</span>
                  )}
                </div>
              </div>

              {/* Images Grid */}
              {productImages[viewingProductImages] && productImages[viewingProductImages].length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productImages[viewingProductImages].map((image) => (
                    <div key={image.id} className="bg-gray-700 rounded-lg p-3 relative group">
                      <img
                        src={image.file_url}
                        alt={image.alt_text || image.image_name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      {image.is_primary && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                          Primary
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-white text-xs truncate flex-1">{image.image_name}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!image.is_primary && (
                            <button
                              onClick={() => handleSetPrimary(image.id, viewingProductImages)}
                              className="p-1 hover:bg-gray-600 rounded text-yellow-400"
                              title="Set as Primary"
                            >
                              <StarIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleImageDelete(image.id, viewingProductImages)}
                            className="p-1 hover:bg-gray-600 rounded text-red-400"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <PhotoIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No images uploaded yet</p>
                  <p className="text-sm mt-2">Upload images to use in ad generation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyProducts;
