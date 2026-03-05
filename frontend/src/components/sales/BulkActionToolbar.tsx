import React, { useState } from 'react';
import { X, Trash2, UserPlus, Edit, Download, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BulkActionToolbarProps {
  selectedCount: number;
  entityType: 'leads' | 'deals';
  onClearSelection: () => void;
  onBulkAction: (action: string, data?: any) => Promise<void>;
}

const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  entityType,
  onClearSelection,
  onBulkAction
}) => {
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} ${entityType}?`)) return;

    try {
      setLoading(true);
      await onBulkAction('delete');
      toast.success(`${selectedCount} ${entityType} deleted successfully`);
      onClearSelection();
    } catch (error) {
      toast.error(`Failed to delete ${entityType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!assigneeEmail) {
      toast.error('Please enter an assignee email');
      return;
    }

    try {
      setLoading(true);
      await onBulkAction('assign', { assigneeEmail });
      toast.success(`${selectedCount} ${entityType} assigned successfully`);
      setShowAssignModal(false);
      setAssigneeEmail('');
      onClearSelection();
    } catch (error) {
      toast.error(`Failed to assign ${entityType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }

    try {
      setLoading(true);
      await onBulkAction('updateStatus', { status: newStatus });
      toast.success(`${selectedCount} ${entityType} updated successfully`);
      setShowStatusModal(false);
      setNewStatus('');
      onClearSelection();
    } catch (error) {
      toast.error(`Failed to update ${entityType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      setLoading(true);
      await onBulkAction('export');
      toast.success(`${entityType} exported successfully`);
    } catch (error) {
      toast.error(`Failed to export ${entityType}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-blue-600 text-white rounded-lg shadow-2xl border border-blue-500 px-6 py-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">{selectedCount} selected</span>
        </div>

        <div className="h-6 w-px bg-blue-400"></div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={loading}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center text-sm font-medium disabled:opacity-50"
            title="Assign"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Assign
          </button>

          <button
            onClick={() => setShowStatusModal(true)}
            disabled={loading}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center text-sm font-medium disabled:opacity-50"
            title="Update Status"
          >
            <Edit className="w-4 h-4 mr-1" />
            Status
          </button>

          <button
            onClick={handleBulkExport}
            disabled={loading}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center text-sm font-medium disabled:opacity-50"
            title="Export"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={loading}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center text-sm font-medium disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </button>
        </div>

        <div className="h-6 w-px bg-blue-400"></div>

        <button
          onClick={onClearSelection}
          disabled={loading}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Clear selection"
        >
          <X className="w-5 h-5" />
        </button>

        {loading && (
          <Loader2 className="w-5 h-5 animate-spin ml-2" />
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowAssignModal(false)} />
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 rounded-lg shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Assign to Team Member</h3>
              <input
                type="email"
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                placeholder="team@example.com"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowStatusModal(false)} />
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 rounded-lg shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Update Status</h3>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
              >
                <option value="">Select status...</option>
                {entityType === 'leads' ? (
                  <>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="nurturing">Nurturing</option>
                    <option value="disqualified">Disqualified</option>
                  </>
                ) : (
                  <>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </>
                )}
              </select>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkStatusUpdate}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActionToolbar;

