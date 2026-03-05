import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';

const AdminSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
        <p className="text-gray-400 mt-1">Configure admin settings and permissions</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <CogIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-300 mb-2">Admin Settings</h3>
        <p className="text-gray-500">Configure admin settings and system preferences</p>
        <p className="text-sm text-gray-600 mt-2">Coming soon...</p>
      </div>
    </div>
  );
};

export default AdminSettings;
