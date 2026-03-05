import React, { useState, useEffect } from 'react';

interface KnowledgeDocument {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  summary: string;
  content: string;
  tags: string[];
  file_path: string;
  created_at: string;
}

const CompanyDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('/api/company/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDocuments(data.data || []);
        } else {
          setError(data.error || 'Failed to fetch documents');
        }
      } else {
        setError('Failed to fetch documents');
      }
    } catch (err) {
      setError('Error fetching documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      handleFileSelection(files);
    }
  };

  const handleFileSelection = (files: File[]) => {
    // Filter for supported file types
    const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    const validFiles = files.filter(file => supportedTypes.includes(file.type) || file.name.endsWith('.md'));
    
    if (validFiles.length !== files.length) {
      setError('Some files are not supported. Please upload PDF, DOCX, TXT, or MD files only.');
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('documents', file);
      });

      const response = await fetch('/api/company/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess(`${selectedFiles.length} document(s) uploaded successfully!`);
          setSelectedFiles([]);
          setError(null);
          // Refresh documents list immediately
          await fetchDocuments();
        } else {
          setError(result.error || 'Failed to upload documents');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload documents');
      }
    } catch (err) {
      setError('Error uploading documents');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`/api/company/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Document deleted successfully!');
        await fetchDocuments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete document');
      }
    } catch (err) {
      setError('Error deleting document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Knowledge Documents</h2>
          <p className="text-gray-400">Upload and manage documents for AI agent training</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* File Upload Section */}
      <div className="bg-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Upload Documents</h3>
        
        {/* Drag & Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-purple-500 bg-purple-900/20' 
              : 'border-gray-500 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-gray-400 text-4xl mb-4">📄</div>
          <p className="text-white text-lg mb-2">Drag & drop your documents here</p>
          <p className="text-gray-400 mb-4">or click to browse files</p>
          <p className="text-sm text-gray-500">
            Supported formats: PDF, DOCX, TXT, MD (Max 10 files, 5MB each)
          </p>
          
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => e.target.files && handleFileSelection(Array.from(e.target.files))}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors mt-4"
          >
            Choose Files
          </label>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-white font-medium mb-3">Selected Files ({selectedFiles.length})</h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-600 p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">📄</span>
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSelectedFile(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={uploadDocuments}
                disabled={uploading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload Documents</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Your Documents ({documents.length})</h3>
        
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-700 rounded-xl">
            <div className="text-gray-400 text-4xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Documents Yet</h3>
            <p className="text-gray-400 mb-4">Upload documents to train your AI agents</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="bg-gray-700 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-white">{document.title}</h4>
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-900/20">
                        ✅ Ready
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                      <div>
                        <span className="font-medium">Type:</span> {document.file_type.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {formatFileSize(document.file_size)}
                      </div>
                      <div>
                        <span className="font-medium">Uploaded:</span> {new Date(document.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteDocument(document.id)}
                    className="text-red-400 hover:text-red-300 transition-colors ml-4"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>

                {/* Document Summary */}
                {document.summary && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">AI-Generated Summary</h5>
                    <p className="text-gray-300 text-sm">{document.summary}</p>
                  </div>
                )}

                {/* Content Preview */}
                {document.content && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">Content Preview</h5>
                    <p className="text-gray-300 text-sm line-clamp-3">{document.content.substring(0, 300)}...</p>
                  </div>
                )}

                {/* Tags */}
                {document.tags && document.tags.length > 0 && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-2">Tags</h5>
                    <div className="flex flex-wrap gap-2">
                      {document.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDocuments;
