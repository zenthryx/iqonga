import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  PencilIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  MinusIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface ServicePricing {
  service_key: string;
  service_name: string;
  category: string;
  credit_cost: number;
  billing_unit?: 'flat' | 'second' | 'minute';
  rate?: number;
  description?: string;
}

const AdminServicePricing: React.FC = () => {
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editBillingUnit, setEditBillingUnit] = useState<'flat' | 'second' | 'minute'>('flat');
  const [editRate, setEditRate] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [quickAdjust, setQuickAdjust] = useState<{ serviceKey: string; adjustment: number } | null>(null);
  const [bulkAdjust, setBulkAdjust] = useState<{ category: string; percentage: number } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await apiService.get('/admin/service-pricing');
      if (response.success) {
        setPricing(response.data.pricing || []);
      } else {
        toast.error('Failed to load service pricing');
      }
    } catch (error: any) {
      console.error('Pricing error:', error);
      toast.error('Failed to load service pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: ServicePricing) => {
    setEditing(service.service_key);
    setEditValue(service.credit_cost);
    setEditBillingUnit(service.billing_unit || 'flat');
    setEditRate(service.rate || service.credit_cost);
  };

  const handleSave = async (serviceKey: string) => {
    if (editValue < 0 || editRate < 0) {
      toast.error('Credit cost and rate cannot be negative');
      return;
    }

    // For non-flat billing, ensure rate is set
    if (editBillingUnit !== 'flat' && editRate <= 0) {
      toast.error('Rate must be greater than 0 for per-second/per-minute billing');
      return;
    }

    setSaving(true);
    try {
      // For flat billing, credit_cost and rate should be the same
      // For non-flat billing, credit_cost is the base cost (can be 0) and rate is the per-unit cost
      const finalCreditCost = editBillingUnit === 'flat' ? editValue : (editValue || 0);
      const finalRate = editBillingUnit === 'flat' ? editValue : editRate;

      const response = await apiService.put('/admin/service-pricing', {
        service_key: serviceKey,
        credit_cost: finalCreditCost,
        billing_unit: editBillingUnit,
        rate: finalRate
      });

      if (response.success) {
        // Refresh pricing from server to ensure we have the correct values
        await fetchPricing();
        setEditing(null);
        toast.success('Pricing updated successfully');
      } else {
        toast.error('Failed to update pricing');
      }
    } catch (error: any) {
      console.error('Pricing update error:', error);
      toast.error(error.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setEditValue(0);
    setEditBillingUnit('flat');
    setEditRate(0);
  };

  const handleQuickAdjust = async (serviceKey: string, adjustment: number) => {
    const service = pricing.find(s => s.service_key === serviceKey);
    if (!service) return;

    const currentValue = service.billing_unit === 'flat' 
      ? service.credit_cost 
      : (service.rate || service.credit_cost);
    
    const newValue = Math.max(0, currentValue + adjustment);
    const roundedValue = Math.round(newValue * 100) / 100; // Round to 2 decimal places

    setQuickAdjust({ serviceKey, adjustment });
    setSaving(true);

    try {
      const finalCreditCost = service.billing_unit === 'flat' 
        ? roundedValue 
        : service.credit_cost;
      const finalRate = service.billing_unit === 'flat' 
        ? roundedValue 
        : roundedValue;

      const response = await apiService.put('/admin/service-pricing', {
        service_key: serviceKey,
        credit_cost: finalCreditCost,
        billing_unit: service.billing_unit || 'flat',
        rate: finalRate
      });

      if (response.success) {
        await fetchPricing();
        toast.success(`Price ${adjustment >= 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)} credits`);
        setQuickAdjust(null);
      } else {
        toast.error('Failed to update pricing');
      }
    } catch (error: any) {
      console.error('Quick adjust error:', error);
      toast.error(error.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
      setTimeout(() => setQuickAdjust(null), 1000);
    }
  };

  const handlePercentageAdjust = async (serviceKey: string, percentage: number) => {
    const service = pricing.find(s => s.service_key === serviceKey);
    if (!service) return;

    const currentValue = service.billing_unit === 'flat' 
      ? service.credit_cost 
      : (service.rate || service.credit_cost);
    
    const adjustment = currentValue * (percentage / 100);
    const newValue = Math.max(0, currentValue + adjustment);
    const roundedValue = Math.round(newValue * 100) / 100;

    setSaving(true);

    try {
      const finalCreditCost = service.billing_unit === 'flat' 
        ? roundedValue 
        : service.credit_cost;
      const finalRate = service.billing_unit === 'flat' 
        ? roundedValue 
        : roundedValue;

      const response = await apiService.put('/admin/service-pricing', {
        service_key: serviceKey,
        credit_cost: finalCreditCost,
        billing_unit: service.billing_unit || 'flat',
        rate: finalRate
      });

      if (response.success) {
        await fetchPricing();
        toast.success(`Price ${percentage >= 0 ? 'increased' : 'decreased'} by ${Math.abs(percentage)}%`);
      } else {
        toast.error('Failed to update pricing');
      }
    } catch (error: any) {
      console.error('Percentage adjust error:', error);
      toast.error(error.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAdjust = async (category: string, percentage: number) => {
    const categoryServices = pricing.filter(s => s.category === category);
    if (categoryServices.length === 0) {
      toast.error('No services found in this category');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const service of categoryServices) {
        const currentValue = service.billing_unit === 'flat' 
          ? service.credit_cost 
          : (service.rate || service.credit_cost);
        
        const adjustment = currentValue * (percentage / 100);
        const newValue = Math.max(0, currentValue + adjustment);
        const roundedValue = Math.round(newValue * 100) / 100;

        const finalCreditCost = service.billing_unit === 'flat' 
          ? roundedValue 
          : service.credit_cost;
        const finalRate = service.billing_unit === 'flat' 
          ? roundedValue 
          : roundedValue;

        try {
          const response = await apiService.put('/admin/service-pricing', {
            service_key: service.service_key,
            credit_cost: finalCreditCost,
            billing_unit: service.billing_unit || 'flat',
            rate: finalRate
          });

          if (response.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      await fetchPricing();
      
      if (errorCount === 0) {
        toast.success(`Updated ${successCount} services: ${percentage >= 0 ? '+' : ''}${percentage}%`);
      } else {
        toast.error(`Updated ${successCount} services, ${errorCount} failed`);
      }
      
      setShowBulkModal(false);
      setBulkAdjust(null);
    } catch (error: any) {
      console.error('Bulk adjust error:', error);
      toast.error('Failed to update some services');
    } finally {
      setSaving(false);
    }
  };

  const groupedPricing = pricing.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, ServicePricing[]>);

  const categories = Object.keys(groupedPricing);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Pricing</h1>
          <p className="text-gray-400 mt-1">Configure credit costs for all platform services</p>
        </div>
        <button
          onClick={() => {
            setShowBulkModal(true);
            setSelectedCategory('');
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
          <span>Bulk Adjust</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start">
          <CurrencyDollarIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-300 mb-1">Pricing Information</p>
            <p className="text-sm text-gray-400">
              These credit costs are applied when users use each service. Changes take effect immediately for new requests.
              Use the increment/decrement buttons for quick adjustments, or click edit for full control.
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Adjust Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Bulk Price Adjustment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Adjustment Percentage
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[-25, -10, 10, 25].map(pct => (
                    <button
                      key={pct}
                      onClick={() => {
                        if (selectedCategory) {
                          handleBulkAdjust(selectedCategory, pct);
                        } else {
                          toast.error('Please select a category');
                        }
                      }}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        pct < 0
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {pct >= 0 ? '+' : ''}{pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Custom percentage"
                  onChange={(e) => {
                    const pct = parseFloat(e.target.value);
                    if (!isNaN(pct) && selectedCategory) {
                      handleBulkAdjust(selectedCategory, pct);
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setSelectedCategory('');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing by Category */}
      {Object.entries(groupedPricing).map(([category, services]) => (
        <div key={category} className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white capitalize">{category}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">{services.length} services</span>
              <button
                onClick={() => {
                  setShowBulkModal(true);
                  setSelectedCategory(category);
                }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Adjust All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Quick Adjust
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {services.map((service) => {
                  const isEditing = editing === service.service_key;
                  const isAdjusting = quickAdjust?.serviceKey === service.service_key;
                  const currentValue = service.billing_unit === 'flat' 
                    ? service.credit_cost 
                    : (service.rate || service.credit_cost);
                  
                  return (
                    <tr key={service.service_key} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{service.service_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{service.service_key}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {service.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={editBillingUnit}
                                onChange={(e) => {
                                  const unit = e.target.value as 'flat' | 'second' | 'minute';
                                  setEditBillingUnit(unit);
                                  if (unit === 'flat') {
                                    setEditRate(editValue);
                                  } else {
                                    if (editValue === 0 && editRate === 0) {
                                      setEditRate(editValue || 1);
                                    }
                                  }
                                }}
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="flat">Flat</option>
                                <option value="second">Per Second</option>
                                <option value="minute">Per Minute</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={editBillingUnit === 'flat' ? editValue : editRate}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  if (editBillingUnit === 'flat') {
                                    setEditValue(val);
                                    setEditRate(val);
                                  } else {
                                    setEditRate(val);
                                  }
                                }}
                                min="0"
                                className="w-24 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-400">
                                {editBillingUnit === 'flat' ? 'credits' : `credits/${editBillingUnit}`}
                              </span>
                            </div>
                            {editBillingUnit !== 'flat' && (
                              <div className="text-xs text-gray-500">
                                Base cost: {editValue} credits
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <CurrencyDollarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="text-sm font-medium text-white">
                                {service.billing_unit === 'flat' 
                                  ? service.credit_cost 
                                  : `${service.rate || service.credit_cost} credits/${service.billing_unit}`}
                              </span>
                            </div>
                            {service.billing_unit !== 'flat' && service.billing_unit && (
                              <div className="text-xs text-gray-500">
                                Base: {service.credit_cost} credits
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!isEditing && (
                          <div className="flex items-center space-x-2">
                            {/* Increment/Decrement Buttons */}
                            <div className="flex items-center space-x-1 border border-gray-600 rounded">
                              <button
                                onClick={() => handleQuickAdjust(service.service_key, -1)}
                                disabled={isAdjusting || saving}
                                className="px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                                title="Decrease by 1"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleQuickAdjust(service.service_key, 1)}
                                disabled={isAdjusting || saving}
                                className="px-2 py-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 disabled:opacity-50 transition-colors"
                                title="Increase by 1"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Percentage Buttons */}
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handlePercentageAdjust(service.service_key, -10)}
                                disabled={isAdjusting || saving}
                                className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition-colors rounded"
                                title="Decrease by 10%"
                              >
                                -10%
                              </button>
                              <button
                                onClick={() => handlePercentageAdjust(service.service_key, 10)}
                                disabled={isAdjusting || saving}
                                className="px-2 py-1 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10 disabled:opacity-50 transition-colors rounded"
                                title="Increase by 10%"
                              >
                                +10%
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(service.service_key)}
                              disabled={saving}
                              className="text-green-400 hover:text-green-300 disabled:opacity-50"
                              title="Save"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={saving}
                              className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                              title="Cancel"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {pricing.length === 0 && (
        <div className="text-center py-12">
          <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No pricing configured</h3>
          <p className="text-gray-500">Service pricing will appear here once configured</p>
        </div>
      )}
    </div>
  );
};

export default AdminServicePricing;
