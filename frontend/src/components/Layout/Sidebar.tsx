import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { 
  Home, 
  Bot, 
  Sparkles, 
  Calendar, 
  Image, 
  Video,
  Music,
  FolderOpen,
  UserCircle,
  BarChart3, 
  Building, 
  CreditCard, 
  Key, 
  MessageSquare, 
  MessageCircle,
  Instagram, 
  Youtube,
  ShoppingCart,
  Users,
  Mail,
  Megaphone,
  FileText,
  CalendarDays,
  Mic,
  User, 
  Settings,
  Zap,
  Globe,
  Download,
  Map,
  Package,
  PenTool,
  BookOpen,
  Send,
  Rocket,
  Edit,
  Layout,
  Layers,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  X,
  Hash,
  Gift,
  RefreshCw,
  Target,
  CheckSquare,
  DollarSign,
  Eye,
  Paintbrush,
  MapPin
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: 'New' | 'Plugin' | 'Bot' | 'Coming Soon';
  disabled?: boolean;
  category?: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const Sidebar: React.FC = () => {
  const { logout } = useAuthStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['core', 'productivity', 'integrations']));
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['/dashboard', '/agents']));
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false);

    /* Iqonga Phase 1: Framework core navigation only */
  const navigationSections: NavSection[] = [
    {
      id: 'core',
      title: 'Core',
      defaultOpen: true,
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'AI Agents', href: '/agents', icon: Bot },
        { name: 'Workflows', href: '/workflows', icon: Layers },
        { name: 'Agent Teams', href: '/teams', icon: Users },
        { name: 'Scheduled Posts', href: '/scheduled-posts', icon: Calendar },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Marketplace', href: '/marketplace', icon: Package },
      ]
    },
    {
      id: 'productivity',
      title: 'Productivity',
      defaultOpen: true,
      items: [
        { name: 'Company', href: '/company', icon: Building },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
      ]
    },
    {
      id: 'integrations',
      title: 'Channels & Integrations',
      defaultOpen: true,
      items: [
        { name: 'Email AI', href: '/smart-inbox', icon: Mail },
        { name: 'Telegram', href: '/telegram', icon: Send },
        { name: 'Personal Assistant', href: '/assistant', icon: MessageCircle },
      ]
    },
    {
      id: 'management',
      title: 'Management',
      defaultOpen: false,
      items: [
        { name: 'API Keys', href: '/api-keys', icon: Key },
      ]
    },
    {
      id: 'account',
      title: 'Account',
      defaultOpen: false,
      items: [
        { name: 'Profile', href: '/profile', icon: User },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
    }
  ];

  // Initialize expanded sections
  React.useEffect(() => {
    const defaultExpanded = new Set<string>();
    navigationSections.forEach(section => {
      if (section.defaultOpen) {
        defaultExpanded.add(section.id);
      }
    });
    setExpandedSections(defaultExpanded);
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleFavorite = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      // Constrain width between 200px and 600px
      const constrainedWidth = Math.max(200, Math.min(600, newWidth));
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Filter navigation based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return navigationSections;
    }

    const query = searchQuery.toLowerCase();
    return navigationSections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        section.title.toLowerCase().includes(query)
      )
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);

  // Get favorite items
  const favoriteItems = useMemo(() => {
    const allItems: NavItem[] = [];
    navigationSections.forEach(section => {
      section.items.forEach(item => {
        if (favorites.has(item.href) && !item.disabled) {
          allItems.push({ ...item, category: section.title });
        }
      });
    });
    return allItems;
  }, [favorites]);

  const renderNavItem = (item: NavItem, showFavorite: boolean = true) => {
    const isDisabled = item.disabled || false;
    const isFavorite = favorites.has(item.href);

    if (isDisabled) {
      return (
        <div
          key={item.name}
          className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-gray-500 cursor-not-allowed opacity-60"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{item.name}</span>
          </div>
          {item.badge && (
            <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ml-2 ${
              item.badge === 'Coming Soon'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-gray-500/20 text-gray-300'
            }`}>
              {item.badge}
            </span>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.name}
        to={item.href}
        className={({ isActive }) =>
          `group flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
            isActive 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`
        }
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">{item.name}</span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {showFavorite && (
            <button
              onClick={(e) => toggleFavorite(item.href, e)}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                isFavorite ? 'opacity-100 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
          {item.badge && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              item.badge === 'New' 
                ? 'bg-green-500/20 text-green-300' 
                : item.badge === 'Plugin'
                ? 'bg-blue-500/20 text-blue-300'
                : item.badge === 'Bot'
                ? 'bg-purple-500/20 text-purple-300'
                : item.badge === 'Coming Soon'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-gray-500/20 text-gray-300'
            }`}>
              {item.badge}
            </span>
          )}
        </div>
      </NavLink>
    );
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  };

  return (
    <div 
      className="bg-white/5 backdrop-blur-md border-r border-white/10 flex flex-col h-screen relative"
      style={{ width: `${sidebarWidth}px`, minWidth: '200px', maxWidth: '600px' }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <img src="/ajentrix-logo-v1.png" alt="Iqonga Logo" className="h-8 w-auto" />
          <span className="text-xl font-bold text-white">Iqonga</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">A Product of Zenthryx AI Lab</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {/* Favorites Section */}
        {favoriteItems.length > 0 && !searchQuery && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Favorites</span>
            </div>
            <div className="space-y-1">
              {favoriteItems.map(item => renderNavItem(item, false))}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        {filteredSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const hasItems = section.items.length > 0;

          if (!hasItems) return null;

          return (
            <div key={section.id} className="mb-2">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
              >
                <span>{section.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="space-y-1 mt-1">
                  {section.items.map(item => renderNavItem(item))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Platform Status - Collapsible */}
      <div className="border-t border-white/10 p-4">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors">
            <span>Platform Status</span>
            <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">WordPress</span>
              </div>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Discord</span>
              </div>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Twitter</span>
              </div>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Instagram</span>
              </div>
              <span className="text-yellow-400">Setup</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">YouTube</span>
              </div>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-300">Shopify</span>
              </div>
              <span className="text-gray-400">Q1 2026</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-300">HubSpot</span>
              </div>
              <span className="text-gray-400">Q1 2026</span>
            </div>
          </div>
        </details>
      </div>

      {/* Sign out */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleSignOut}
          className="w-full px-3 py-2 text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center space-x-3"
        >
          <Settings className="h-5 w-5" />
          <span>Sign out</span>
        </button>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-transparent'
        }`}
        style={{ zIndex: 10 }}
      />
    </div>
  );
};

export default Sidebar;
