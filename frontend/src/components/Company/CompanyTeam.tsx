import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Award, Calendar, Tag, ExternalLink } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  bio?: string;
  expertise_areas?: string[];
  social_links?: Record<string, string>;
  profile_image_url?: string;
  status: 'active' | 'inactive' | 'archived';
}

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

const CompanyTeam: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    bio: '',
    expertise_areas: [] as string[],
    social_links: {} as Record<string, string>,
    profile_image_url: '',
    status: 'active' as 'active' | 'inactive' | 'archived'
  });

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/company/team');
      // const data = await response.json();
      
      // Mock data for now
      const mockData: TeamMember[] = [
        {
          id: '1',
          name: 'John Smith',
          position: 'CEO & Founder',
          bio: 'AI expert with 10+ years in machine learning and blockchain technology.',
          expertise_areas: ['AI/ML', 'Blockchain', 'Leadership'],
          social_links: { linkedin: 'https://linkedin.com/in/johnsmith', twitter: '@johnsmith' },
          status: 'active'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          position: 'CTO',
          bio: 'Full-stack developer specializing in scalable AI systems.',
          expertise_areas: ['Backend Development', 'AI Systems', 'Architecture'],
          status: 'active'
        }
      ];
      
      setTeamMembers(mockData);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        // Update existing member
        // await fetch(`/api/company/team/${editingMember.id}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // });
        console.log('Update team member:', formData);
      } else {
        // Add new member
        // await fetch('/api/company/team', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(formData)
        // });
        console.log('Add team member:', formData);
      }
      
      setShowAddForm(false);
      setEditingMember(null);
      resetForm();
      loadTeamMembers();
    } catch (error) {
      console.error('Error saving team member:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this team member?')) {
      try {
        // await fetch(`/api/company/team/${id}`, { method: 'DELETE' });
        console.log('Delete team member:', id);
        loadTeamMembers();
      } catch (error) {
        console.error('Error deleting team member:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      bio: '',
      expertise_areas: [],
      social_links: {},
      profile_image_url: '',
      status: 'active'
    });
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      position: member.position,
      bio: member.bio || '',
      expertise_areas: member.expertise_areas || [],
      social_links: member.social_links || {},
      profile_image_url: member.profile_image_url || '',
      status: member.status
    });
    setShowAddForm(true);
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
            <Users className="h-6 w-6 text-blue-400" />
            Team Members
          </h2>
          <p className="text-gray-400 mt-1">
            Manage your team members to help AI agents create personalized content
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingMember(null);
            setShowAddForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Team Member
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position *
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of their background and expertise..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expertise Areas
              </label>
              <input
                type="text"
                value={formData.expertise_areas.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  expertise_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AI/ML, Blockchain, Leadership (comma-separated)"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {editingMember ? 'Update' : 'Add'} Team Member
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMember(null);
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

      {/* Team Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member) => (
          <div key={member.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                <p className="text-blue-400 text-sm">{member.position}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(member)}
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {member.bio && (
              <p className="text-gray-300 text-sm mb-4">{member.bio}</p>
            )}

            {member.expertise_areas && member.expertise_areas.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-2">Expertise:</p>
                <div className="flex flex-wrap gap-1">
                  {member.expertise_areas.map((area, index) => (
                    <span
                      key={index}
                      className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {member.social_links && Object.keys(member.social_links).length > 0 && (
              <div className="flex gap-2">
                {Object.entries(member.social_links).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No team members yet</h3>
          <p className="text-gray-500 mb-4">
            Add your team members to help AI agents create more personalized content
          </p>
          <button
            onClick={() => {
              resetForm();
              setEditingMember(null);
              setShowAddForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Your First Team Member
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyTeam;
