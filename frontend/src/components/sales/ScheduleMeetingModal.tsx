import React, { useState } from 'react';
import { X, Calendar, Clock, Users, MapPin, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  dealId?: string;
  leadEmail?: string;
  leadName?: string;
  onMeetingScheduled?: () => void;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  leadId,
  dealId,
  leadEmail = '',
  leadName = '',
  onMeetingScheduled
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: `Meeting with ${leadName}`,
    description: '',
    startTime: '',
    endTime: '',
    attendeeEmails: leadEmail,
    location: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('authToken');
      const response = await fetch('https://www.ajentrix.com/api/meeting-scheduler/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId,
          dealId,
          title: formData.title,
          description: formData.description,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          attendeeEmails: formData.attendeeEmails.split(',').map(e => e.trim()).filter(e => e),
          location: formData.location
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Meeting scheduled successfully!');
        if (onMeetingScheduled) {
          onMeetingScheduled();
        }
        handleClose();
      } else {
        toast.error(result.error || 'Failed to schedule meeting');
      }
    } catch (error: any) {
      console.error('Failed to schedule meeting:', error);
      toast.error(error.message || 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: `Meeting with ${leadName}`,
      description: '',
      startTime: '',
      endTime: '',
      attendeeEmails: leadEmail,
      location: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">
                Schedule Meeting
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Meeting Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Meeting Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Product Demo"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="Meeting agenda and notes..."
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                End Time *
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Attendee Emails */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Attendee Emails (comma separated)
              </label>
              <input
                type="text"
                value={formData.attendeeEmails}
                onChange={(e) => setFormData({ ...formData, attendeeEmails: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                Email invitations will be sent to all attendees
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location / Meeting Link
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Zoom link, office address"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <Calendar className="w-4 h-4 inline mr-1" />
                This will create a Google Calendar event and send invitations to all attendees.
                The meeting will also be logged to the activity timeline.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;

