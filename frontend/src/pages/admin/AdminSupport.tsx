import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AdminSupport: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
        <p className="text-gray-400 mt-1">Manage user support requests</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-300 mb-2">Support Tickets</h3>
        <p className="text-gray-500">Handle user support requests and issues</p>
        <p className="text-sm text-gray-600 mt-2">Coming soon...</p>
      </div>
    </div>
  );
};

export default AdminSupport;
