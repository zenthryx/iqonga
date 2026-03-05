import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Award, Calendar, Tag, ExternalLink, Star } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description?: string;
  achieved_date: string;
  category: 'award' | 'milestone' | 'certification' | 'partnership' | 'growth' | 'innovation' | 'general';
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  external_url?: string;
  image_url?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'archived';
}

const CompanyAchievements: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    achieved_date: '',
    category: 'general' as Achievement['category'],
    impact_level: 'medium' as Achievement['impact_level'],
    external_url: '',
    image_url: '',
    tags: [] as string[],
    status: 'active' as 'active' | 'inactive' | 'archived'
  });

  const categoryOptions = [
    { value: 'award', label: 'Award', icon: '🏆' },
    { value: 'milestone', label: 'Milestone', icon: '🎯' },
    { value: 'certification', label: 'Certification', icon: '📜' },
    { value: 'partnership', label: 'Partnership', icon: '🤝' },
    { value: 'growth', label: 'Growth', icon: '📈' },
    { value: 'innovation', label: 'Innovation', icon: '💡' },
    { value: 'general', label: 'General', icon: '⭐' }
  ];

  const impactLevels = [
    { value: 'low', label: 'Low', color: 'text-gray-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'critical', label: 'Critical', color: 'text-red-400' }
  ];

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/company/achievements');
      // const data = await response.json();
      
      // Mock data for now
      const mockData: Achievement[] = [
        {
          id: '1',
          title: 'Reached 10,000 Active Users',
          description: 'Our platform has successfully onboarded 10,000 active users, marking a significant milestone in our growth journey.',
          achieved_date: '2024-01-15',
          category: 'milestone',
          impact_level: 'high',
          tags: ['growth', 'users', 'milestone'],
          status: 'active'
        },
        {
          id: '2',
          title: 'Best AI Innovation Award 2024',
          description: 'Recognized by TechCrunch for outstanding innovation in AI-powered social media automation.',
          achieved_date: '2024-02-20',
          category: 'award',
          impact_level: 'critical',
          external_url: 'https://techcrunch.com/awards-2024',
          tags: ['award', 'innovation', 'recognition'],
          status: 'active'
        },
        {
          id: '3',
          title: 'ISO 27001 Security Certification',
          description: 'Achieved ISO 27001 certification for information security management systems.',
          achieved_date: '2024-01-10',
          category: 'certification',
          impact_level: 'high',
          tags: ['security', 'certification', 'compliance'],
          status: 'active'
        }
      ];
      
      setAchievements(mockData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAchievement) {
        // Update existing achievement
        // await fetch(`/api/company/achievements/${editingAchievement.id}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // });
        console.log('Update achievement:', formData);
      } else {
        // Add new achievement
        // await fetch('/api/company/achievements', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // });
        console.log('Add achievement:', formData);
      }
      
      setShowAddForm(false);
      setEditingAchievement(null);
      resetForm();
      loadAchievements();
    } catch (error) {
      console.error('Error saving achievement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this achievement?')) {
      try {
        // await fetch(`/api/company/achievements/${id}`, { method: 'DELETE' });
        console.log('Delete achievement:', id);
        loadAchievements();
      } catch (error) {
        console.error('Error deleting achievement:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      achieved_date: '',
      category: 'general',
      impact_level: 'medium',
      external_url: '',
      image_url: '',
      tags: [],
      status: 'active'
    });
  };

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      title: achievement.title,
      description: achievement.description || '',
      achieved_date: achievement.achieved_date,
      category: achievement.category,
      impact_level: achievement.impact_level,
      external_url: achievement.external_url || '',
      image_url: achievement.image_url || '',
      tags: achievement.tags || [],
      status: achievement.status
    });
    setShowAddForm(true);
  };

  const getCategoryIcon = (category: Achievement['category']) => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option?.icon || '⭐';
  };

  const getImpactColor = (level: Achievement['impact_level']) => {
    const option = impactLevels.find(opt => opt.value === level);
    return option?.color || 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-yellow-400" />
            Company Achievements
          </h2>
          <p className="text-gray-400 mt-1">
            Showcase your company's milestones, awards, and successes
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingAchievement(null);
            setShowAddForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Achievement
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingAchievement ? 'Edit Achievement' : 'Add New Achievement'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Reached 10,000 Users"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Achievement Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.achieved_date}
                  onChange={(e) => setFormData({ ...formData, achieved_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the achievement and its significance..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Achievement['category'] })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Impact Level
                </label>
                <select
                  value={formData.impact_level}
                  onChange={(e) => setFormData({ ...formData, impact_level: e.target.value as Achievement['impact_level'] })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {impactLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  External URL
                </label>
                <input
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/news"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="growth, milestone, award (comma-separated)"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {editingAchievement ? 'Update' : 'Add'} Achievement
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAchievement(null);
                  resetForm();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Achievements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getCategoryIcon(achievement.category)}</span>
                  <h3 className="text-lg font-semibold text-white">{achievement.title}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(achievement.achieved_date).toLocaleDateString()}
                  </div>
                  <div className={`flex items-center gap-1 ${getImpactColor(achievement.impact_level)}`}>
                    <Star className="h-4 w-4" />
                    {achievement.impact_level}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(achievement)}
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(achievement.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {achievement.description && (
              <p className="text-gray-300 text-sm mb-4">{achievement.description}</p>
            )}

            {achievement.tags && achievement.tags.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {achievement.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded text-xs flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {achievement.external_url && (
              <a
                href={achievement.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                View Source
              </a>
            )}
          </div>
        ))}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No achievements yet</h3>
          <p className="text-gray-500 mb-4">
            Add your company's achievements to help AI agents create more compelling content
          </p>
          <button
            onClick={() => {
              resetForm();
              setEditingAchievement(null);
              setShowAddForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Your First Achievement
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyAchievements;
