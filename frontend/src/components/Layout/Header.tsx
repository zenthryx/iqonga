import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSelector from '../LanguageSelector';

const Header: React.FC = () => {
  return (
    <header className="relative z-50 bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src="/ajentrix-logo-v1.png" alt="Iqonga Logo" className="h-8 w-auto" />
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white">Iqonga</h1>
            <p className="text-xs text-gray-400 -mt-1">A Product of Zenthryx AI Lab</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
};

export default Header;