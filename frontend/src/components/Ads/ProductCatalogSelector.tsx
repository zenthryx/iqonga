import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  PlusIcon,
  CheckIcon,
  SparklesIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  title?: string;
  description: string;
  image_url?: string;
  images?: Array<{ src: string }>;
  price?: string;
  category?: string;
  product_type?: string;
  vendor?: string;
  tags?: string[];
  key_features?: string;
}

interface ProductCatalogSelectorProps {
  onProductSelect: (product: {
    productId: string;
    productName: string;
    productDescription: string;
    productImageUrl?: string;
    category?: string;
  }) => void;
  selectedProductId?: string;
}

const ProductCatalogSelector: React.FC<ProductCatalogSelectorProps> = ({
  onProductSelect,
  selectedProductId
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Load from Company Products & Services
      const response = await apiService.get('/company/products') as any;
      if (response.success) {
        setProducts(response.data || response.products || []);
      }
    } catch (error) {
      console.error('Failed to load products/services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    onProductSelect({
      productId: product.id,
      productName: product.name || product.title || '',
      productDescription: product.description || '',
      productImageUrl: product.image_url || product.images?.[0]?.src,
      category: product.category || product.product_type
    });
    toast.success(`Selected: ${product.name || product.title}`);
    setIsExpanded(false);
  };

  const filteredProducts = products.filter(product => {
    const name = (product.name || product.title || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    const category = (product.category || product.product_type || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || description.includes(query) || category.includes(query);
  });

  const getProductImage = (product: Product): string | undefined => {
    return product.image_url || product.images?.[0]?.src;
  };

  // Determine icon based on category
  const getCategoryIcon = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('service') || cat.includes('consult')) return '🛠️';
    if (cat.includes('software') || cat.includes('saas') || cat.includes('platform')) return '💻';
    if (cat.includes('course') || cat.includes('training') || cat.includes('education')) return '📚';
    if (cat.includes('content') || cat.includes('media')) return '🎬';
    return '📦';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header - Clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-5 w-5 text-purple-400" />
          <span className="font-semibold text-white">Import from Library</span>
          <span className="text-xs text-gray-500">
            ({products.length} items)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <ArrowPathIcon className="h-4 w-4 text-purple-400 animate-spin" />}
          <svg 
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <>
          {/* Search & Refresh */}
          <div className="px-4 pb-3 border-b border-slate-700/50">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, services..."
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={loadProducts}
                disabled={loading}
                className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600"
              >
                <ArrowPathIcon className={`h-5 w-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Product/Service List */}
          <div className="max-h-[280px] overflow-y-auto p-2">
            {loading && products.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProductId === product.id;
                  const imageUrl = getProductImage(product);
                  const categoryIcon = getCategoryIcon(product.category || product.product_type);
                  
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'bg-purple-600/20 border-2 border-purple-500'
                          : 'bg-slate-700/30 border-2 border-transparent hover:bg-slate-700/50'
                      }`}
                    >
                      {/* Image or Icon */}
                      <div className="w-12 h-12 rounded-lg bg-slate-600 flex-shrink-0 overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name || product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {categoryIcon}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white text-sm truncate">
                            {product.name || product.title}
                          </p>
                          {isSelected && (
                            <CheckIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {product.description?.substring(0, 50)}
                          {(product.description?.length || 0) > 50 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {(product.category || product.product_type) && (
                            <span className="text-xs px-2 py-0.5 bg-slate-600/80 rounded-full text-gray-300">
                              {product.category || product.product_type}
                            </span>
                          )}
                          {product.price && (
                            <span className="text-xs text-green-400 font-medium">
                              ${product.price}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Select indicator */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-purple-500' : 'bg-slate-600'
                      }`}>
                        {isSelected ? (
                          <CheckIcon className="h-4 w-4 text-white" />
                        ) : (
                          <PlusIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                {searchQuery ? (
                  <>
                    <MagnifyingGlassIcon className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No results for "{searchQuery}"</p>
                  </>
                ) : (
                  <>
                    <BuildingOfficeIcon className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm font-medium">No items in your library</p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">
                      Add your products, services, or offerings to quickly create ads
                    </p>
                    <a
                      href="/company?tab=products"
                      className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add to Company Library →
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="p-3 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                <SparklesIcon className="h-3 w-3 inline mr-1" />
                Items sync from WooCommerce & Company profile
              </p>
              <a 
                href="/company?tab=products" 
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Manage →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductCatalogSelector;

