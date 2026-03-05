import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  Eye,
  Edit,
  Trash2,
  Plus,
  UserCheck,
  UserX
} from 'lucide-react';

interface ShopifyCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
  orders_count: number;
  total_spent: string;
  state: string;
  note: string;
  tags: string[];
  default_address: {
    first_name: string;
    last_name: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone: string;
  };
}

const ShopifyCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<ShopifyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, filterState]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        state: filterState,
        search: searchTerm
      });
      
      const response = await fetch(`/api/shopify/customers?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'enabled': return 'bg-green-100 text-green-800';
      case 'disabled': return 'bg-red-100 text-red-800';
      case 'invited': return 'bg-yellow-100 text-yellow-800';
      case 'declined': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'enabled': return <UserCheck className="h-4 w-4" />;
      case 'disabled': return <UserX className="h-4 w-4" />;
      case 'invited': return <Mail className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-gray-600 mt-1">
            Manage your Shopify customer database
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
          <div className="flex gap-2">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All States</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="invited">Invited</option>
              <option value="declined">Declined</option>
            </select>
            <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow p-6">
            {/* Customer Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {customer.first_name} {customer.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{customer.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStateColor(customer.state)}`}>
                {getStateIcon(customer.state)}
                <span className="capitalize">{customer.state}</span>
              </span>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 mb-4">
              {customer.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
              
              {customer.default_address && (
                <div className="flex items-start space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <div>
                    <div>{customer.default_address.address1}</div>
                    {customer.default_address.address2 && (
                      <div>{customer.default_address.address2}</div>
                    )}
                    <div>
                      {customer.default_address.city}, {customer.default_address.province} {customer.default_address.zip}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(customer.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="text-sm">Orders</span>
                </div>
                <div className="font-semibold text-gray-900">{customer.orders_count}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Spent</span>
                </div>
                <div className="font-semibold text-green-600">
                  {formatCurrency(customer.total_spent)}
                </div>
              </div>
            </div>

            {/* Tags */}
            {customer.tags && customer.tags.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {customer.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {customer.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      +{customer.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t">
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
              <button className="p-2 border border-gray-300 hover:bg-gray-50 rounded-md">
                <Mail className="h-4 w-4" />
              </button>
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
      {customers.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterState !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first customer'
            }
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto">
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ShopifyCustomers;