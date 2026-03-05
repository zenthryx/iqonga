import React, { useState, useEffect } from 'react';
import { Plus, Folder, Edit, Trash2, Hash, Tag, TrendingUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { keywordIntelligenceService, KeywordCollection, KeywordMonitor } from '../../services/keywordIntelligenceService';

interface CollectionsManagerProps {
  monitors: KeywordMonitor[];
  onMonitorUpdate?: () => void;
}

const CollectionsManager: React.FC<CollectionsManagerProps> = ({ monitors, onMonitorUpdate }) => {
  const [collections, setCollections] = useState<KeywordCollection[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<KeywordCollection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const response = await keywordIntelligenceService.getCollections();
      if (response.data) {
        setCollections(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      const response = await keywordIntelligenceService.createCollection({
        name: newCollectionName,
        description: newCollectionDescription,
        color: newCollectionColor,
      });
      if (response.data) {
        toast.success('Collection created successfully!');
        setShowCreateModal(false);
        setNewCollectionName('');
        setNewCollectionDescription('');
        loadCollections();
      }
    } catch (error: any) {
      toast.error('Failed to create collection: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection? Monitors will not be deleted.')) return;
    try {
      await keywordIntelligenceService.deleteCollection(id);
      toast.success('Collection deleted');
      loadCollections();
    } catch (error: any) {
      toast.error('Failed to delete collection');
    }
  };

  const handleAddMonitorToCollection = async (monitorId: string, collectionId: string) => {
    try {
      const monitor = monitors.find(m => m.id === monitorId);
      if (!monitor) return;

      await keywordIntelligenceService.updateMonitor(monitorId, {
        collection_id: collectionId,
      });
      toast.success('Monitor added to collection');
      if (onMonitorUpdate) onMonitorUpdate();
    } catch (error: any) {
      toast.error('Failed to add monitor to collection');
    }
  };

  const handleRemoveMonitorFromCollection = async (monitorId: string) => {
    try {
      await keywordIntelligenceService.updateMonitor(monitorId, {
        collection_id: undefined,
      });
      toast.success('Monitor removed from collection');
      if (onMonitorUpdate) onMonitorUpdate();
    } catch (error: any) {
      toast.error('Failed to remove monitor from collection');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Collections
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Folder className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2">No Collections Yet</h3>
          <p className="text-gray-400 mb-4">Organize your monitors into collections for better management</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Create Your First Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => {
            const collectionMonitors = monitors.filter(m => m.collection_id === collection.id);
            return (
              <div
                key={collection.id}
                className="bg-gray-800 rounded-lg p-4 border-l-4"
                style={{ borderLeftColor: collection.color || '#3B82F6' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{collection.name}</h4>
                    {collection.description && (
                      <p className="text-sm text-gray-400 mb-2">{collection.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{collectionMonitors.length} monitors</span>
                      {collection.total_mentions > 0 && (
                        <>
                          <span>•</span>
                          <span>{collection.total_mentions.toLocaleString()} mentions</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCollection(collection.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Monitors in Collection */}
                {collectionMonitors.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {collectionMonitors.slice(0, 3).map((monitor) => (
                      <div
                        key={monitor.id}
                        className="flex items-center justify-between bg-gray-700 rounded p-2 text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {monitor.monitor_type === 'hashtag' ? (
                            <Hash className="h-3 w-3 text-blue-400 flex-shrink-0" />
                          ) : (
                            <Tag className="h-3 w-3 text-green-400 flex-shrink-0" />
                          )}
                          <span className="text-gray-300 truncate">{monitor.keyword}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMonitorFromCollection(monitor.id)}
                          className="text-gray-500 hover:text-red-400 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {collectionMonitors.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{collectionMonitors.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-2">No monitors in this collection</p>
                )}

                {/* Add Monitor Dropdown */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddMonitorToCollection(e.target.value, collection.id);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="">Add monitor to collection...</option>
                    {monitors
                      .filter(m => !m.collection_id || m.collection_id !== collection.id)
                      .map(monitor => (
                        <option key={monitor.id} value={monitor.id}>
                          {monitor.monitor_type === 'hashtag' ? '#' : ''}{monitor.keyword}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Create Collection</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCollectionName('');
                  setNewCollectionDescription('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Marketing Campaigns"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCollectionColor}
                    onChange={(e) => setNewCollectionColor(e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCollectionColor}
                    onChange={(e) => setNewCollectionColor(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCollectionName('');
                    setNewCollectionDescription('');
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsManager;


