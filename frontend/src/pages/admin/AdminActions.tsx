import React from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const AdminActions: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Actions</h1>
        <p className="text-gray-400 mt-1">Audit trail of administrative activities</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-300 mb-2">Admin Actions</h3>
        <p className="text-gray-500">Track all administrative actions and changes</p>
        <p className="text-sm text-gray-600 mt-2">Coming soon...</p>
      </div>
    </div>
  );
};

export default AdminActions;
