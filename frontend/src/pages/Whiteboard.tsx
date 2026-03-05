import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  LinkIcon,
  DocumentTextIcon,
  SparklesIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface WhiteboardElement {
  id: string;
  elementType: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  content: any;
  style: any;
  zIndex: number;
}

interface Whiteboard {
  id?: string;
  name: string;
  description?: string;
  canvasData?: any;
  elements?: WhiteboardElement[];
}

const Whiteboard: React.FC = () => {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<Whiteboard | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);
  const [editingElement, setEditingElement] = useState<WhiteboardElement | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Form state
  const [whiteboardName, setWhiteboardName] = useState('');
  const [whiteboardDescription, setWhiteboardDescription] = useState('');

  // Element form state
  const [elementType, setElementType] = useState<'note' | 'image' | 'link' | 'ad_reference' | 'campaign_reference'>('note');
  const [elementContent, setElementContent] = useState('');
  const [elementUrl, setElementUrl] = useState('');
  const [elementColor, setElementColor] = useState('#FFEB3B');
  const [elementWidth, setElementWidth] = useState(200);
  const [elementHeight, setElementHeight] = useState(150);

  useEffect(() => {
    loadWhiteboards();
  }, []);

  const loadWhiteboards = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/whiteboards');
      if (response.success) {
        setWhiteboards(response.data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load whiteboards: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadWhiteboard = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/whiteboards/${id}`);
      if (response.success) {
        setSelectedWhiteboard(response.data);
        setWhiteboardName(response.data.name);
        setWhiteboardDescription(response.data.description || '');
        setIsEditing(true);
      }
    } catch (error: any) {
      toast.error('Failed to load whiteboard: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWhiteboard = () => {
    setSelectedWhiteboard(null);
    setIsCreating(true);
    setIsEditing(false);
    setWhiteboardName('');
    setWhiteboardDescription('');
  };

  const handleSaveWhiteboard = async () => {
    if (!whiteboardName.trim()) {
      toast.error('Whiteboard name is required');
      return;
    }

    try {
      setLoading(true);
      if (selectedWhiteboard?.id) {
        // Update existing
        const response = await apiService.put(`/whiteboards/${selectedWhiteboard.id}`, {
          name: whiteboardName,
          description: whiteboardDescription,
          canvasData: selectedWhiteboard.canvasData || {}
        });
        if (response.success) {
          toast.success('Whiteboard updated successfully');
          await loadWhiteboards();
          setIsCreating(false);
          setIsEditing(false);
        }
      } else {
        // Create new
        const response = await apiService.post('/whiteboards', {
          name: whiteboardName,
          description: whiteboardDescription,
          canvasData: {}
        });
        if (response.success) {
          toast.success('Whiteboard created successfully');
          await loadWhiteboards();
          await loadWhiteboard(response.data.id);
          setIsCreating(false);
        }
      }
    } catch (error: any) {
      toast.error('Failed to save whiteboard: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddElement = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedWhiteboard?.id) {
      toast.error('Please save the whiteboard first');
      return;
    }

    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setEditingElement(null);
    setElementType('note');
    setElementContent('');
    setElementUrl('');
    setElementColor('#FFEB3B');
    setElementWidth(200);
    setElementHeight(150);
    setShowElementModal(true);
    // Store position for when modal closes
    (window as any).pendingElementPosition = { x, y };
  };

  const handleSaveElement = async () => {
    if (!selectedWhiteboard?.id) return;

    const position = (window as any).pendingElementPosition || { x: 100, y: 100 };
    delete (window as any).pendingElementPosition;

    try {
      setLoading(true);
      const content: any = {};
      const style: any = { backgroundColor: elementColor };

      if (elementType === 'note') {
        if (!elementContent.trim()) {
          toast.error('Note content is required');
          return;
        }
        content.text = elementContent;
      } else if (elementType === 'link') {
        if (!elementUrl.trim()) {
          toast.error('URL is required');
          return;
        }
        content.url = elementUrl;
        content.title = elementContent || 'Link';
      } else if (elementType === 'image') {
        if (!elementUrl.trim()) {
          toast.error('Image URL is required');
          return;
        }
        content.imageUrl = elementUrl;
        content.alt = elementContent || 'Image';
      } else {
        content.referenceId = elementContent;
        content.referenceType = elementType;
      }

      const elementData = {
        elementType,
        positionX: position.x,
        positionY: position.y,
        width: elementWidth,
        height: elementHeight,
        content,
        style,
        zIndex: selectedWhiteboard.elements?.length || 0
      };

      if (editingElement?.id) {
        // Update existing element
        const response = await apiService.put(
          `/whiteboards/${selectedWhiteboard.id}/elements/${editingElement.id}`,
          elementData
        );
        if (response.success) {
          toast.success('Element updated successfully');
          await loadWhiteboard(selectedWhiteboard.id);
          setShowElementModal(false);
        }
      } else {
        // Create new element
        const response = await apiService.post(
          `/whiteboards/${selectedWhiteboard.id}/elements`,
          elementData
        );
        if (response.success) {
          toast.success('Element added successfully');
          await loadWhiteboard(selectedWhiteboard.id);
          setShowElementModal(false);
        }
      }
    } catch (error: any) {
      toast.error('Failed to save element: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteElement = async (elementId: string) => {
    if (!selectedWhiteboard?.id) return;
    if (!confirm('Are you sure you want to delete this element?')) return;

    try {
      setLoading(true);
      const response = await apiService.delete(
        `/whiteboards/${selectedWhiteboard.id}/elements/${elementId}`
      );
      if (response.success) {
        toast.success('Element deleted successfully');
        await loadWhiteboard(selectedWhiteboard.id);
      }
    } catch (error: any) {
      toast.error('Failed to delete element: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditElement = (element: WhiteboardElement) => {
    setEditingElement(element);
    setElementType(element.elementType as any);
    setElementContent(element.content.text || element.content.alt || element.content.referenceId || '');
    setElementUrl(element.content.url || element.content.imageUrl || '');
    setElementColor(element.style.backgroundColor || '#FFEB3B');
    setElementWidth(element.width || 200);
    setElementHeight(element.height || 150);
    setShowElementModal(true);
  };

  const handleDragStart = (e: React.MouseEvent, elementId: string) => {
    if (!canvasRef.current) return;
    const element = selectedWhiteboard?.elements?.find((el) => el.id === elementId);
    if (!element) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - element.positionX * zoom,
      y: e.clientY - rect.top - element.positionY * zoom
    });
    setDraggedElement(elementId);
  };

  const handleDragMove = useCallback(
    async (e: MouseEvent) => {
      if (!draggedElement || !selectedWhiteboard?.id || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - dragOffset.x) / zoom;
      const newY = (e.clientY - rect.top - dragOffset.y) / zoom;

      // Update element position optimistically
      const updatedElements = selectedWhiteboard.elements?.map((el) =>
        el.id === draggedElement ? { ...el, positionX: newX, positionY: newY } : el
      );
      setSelectedWhiteboard({ ...selectedWhiteboard, elements: updatedElements });

      // Save to backend
      try {
        await apiService.put(
          `/whiteboards/${selectedWhiteboard.id}/elements/${draggedElement}`,
          {
            positionX: newX,
            positionY: newY
          }
        );
      } catch (error) {
        // Silently fail - position will be corrected on next load
      }
    },
    [draggedElement, selectedWhiteboard, dragOffset, zoom]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedElement(null);
  }, []);

  useEffect(() => {
    if (draggedElement) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggedElement, handleDragMove, handleDragEnd]);

  const renderElement = (element: WhiteboardElement) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${element.positionX}px`,
      top: `${element.positionY}px`,
      width: element.width ? `${element.width}px` : 'auto',
      height: element.height ? `${element.height}px` : 'auto',
      backgroundColor: element.style.backgroundColor || '#FFEB3B',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      cursor: 'move',
      zIndex: element.zIndex,
      border: '2px solid transparent',
      ...(draggedElement === element.id ? { borderColor: '#3b82f6', opacity: 0.8 } : {})
    };

    return (
      <div
        key={element.id}
        style={style}
        onMouseDown={(e) => handleDragStart(e, element.id)}
        className="group hover:shadow-lg transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 uppercase">
            {element.elementType.replace('_', ' ')}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditElement(element);
              }}
              className="p-1 hover:bg-blue-100 rounded"
            >
              <PencilIcon className="h-3 w-3 text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (element.id) handleDeleteElement(element.id);
              }}
              className="p-1 hover:bg-red-100 rounded"
            >
              <TrashIcon className="h-3 w-3 text-red-600" />
            </button>
          </div>
        </div>

        {element.elementType === 'note' && (
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {element.content.text}
          </p>
        )}

        {element.elementType === 'link' && (
          <div>
            <a
              href={element.content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {element.content.title || element.content.url}
            </a>
          </div>
        )}

        {element.elementType === 'image' && (
          <img
            src={element.content.imageUrl}
            alt={element.content.alt || 'Image'}
            className="w-full h-auto rounded"
            style={{ maxHeight: '200px', objectFit: 'contain' }}
          />
        )}

        {(element.elementType === 'ad_reference' || element.elementType === 'campaign_reference') && (
          <div className="text-sm text-gray-700">
            <span className="font-medium">
              {element.elementType === 'ad_reference' ? 'Ad' : 'Campaign'}:
            </span>{' '}
            {element.content.referenceId}
          </div>
        )}
      </div>
    );
  };

  if (isCreating || isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    setSelectedWhiteboard(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {isEditing ? 'Edit Whiteboard' : 'Create Whiteboard'}
                </h1>
              </div>
              <button
                onClick={handleSaveWhiteboard}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Save Whiteboard
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Whiteboard Name *
                </label>
                <input
                  type="text"
                  value={whiteboardName}
                  onChange={(e) => setWhiteboardName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Q1 Content Ideas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={whiteboardDescription}
                  onChange={(e) => setWhiteboardDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe your planning space..."
                />
              </div>
            </div>
          </div>

          {selectedWhiteboard?.id && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Canvas</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                ref={canvasRef}
                onClick={handleAddElement}
                className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
                style={{
                  minHeight: '600px',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: `${100 / zoom}%`,
                  height: `${100 / zoom}%`
                }}
              >
                {selectedWhiteboard.elements?.map((element) => renderElement(element))}

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-gray-400">
                    <DocumentTextIcon className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Click anywhere to add an element</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Element Modal */}
        {showElementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingElement ? 'Edit Element' : 'Add Element'}
                </h2>
                <button
                  onClick={() => setShowElementModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Element Type *
                  </label>
                  <select
                    value={elementType}
                    onChange={(e) => setElementType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="note">Note</option>
                    <option value="link">Link</option>
                    <option value="image">Image</option>
                    <option value="ad_reference">Ad Reference</option>
                    <option value="campaign_reference">Campaign Reference</option>
                  </select>
                </div>

                {(elementType === 'note' || elementType === 'link' || elementType === 'image') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {elementType === 'note' ? 'Note Text' : elementType === 'link' ? 'Title' : 'Alt Text'}
                      {elementType === 'note' && ' *'}
                    </label>
                    <textarea
                      value={elementContent}
                      onChange={(e) => setElementContent(e.target.value)}
                      rows={elementType === 'note' ? 6 : 2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder={
                        elementType === 'note'
                          ? 'Enter your note...'
                          : elementType === 'link'
                          ? 'Link title'
                          : 'Image description'
                      }
                    />
                  </div>
                )}

                {(elementType === 'link' || elementType === 'image') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {elementType === 'link' ? 'URL' : 'Image URL'} *
                    </label>
                    <input
                      type="url"
                      value={elementUrl}
                      onChange={(e) => setElementUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder={elementType === 'link' ? 'https://...' : 'https://image-url.com/...'}
                    />
                  </div>
                )}

                {(elementType === 'ad_reference' || elementType === 'campaign_reference') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {elementType === 'ad_reference' ? 'Ad ID' : 'Campaign ID'} *
                    </label>
                    <input
                      type="text"
                      value={elementContent}
                      onChange={(e) => setElementContent(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter reference ID"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={elementColor}
                      onChange={(e) => setElementColor(e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={elementWidth}
                      onChange={(e) => setElementWidth(parseInt(e.target.value) || 200)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={elementHeight}
                    onChange={(e) => setElementHeight(parseInt(e.target.value) || 150)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowElementModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveElement}
                    disabled={loading}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {editingElement ? 'Update' : 'Add'} Element
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Whiteboard Planning Space
            </h1>
            <p className="text-gray-600">
              Organize your content ideas, notes, and references visually
            </p>
          </div>
          <button
            onClick={handleCreateWhiteboard}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
            Create Whiteboard
          </button>
        </div>

        {loading && whiteboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : whiteboards.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No whiteboards yet</h2>
            <p className="text-gray-500 mb-6">
              Create your first whiteboard to start organizing your ideas
            </p>
            <button
              onClick={handleCreateWhiteboard}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Whiteboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whiteboards.map((whiteboard) => (
              <div
                key={whiteboard.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => whiteboard.id && loadWhiteboard(whiteboard.id)}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{whiteboard.name}</h3>
                {whiteboard.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {whiteboard.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    {whiteboard.elements?.length || 0} elements
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (whiteboard.id) loadWhiteboard(whiteboard.id);
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    Open →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;

