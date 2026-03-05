import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Upload, Download, Users } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';
import { WhatsAppContact, ContactFilters } from '../../../types/whatsapp';

const ContactList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ContactFilters>({
    limit: 50,
    offset: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-contacts', filters, search],
    queryFn: () => whatsappApi.getContacts({ ...filters, search }),
    placeholderData: (previousData) => previousData,
  });

  const contacts = (data as any)?.data || [];
  const total = (data as any)?.total || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Contacts</h1>
        <div className="flex gap-3">
          <Link
            to="/whatsapp/contacts/import"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Import
          </Link>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Download className="w-5 h-5" />
            Export
          </button>
          <Link
            to="/whatsapp/contacts/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Contact
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <select
            className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            onChange={(e) => setFilters({ ...filters, isOptedIn: e.target.value ? e.target.value === 'true' : undefined })}
          >
            <option value="">All Status</option>
            <option value="true">Opted In</option>
            <option value="false">Opted Out</option>
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <div className="text-gray-400 mb-4">No contacts found</div>
          <Link
            to="/whatsapp/contacts/new"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add your first contact
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Messages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {contacts.map((contact: WhatsAppContact) => (
                    <tr key={contact.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-white font-medium">
                          {contact.name || contact.profile_name || 'Unknown'}
                        </div>
                        {contact.last_message_at && (
                          <div className="text-gray-400 text-sm">
                            Last: {new Date(contact.last_message_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {contact.phone_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {contact.tags && contact.tags.length > 2 && (
                            <span className="px-2 py-1 bg-gray-600 text-gray-400 rounded text-xs">
                              +{contact.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {contact.message_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            contact.is_opted_in
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {contact.is_opted_in ? 'Opted In' : 'Opted Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Link
                            to={`/whatsapp/contacts/${contact.id}`}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            View
                          </Link>
                          <Link
                            to={`/whatsapp/messages?contact=${contact.id}`}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Message
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > filters.limit! && (
            <div className="flex justify-between items-center text-gray-400">
              <div>
                Showing {filters.offset! + 1} to {Math.min(filters.offset! + filters.limit!, total)} of {total} contacts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, offset: Math.max(0, (filters.offset || 0) - (filters.limit || 50)) })}
                  disabled={!filters.offset || filters.offset === 0}
                  className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters, offset: (filters.offset || 0) + (filters.limit || 50) })}
                  disabled={(filters.offset || 0) + (filters.limit || 50) >= total}
                  className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContactList;
