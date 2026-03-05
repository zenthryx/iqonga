import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  Package,
  User,
  MapPin,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Mail
} from 'lucide-react';

interface ShopifyOrder {
  id: string;
  order_number: string;
  email: string;
  created_at: string;
  updated_at: string;
  processed_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  line_items: Array<{
    id: string;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
}

const ShopifyOrders: React.FC = () => {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, [currentPage, filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        status: filterStatus,
        search: searchTerm
      });
      
      const response = await fetch(`/api/shopify/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders();
  };

  const getFinancialStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partially_paid': return 'bg-blue-100 text-blue-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      case 'voided': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFulfillmentStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unfulfilled': return 'bg-red-100 text-red-800';
      case 'restocked': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFinancialStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'partially_paid': return <Clock className="h-4 w-4" />;
      case 'refunded': return <XCircle className="h-4 w-4" />;
      case 'voided': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-gray-600 mt-1">
            Manage your Shopify order history
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="refunded">Refunded</option>
              <option value="voided">Voided</option>
            </select>
            <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Order #{order.order_number}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {order.customer.first_name} {order.customer.last_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getFinancialStatusColor(order.financial_status)}`}>
                  {getFinancialStatusIcon(order.financial_status)}
                  <span className="capitalize">{order.financial_status.replace('_', ' ')}</span>
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getFulfillmentStatusColor(order.fulfillment_status)}`}>
                  <Package className="h-4 w-4" />
                  <span className="capitalize">{order.fulfillment_status}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              {/* Order Details */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Order Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Total: {formatCurrency(order.total_price, order.currency)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Subtotal: {formatCurrency(order.subtotal_price, order.currency)}</span>
                  </div>
                  {order.total_tax && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Tax: {formatCurrency(order.total_tax, order.currency)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Customer</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{order.customer.first_name} {order.customer.last_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{order.customer.email}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Shipping Address</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <div>
                        <div>{order.shipping_address.first_name} {order.shipping_address.last_name}</div>
                        <div>{order.shipping_address.address1}</div>
                        {order.shipping_address.address2 && (
                          <div>{order.shipping_address.address2}</div>
                        )}
                        <div>
                          {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.zip}
                        </div>
                        <div>{order.shipping_address.country}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Items ({order.line_items.length})</h4>
              <div className="space-y-2">
                {order.line_items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-gray-600">SKU: {item.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{item.quantity}x</div>
                      <div className="text-xs text-gray-600">{formatCurrency(item.price, order.currency)}</div>
                    </div>
                  </div>
                ))}
                {order.line_items.length > 3 && (
                  <div className="text-center text-sm text-gray-600 py-2">
                    +{order.line_items.length - 3} more items
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex space-x-2">
                <button className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {formatDateTime(order.updated_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            Previous
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-md text-sm ${
                    currentPage === page 
                      ? 'bg-blue-600 text-white' 
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {orders.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Orders will appear here once customers start placing them'
            }
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Orders</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ShopifyOrders;