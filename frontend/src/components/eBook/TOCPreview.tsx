import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Loader,
  X,
  Download,
  Eye,
  BookOpen,
  Hash
} from 'lucide-react';

interface TOCPreviewProps {
  projectId: string;
  onClose: () => void;
}

interface TOCItem {
  chapterNumber: number;
  title: string;
  pageNumber: number;
  chapterId: string;
  wordCount: number;
}

interface TOC {
  title: string;
  items: TOCItem[];
  totalChapters: number;
  totalPages: number;
  generatedAt: string;
}

const TOCPreview: React.FC<TOCPreviewProps> = ({ projectId, onClose }) => {
  const [toc, setToc] = useState<TOC | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'html' | 'markdown'>('preview');
  const [wordsPerPage, setWordsPerPage] = useState(250);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);

  useEffect(() => {
    fetchTOC();
  }, [projectId, wordsPerPage, includePageNumbers]);

  const fetchTOC = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/content/ebook/projects/${projectId}/toc`, {
        params: {
          wordsPerPage,
          includePageNumbers
        }
      }) as any;

      if (response.success && response.toc) {
        setToc(response.toc);
      }
    } catch (error: any) {
      toast.error('Failed to generate TOC');
      console.error('Error fetching TOC:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportHTML = () => {
    if (!toc) return;

    let html = '<!DOCTYPE html>\n<html>\n<head>\n<title>Table of Contents</title>\n';
    html += '<style>\n';
    html += 'body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; }\n';
    html += '.toc-title { font-size: 2em; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }\n';
    html += '.toc-list { list-style: none; padding: 0; }\n';
    html += '.toc-item { margin: 15px 0; padding: 10px; border-bottom: 1px solid #eee; }\n';
    html += '.toc-link { text-decoration: none; color: #333; display: flex; justify-content: space-between; }\n';
    html += '.toc-chapter-title { flex: 1; }\n';
    html += '.toc-page-number { color: #666; }\n';
    html += '</style>\n</head>\n<body>\n';
    html += `<h1 class="toc-title">${toc.title}</h1>\n`;
    html += '<ul class="toc-list">\n';

    toc.items.forEach(item => {
      html += '<li class="toc-item">\n';
      html += `<a href="#chapter-${item.chapterNumber}" class="toc-link">\n`;
      html += `<span class="toc-chapter-number">${item.chapterNumber}.</span> `;
      html += `<span class="toc-chapter-title">${item.title}</span>\n`;
      if (includePageNumbers) {
        html += `<span class="toc-page-number">Page ${item.pageNumber}</span>\n`;
      }
      html += '</a>\n';
      html += '</li>\n';
    });

    html += '</ul>\n</body>\n</html>';

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-of-contents.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('TOC exported as HTML');
  };

  const handleExportMarkdown = () => {
    if (!toc) return;

    let markdown = `# ${toc.title}\n\n`;

    toc.items.forEach(item => {
      markdown += `${item.chapterNumber}. [${item.title}](#chapter-${item.chapterNumber})`;
      if (includePageNumbers) {
        markdown += ` - Page ${item.pageNumber}`;
      }
      markdown += '\n';
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-of-contents.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('TOC exported as Markdown');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6">
          <Loader className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl p-6 border border-gray-700 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-400" />
            Table of Contents
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings */}
        <div className="mb-6 p-4 bg-gray-700/50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Words per Page
              </label>
              <input
                type="number"
                value={wordsPerPage}
                onChange={(e) => setWordsPerPage(parseInt(e.target.value) || 250)}
                min="100"
                max="500"
                className="input-field w-full"
              />
            </div>
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                checked={includePageNumbers}
                onChange={(e) => setIncludePageNumbers(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded"
              />
              <label className="ml-2 text-sm text-gray-300">
                Include Page Numbers
              </label>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'preview'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Preview
          </button>
          <button
            onClick={() => setViewMode('html')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'html'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            HTML
          </button>
          <button
            onClick={() => setViewMode('markdown')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'markdown'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Markdown
          </button>
        </div>

        {/* TOC Content */}
        {toc && (
          <div className="bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto">
            {viewMode === 'preview' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2">
                  {toc.title}
                </h2>
                <ul className="space-y-2">
                  {toc.items.map((item) => (
                    <li key={item.chapterId} className="flex items-center justify-between py-2 border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-mono">{item.chapterNumber}.</span>
                        <span className="text-white">{item.title}</span>
                        <span className="text-xs text-gray-500">
                          ({item.wordCount.toLocaleString()} words)
                        </span>
                      </div>
                      {includePageNumbers && (
                        <span className="text-gray-400">Page {item.pageNumber}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t border-gray-700 text-sm text-gray-400">
                  <p>Total Chapters: {toc.totalChapters}</p>
                  <p>Total Pages: {toc.totalPages}</p>
                </div>
              </div>
            )}

            {viewMode === 'html' && (
              <pre className="text-xs text-gray-300 overflow-x-auto">
                <code>{generateHTMLCode(toc, includePageNumbers)}</code>
              </pre>
            )}

            {viewMode === 'markdown' && (
              <pre className="text-xs text-gray-300 overflow-x-auto">
                <code>{generateMarkdownCode(toc, includePageNumbers)}</code>
              </pre>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleExportHTML}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export HTML
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Markdown
          </button>
        </div>
      </div>
    </div>
  );
};

function generateHTMLCode(toc: TOC, includePageNumbers: boolean): string {
  let html = '<div class="table-of-contents">\n';
  html += `  <h1>${toc.title}</h1>\n`;
  html += '  <ul class="toc-list">\n';
  toc.items.forEach(item => {
    html += '    <li>\n';
    html += `      <a href="#chapter-${item.chapterNumber}">\n`;
    html += `        ${item.chapterNumber}. ${item.title}`;
    if (includePageNumbers) {
      html += ` - Page ${item.pageNumber}`;
    }
    html += '\n      </a>\n';
    html += '    </li>\n';
  });
  html += '  </ul>\n';
  html += '</div>';
  return html;
}

function generateMarkdownCode(toc: TOC, includePageNumbers: boolean): string {
  let markdown = `# ${toc.title}\n\n`;
  toc.items.forEach(item => {
    markdown += `${item.chapterNumber}. [${item.title}](#chapter-${item.chapterNumber})`;
    if (includePageNumbers) {
      markdown += ` - Page ${item.pageNumber}`;
    }
    markdown += '\n';
  });
  return markdown;
}

export default TOCPreview;

