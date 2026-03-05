import React, { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, Check, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { whatsappApi } from '../../../services/whatsappApi';

const ContactImport: React.FC = () => {
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [wabaId, setWabaId] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch accounts for selection
  const { data: accountsData } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => whatsappApi.getAccounts(),
  });

  const accounts = (accountsData as any)?.data?.accounts || [];

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (data: { wabaId: string; contacts: any[]; format: 'json' | 'csv' }) =>
      whatsappApi.importContacts(data),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      if (importFormat === 'csv') {
        parseCSV(content);
      } else {
        parseJSON(content);
      }
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (content: string) => {
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      alert('CSV must have at least a header and one data row');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const preview = lines.slice(1, 6).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });

    setPreviewData(preview);
  };

  const parseJSON = (content: string) => {
    try {
      const data = JSON.parse(content);
      const arrayData = Array.isArray(data) ? data : [data];
      setPreviewData(arrayData.slice(0, 5));
    } catch (error) {
      alert('Invalid JSON format');
      setFile(null);
      setFileContent('');
    }
  };

  const handleImport = () => {
    if (!wabaId) {
      alert('Please select a WhatsApp Business Account');
      return;
    }

    if (!fileContent) {
      alert('Please select a file first');
      return;
    }

    let contacts: any[] = [];

    if (importFormat === 'csv') {
      const lines = fileContent.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      contacts = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const contact: any = {};
        headers.forEach((header, idx) => {
          contact[header] = values[idx] || '';
        });
        return contact;
      });
    } else {
      try {
        const data = JSON.parse(fileContent);
        contacts = Array.isArray(data) ? data : [data];
      } catch (error) {
        alert('Invalid JSON format');
        return;
      }
    }

    // Map to expected format
    const mappedContacts = contacts.map((contact) => ({
      phoneNumber: contact.phone_number || contact.phoneNumber || contact.phone || '',
      name: contact.name || contact.Name || '',
      tags: contact.tags ? (typeof contact.tags === 'string' ? contact.tags.split(';').filter((t: string) => t) : contact.tags) : [],
      customFields: {
        ...(contact.email && { email: contact.email }),
        ...(contact.company && { company: contact.company }),
        ...(contact.job_title && { job_title: contact.job_title }),
      },
    }));

    importMutation.mutate({
      wabaId,
      contacts: mappedContacts,
      format: importFormat,
    });
  };

  const downloadTemplate = () => {
    const template = importFormat === 'csv' 
      ? 'phone_number,name,email,company,tags\n+1234567890,John Doe,john@example.com,Acme Inc,VIP;Customer'
      : JSON.stringify([
          {
            phone_number: '+1234567890',
            name: 'John Doe',
            email: 'john@example.com',
            company: 'Acme Inc',
            tags: 'VIP;Customer'
          }
        ], null, 2);

    const blob = new Blob([template], { type: importFormat === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-import-template.${importFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/whatsapp/contacts')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-white">Import Contacts</h1>
      </div>

      {!importResult ? (
        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Import Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={importFormat === 'csv'}
                  onChange={(e) => {
                    setImportFormat(e.target.value as 'csv');
                    setFile(null);
                    setFileContent('');
                    setPreviewData([]);
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-white">CSV</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="json"
                  checked={importFormat === 'json'}
                  onChange={(e) => {
                    setImportFormat(e.target.value as 'json');
                    setFile(null);
                    setFileContent('');
                    setPreviewData([]);
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-white">JSON</span>
              </label>
            </div>
          </div>

          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              WhatsApp Business Account *
            </label>
            <select
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              required
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an account</option>
              {accounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.phone_number} - {account.account_name || 'Unnamed'}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Upload File</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={importFormat === 'csv' ? '.csv' : '.json'}
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileContent('');
                      setPreviewData([]);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-400">
                    Click to upload {importFormat.toUpperCase()} file
                  </p>
                  <p className="text-sm text-gray-500">
                    or drag and drop
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Template Download */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white font-medium">Need a template?</p>
                <p className="text-sm text-gray-400">
                  Download a sample {importFormat.toUpperCase()} file with the correct format
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Preview (First 5 rows)</h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-gray-700 rounded-lg">
                  <thead>
                    <tr className="border-b border-gray-600">
                      {Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="text-left text-white px-4 py-2 text-sm font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-600">
                        {Object.values(row).map((value: any, valIdx) => (
                          <td key={valIdx} className="text-gray-300 px-4 py-2 text-sm">
                            {String(value || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate('/whatsapp/contacts')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || !wabaId || importMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Contacts
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-600 rounded-full p-2">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Import Complete</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Imported</p>
              <p className="text-2xl font-bold text-green-400">
                {importResult.data?.imported || 0}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-400">
                {importResult.data?.failed || 0}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Duplicates</p>
              <p className="text-2xl font-bold text-yellow-400">
                {importResult.data?.duplicates || 0}
              </p>
            </div>
          </div>

          {importResult.data?.details?.failed?.length > 0 && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-semibold">Failed Imports</h3>
              </div>
              <div className="space-y-2">
                {importResult.data.details.failed.slice(0, 10).map((item: any, idx: number) => (
                  <p key={idx} className="text-sm text-red-300">
                    {item.phoneNumber || 'Unknown'}: {item.error || 'Unknown error'}
                  </p>
                ))}
                {importResult.data.details.failed.length > 10 && (
                  <p className="text-sm text-gray-400">
                    ... and {importResult.data.details.failed.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setImportResult(null);
                setFile(null);
                setFileContent('');
                setPreviewData([]);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Import More
            </button>
            <button
              onClick={() => navigate('/whatsapp/contacts')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              View Contacts
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactImport;
