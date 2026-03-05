import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CompanyDashboard from '../components/Company/CompanyDashboard';
import CompanyProfile from '../components/Company/CompanyProfile';
import CompanyProducts from '../components/Company/CompanyProducts';
import CompanyDocuments from '../components/Company/CompanyDocuments';
import CompanyAgents from '../components/Company/CompanyAgents';
import CompanyTeam from '../components/Company/CompanyTeam';
import CompanyAchievements from '../components/Company/CompanyAchievements';
import Web3Details from './company/Web3Details';
import CustomData from '../components/Company/CustomData';
import BrandBook from '../components/Company/BrandBook';

const Company: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Update active tab when URL parameters change
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'profile', 'products', 'documents', 'web3', 'team', 'achievements', 'agents', 'custom-data', 'brand-book'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard Overview', icon: '📊' },
    { id: 'profile', name: 'Company Profile', icon: '🏢' },
    { id: 'brand-book', name: 'Brand Book', icon: '🎨' },
    { id: 'products', name: 'Products & Services', icon: '📦' },
    { id: 'documents', name: 'Knowledge Documents', icon: '📄' },
    { id: 'web3', name: 'Web3 Details', icon: '⛓️' },
    { id: 'custom-data', name: 'Custom Data', icon: '🗄️' },
    { id: 'team', name: 'Team Members', icon: '👥' },
    { id: 'achievements', name: 'Achievements', icon: '🏆' },
    { id: 'agents', name: 'Agent Assignment', icon: '🤖' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CompanyDashboard />;
      case 'profile':
        return <CompanyProfile />;
      case 'products':
        return <CompanyProducts />;
      case 'documents':
        return <CompanyDocuments />;
      case 'web3':
        return <Web3Details />;
      case 'team':
        return <CompanyTeam />;
      case 'achievements':
        return <CompanyAchievements />;
      case 'agents':
        return <CompanyAgents />;
      case 'custom-data':
        return <CustomData />;
      case 'brand-book':
        return <BrandBook />;
      default:
        return <CompanyDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Company Knowledge Base</h1>
        <p className="text-gray-400 mt-2">
          Manage your AI agents' understanding of your business
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-xl p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Company; 