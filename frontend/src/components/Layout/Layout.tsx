import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@/store/authStore';

const NotWhitelistedOverlay: React.FC = () => (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-8 rounded-lg bg-gray-800 border border-red-500/50 shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-3xl font-extrabold text-white">Access Denied</h2>
            <p className="mt-2 text-gray-400">Access is not available.</p>
            <p className="mt-1 text-sm text-gray-500">Please contact the administration to get access.</p>
        </div>
    </div>
);

const Layout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Whitelist check removed - all authenticated users can access the platform
  // Admin section has its own whitelist check in adminAuth middleware

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 px-6 py-3">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              <span className="text-white font-medium">Iqonga</span>
              <span className="ml-2">- A Product of</span>
              <span className="ml-1 text-blue-400 font-medium">Zenthryx AI Lab</span>
            </div>
            <div className="text-xs text-gray-500">
              Powered by Zenthryx AI Lab
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;

 