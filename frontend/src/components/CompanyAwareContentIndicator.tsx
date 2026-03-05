import React from 'react';

interface CompanyAwareContentIndicatorProps {
  isCompanyAware: boolean;
  companyName?: string;
  className?: string;
}

const CompanyAwareContentIndicator: React.FC<CompanyAwareContentIndicatorProps> = ({
  isCompanyAware,
  companyName,
  className = ''
}) => {
  if (!isCompanyAware) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200 ${className}`}>
      <svg 
        className="w-4 h-4" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
          clipRule="evenodd" 
        />
      </svg>
      <span className="font-medium">
        {companyName ? `Using ${companyName} knowledge` : 'Using company knowledge'}
      </span>
    </div>
  );
};

export default CompanyAwareContentIndicator;
