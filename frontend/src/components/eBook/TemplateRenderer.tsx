import React, { useMemo } from 'react';
import { EBookChapter } from '../../services/ebookService';

interface TemplateRendererProps {
  chapter: EBookChapter;
  template?: any;
  viewMode?: 'chapter' | 'page';
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Enhanced template renderer
 * - Extracts images/videos from chapter content HTML
 * - Renders sections based on template_structure
 * - Supports text, image, video, gallery
 * - Uses flex/grid based on width hints
 * - Falls back to raw chapter content if template is missing
 * - Supports pagination for page view mode
 */
const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  chapter,
  template,
  viewMode = 'chapter',
  currentPage,
  totalPages,
  onPageChange
}) => {
  const structure = template?.template_structure;

  // Extract images and videos from chapter content and paginate content
  const { images, videos, textContent, paginatedContent } = useMemo(() => {
    const content = chapter.content || '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const images: string[] = [];
    const videos: string[] = [];
    
    // Extract all images
    doc.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src) images.push(src);
    });
    
    // Extract all videos (iframe embeds, video tags)
    doc.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').forEach(video => {
      const src = video.getAttribute('src') || (video as HTMLVideoElement).currentSrc;
      if (src) videos.push(src);
    });
    
    // Get text content (without images/videos)
    const textContent = doc.body.innerHTML;
    
    // Paginate content for page view mode
    let paginatedContent = textContent;
    if (viewMode === 'page' && currentPage && totalPages && totalPages > 1) {
      // Split content into pages based on word count (~250 words per page)
      const textOnly = doc.body.textContent || '';
      const words = textOnly.split(/\s+/).filter(Boolean);
      const wordsPerPage = Math.ceil(words.length / totalPages);
      const startWord = (currentPage - 1) * wordsPerPage;
      const endWord = Math.min(startWord + wordsPerPage, words.length);
      
      // Get HTML elements and split them
      const elements = Array.from(doc.body.children);
      let currentWordCount = 0;
      let pageStartIndex = 0;
      let pageEndIndex = elements.length;
      
      for (let i = 0; i < elements.length; i++) {
        const elementText = elements[i].textContent || '';
        const elementWordCount = elementText.split(/\s+/).filter(Boolean).length;
        
        if (currentWordCount < startWord && currentWordCount + elementWordCount >= startWord) {
          pageStartIndex = i;
        }
        if (currentWordCount < endWord && currentWordCount + elementWordCount >= endWord) {
          pageEndIndex = i + 1;
          break;
        }
        
        currentWordCount += elementWordCount;
      }
      
      // Create paginated HTML by joining selected elements
      const pageElements = elements.slice(pageStartIndex, pageEndIndex);
      paginatedContent = pageElements.map(el => el.outerHTML).join('') || textContent;
    }
    
    return { images, videos, textContent, paginatedContent };
  }, [chapter.content, viewMode, currentPage, totalPages]);

  // If no template selected or no sections, render raw content with a helper note
  if (!structure || !structure.sections || structure.sections.length === 0) {
    // Use paginated content in page view
    const contentToShow = viewMode === 'page' ? paginatedContent : chapter.content;
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          No template applied. Rendering raw chapter content.
        </div>
        <div
          className="ql-editor"
          dangerouslySetInnerHTML={{ __html: contentToShow || '' }}
        />
      </div>
    );
  }

  const renderSection = (section: any, idx: number) => {
    const widthStyle = section.width ? { flexBasis: section.width, width: section.width } : {};

    if (section.type === 'text') {
      // Use paginated content in page view, full content in chapter view
      const contentToShow = viewMode === 'page' ? paginatedContent : textContent;
      return (
        <div key={idx} className="p-3" style={widthStyle}>
          <div
            className="ql-editor"
            dangerouslySetInnerHTML={{ __html: contentToShow || chapter.content || '' }}
          />
        </div>
      );
    }

    if (section.type === 'image') {
      // Use first available image, or show placeholder
      const imageUrl = images[0] || null;
      return (
        <div key={idx} className="p-3 flex justify-center" style={widthStyle}>
          <div className="w-full">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Chapter image"
                className="w-full h-auto rounded-lg object-contain max-h-96"
              />
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded h-48 flex items-center justify-center text-gray-400">
                No image in content. Add an image to see it here.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (section.type === 'video') {
      const videoUrl = videos[0] || null;
      return (
        <div key={idx} className="p-3" style={widthStyle}>
          {videoUrl ? (
            videoUrl.includes('youtube') || videoUrl.includes('youtu.be') ? (
              <iframe
                src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                className="w-full aspect-video rounded"
                allowFullScreen
                title="Chapter video"
              />
            ) : videoUrl.includes('vimeo') ? (
              <iframe
                src={videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                className="w-full aspect-video rounded"
                allowFullScreen
                title="Chapter video"
              />
            ) : (
              <video
                src={videoUrl}
                controls
                className="w-full rounded"
              />
            )
          ) : (
            <div className="bg-black rounded aspect-video flex items-center justify-center text-gray-400">
              No video in content. Add a video to see it here.
            </div>
          )}
        </div>
      );
    }

    if (section.type === 'gallery') {
      const cols = section.columns || 3;
      const galleryImages = images.slice(0, cols * 2); // Show up to 2 rows
      return (
        <div key={idx} className="p-3 w-full">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {galleryImages.length > 0 ? (
              galleryImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Gallery image ${i + 1}`}
                  className="w-full h-32 object-cover rounded border border-gray-700"
                />
              ))
            ) : (
              [...Array(cols * 2)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-800 border border-gray-700 rounded h-32 flex items-center justify-center text-gray-500"
                >
                  No image {i + 1}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={viewMode === 'page' ? 'ebook-page-view' : ''}>
      {/* Page navigation for page view */}
      {viewMode === 'page' && totalPages && totalPages > 1 && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
          <button
            onClick={() => onPageChange && currentPage && currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={!currentPage || currentPage <= 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              Page {currentPage || 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => onPageChange && onPageChange(i + 1)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    (currentPage || 1) === i + 1 ? 'bg-purple-500' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  title={`Go to page ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => onPageChange && currentPage && currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={!currentPage || currentPage >= totalPages}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
          >
            Next →
          </button>
        </div>
      )}
      
      <div className={viewMode === 'page' ? 'page-content flex flex-wrap' : 'flex flex-wrap'}>
        {structure.sections.map((section: any, idx: number) => renderSection(section, idx))}
      </div>
    </div>
  );
};

export default TemplateRenderer;

