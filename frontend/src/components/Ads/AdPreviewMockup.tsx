import React, { useState } from 'react';
import {
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  PaperAirplaneIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  PlayIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon,
  ShareIcon,
  HandThumbUpIcon,
  ArrowPathRoundedSquareIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface AdPreviewProps {
  platform: string;
  format: string;
  headline: string;
  primaryText: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  callToAction: string;
  hashtags?: string[];
  brandName?: string;
  brandLogo?: string;
  aspectRatio?: string;
}

const AdPreviewMockup: React.FC<AdPreviewProps> = ({
  platform,
  format,
  headline,
  primaryText,
  description,
  imageUrl,
  videoUrl,
  callToAction,
  hashtags = [],
  brandName = 'Your Brand',
  brandLogo,
  aspectRatio = '1:1'
}) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // Random engagement numbers for realistic preview
  const likes = Math.floor(Math.random() * 5000) + 100;
  const comments = Math.floor(Math.random() * 200) + 10;
  const shares = Math.floor(Math.random() * 100) + 5;

  const renderFacebookPreview = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-[400px] overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="w-full h-full rounded-full object-cover" />
            ) : (
              brandName.charAt(0)
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{brandName}</p>
            <p className="text-xs text-gray-500">Sponsored · 🌐</p>
          </div>
        </div>
        <EllipsisHorizontalIcon className="h-5 w-5 text-gray-500" />
      </div>

      {/* Text Content */}
      <div className="px-3 pb-2">
        <p className="text-gray-900 text-sm whitespace-pre-wrap">
          {primaryText}
          {hashtags.length > 0 && (
            <span className="text-blue-600"> {hashtags.map(h => `#${h}`).join(' ')}</span>
          )}
        </p>
      </div>

      {/* Media */}
      <div className={`relative bg-gray-100 ${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '16:9' ? 'aspect-video' : 'aspect-square'}`}>
        {videoUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <video src={videoUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center">
                <PlayIcon className="h-8 w-8 text-gray-800 ml-1" />
              </div>
            </div>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-2" />
              <p className="text-sm">Ad Creative</p>
            </div>
          </div>
        )}
      </div>

      {/* CTA Link Preview */}
      <div className="bg-gray-100 p-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 uppercase">YOURBRAND.COM</p>
        <p className="font-semibold text-gray-900 text-sm mt-1">{headline}</p>
        {description && <p className="text-gray-600 text-xs mt-1">{description}</p>}
        <button className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-blue-700">
          {callToAction}
        </button>
      </div>

      {/* Engagement Stats */}
      <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <HandThumbUpIcon className="h-2.5 w-2.5 text-white" />
            </span>
            <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <HeartSolidIcon className="h-2.5 w-2.5 text-white" />
            </span>
          </div>
          <span>{likes.toLocaleString()}</span>
        </div>
        <div>
          <span>{comments} comments · {shares} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-around">
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-md">
          <HandThumbUpIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-md">
          <ChatBubbleOvalLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-md">
          <ShareIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>
    </div>
  );

  const renderInstagramPreview = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-[400px] overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
            <div className="w-full h-full rounded-full bg-white p-0.5">
              <div className="w-full h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {brandLogo ? (
                  <img src={brandLogo} alt={brandName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  brandName.charAt(0)
                )}
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{brandName.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
        <EllipsisHorizontalIcon className="h-5 w-5 text-gray-900" />
      </div>

      {/* Media */}
      <div className={`relative bg-black ${format === 'story' || format === 'reels' ? 'aspect-[9/16]' : 'aspect-square'}`}>
        {videoUrl ? (
          <div className="absolute inset-0">
            <video src={videoUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <PlayIcon className="h-8 w-8 text-white ml-1" />
              </div>
            </div>
            {format === 'reels' && (
              <div className="absolute bottom-4 right-4 space-y-4">
                <button className="flex flex-col items-center">
                  <HeartIcon className="h-7 w-7 text-white" />
                  <span className="text-white text-xs mt-1">{likes}</span>
                </button>
                <button className="flex flex-col items-center">
                  <ChatBubbleOvalLeftIcon className="h-7 w-7 text-white" />
                  <span className="text-white text-xs mt-1">{comments}</span>
                </button>
                <button className="flex flex-col items-center">
                  <PaperAirplaneIcon className="h-7 w-7 text-white -rotate-45" />
                </button>
              </div>
            )}
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
            <div className="text-center text-white">
              <p className="text-lg font-bold">{headline}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(!liked)}>
            {liked ? (
              <HeartSolidIcon className="h-7 w-7 text-red-500" />
            ) : (
              <HeartIcon className="h-7 w-7 text-gray-900" />
            )}
          </button>
          <ChatBubbleOvalLeftIcon className="h-7 w-7 text-gray-900" />
          <PaperAirplaneIcon className="h-7 w-7 text-gray-900 -rotate-45" />
        </div>
        <button onClick={() => setSaved(!saved)}>
          <BookmarkIcon className={`h-7 w-7 ${saved ? 'fill-current text-gray-900' : 'text-gray-900'}`} />
        </button>
      </div>

      {/* Likes */}
      <div className="px-3 pb-2">
        <p className="font-semibold text-gray-900 text-sm">{likes.toLocaleString()} likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-gray-900 text-sm">
          <span className="font-semibold">{brandName.toLowerCase().replace(/\s+/g, '')}</span>{' '}
          {primaryText}
          {hashtags.length > 0 && (
            <span className="text-blue-900"> {hashtags.map(h => `#${h}`).join(' ')}</span>
          )}
        </p>
      </div>

      {/* CTA Button */}
      <div className="px-3 pb-3">
        <button className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold">
          {callToAction}
        </button>
      </div>
    </div>
  );

  const renderTikTokPreview = () => (
    <div className="bg-black rounded-xl shadow-lg max-w-[300px] overflow-hidden aspect-[9/16] relative">
      {/* Background */}
      {videoUrl ? (
        <video src={videoUrl} className="absolute inset-0 w-full h-full object-cover" />
      ) : imageUrl ? (
        <img src={imageUrl} alt="Ad creative" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600 via-pink-500 to-red-500" />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Sponsored Badge */}
      <div className="absolute top-4 left-4">
        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Sponsored</span>
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-32 space-y-5">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold border-2 border-white">
            {brandName.charAt(0)}
          </div>
          <div className="w-5 h-5 -mt-2 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">+</span>
          </div>
        </div>
        
        <button className="flex flex-col items-center">
          <HeartIcon className="h-8 w-8 text-white" />
          <span className="text-white text-xs mt-1">{(likes / 1000).toFixed(1)}K</span>
        </button>
        
        <button className="flex flex-col items-center">
          <ChatBubbleOvalLeftIcon className="h-8 w-8 text-white" />
          <span className="text-white text-xs mt-1">{comments}</span>
        </button>
        
        <button className="flex flex-col items-center">
          <BookmarkIcon className="h-8 w-8 text-white" />
          <span className="text-white text-xs mt-1">{Math.floor(shares / 2)}</span>
        </button>
        
        <button className="flex flex-col items-center">
          <ShareIcon className="h-8 w-8 text-white" />
          <span className="text-white text-xs mt-1">{shares}</span>
        </button>

        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 animate-spin-slow border-2 border-gray-600 flex items-center justify-center">
          <MusicalNoteIcon className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-4 left-3 right-16">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-white font-bold text-sm">@{brandName.toLowerCase().replace(/\s+/g, '')}</p>
          <span className="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded">Follow</span>
        </div>
        <p className="text-white text-sm mb-3">
          {primaryText.length > 80 ? primaryText.substring(0, 80) + '...' : primaryText}
          {hashtags.length > 0 && (
            <span> {hashtags.slice(0, 3).map(h => `#${h}`).join(' ')}</span>
          )}
        </p>
        
        {/* CTA Button */}
        <button className="bg-pink-500 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
          {callToAction}
          <span>→</span>
        </button>

        {/* Sound */}
        <div className="flex items-center gap-2 mt-3">
          <MusicalNoteIcon className="h-4 w-4 text-white" />
          <div className="overflow-hidden">
            <p className="text-white text-xs whitespace-nowrap animate-marquee">
              Original Sound - {brandName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwitterPreview = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-[500px] overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="p-4 flex gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="w-full h-full rounded-full object-cover" />
          ) : (
            brandName.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-bold text-gray-900 text-sm truncate">{brandName}</p>
            <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
            </svg>
            <span className="text-gray-500 text-sm">@{brandName.toLowerCase().replace(/\s+/g, '')}</span>
          </div>
          
          {/* Tweet Content */}
          <p className="text-gray-900 mt-2 text-[15px] leading-5">
            {primaryText}
            {hashtags.length > 0 && (
              <span className="text-blue-500"> {hashtags.map(h => `#${h}`).join(' ')}</span>
            )}
          </p>

          {/* Media Card */}
          <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
            <div className={`relative bg-gray-100 ${aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'}`}>
              {videoUrl ? (
                <div className="absolute inset-0">
                  <video src={videoUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center">
                      <PlayIcon className="h-6 w-6 text-white ml-1" />
                    </div>
                  </div>
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                  <p className="text-white font-bold text-lg">{headline}</p>
                </div>
              )}
            </div>
            <div className="p-3 bg-white border-t border-gray-200">
              <p className="text-gray-500 text-xs">yourbrand.com</p>
              <p className="font-medium text-gray-900 text-sm mt-0.5">{headline}</p>
              {description && <p className="text-gray-500 text-sm mt-0.5">{description}</p>}
            </div>
          </div>

          {/* Promoted Badge */}
          <div className="mt-2 flex items-center gap-1 text-gray-500 text-sm">
            <ChartBarIcon className="h-4 w-4" />
            <span>Promoted</span>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between max-w-md text-gray-500">
            <button className="flex items-center gap-2 hover:text-blue-500 group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <ChatBubbleOvalLeftIcon className="h-5 w-5" />
              </div>
              <span className="text-sm">{comments}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-green-500 group">
              <div className="p-2 rounded-full group-hover:bg-green-50">
                <ArrowPathRoundedSquareIcon className="h-5 w-5" />
              </div>
              <span className="text-sm">{shares}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-pink-500 group">
              <div className="p-2 rounded-full group-hover:bg-pink-50">
                <HeartIcon className="h-5 w-5" />
              </div>
              <span className="text-sm">{likes}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <ChartBarIcon className="h-5 w-5" />
              </div>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <BookmarkIcon className="h-5 w-5" />
              </div>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-500 group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <ShareIcon className="h-5 w-5" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLinkedInPreview = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-[550px] overflow-hidden border border-gray-300">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold flex-shrink-0">
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="w-full h-full rounded-lg object-cover" />
          ) : (
            brandName.charAt(0)
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm hover:text-blue-600 hover:underline cursor-pointer">{brandName}</p>
          <p className="text-gray-500 text-xs">1,234 followers</p>
          <p className="text-gray-500 text-xs">Promoted</p>
        </div>
        <EllipsisHorizontalIcon className="h-6 w-6 text-gray-500" />
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-900 text-sm leading-5">
          {primaryText}
          {hashtags.length > 0 && (
            <span className="text-blue-600"> {hashtags.map(h => `#${h}`).join(' ')}</span>
          )}
        </p>
      </div>

      {/* Media */}
      <div className={`relative bg-gray-100 ${aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[1.91/1]'}`}>
        {videoUrl ? (
          <div className="absolute inset-0">
            <video src={videoUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <PlayIcon className="h-8 w-8 text-blue-700 ml-1" />
              </div>
            </div>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900">
            <p className="text-white font-bold text-xl px-8 text-center">{headline}</p>
          </div>
        )}
      </div>

      {/* Link Preview */}
      <div className="bg-gray-50 p-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">yourbrand.com</p>
        <p className="font-semibold text-gray-900 text-sm mt-1">{headline}</p>
        {description && <p className="text-gray-600 text-xs mt-1 line-clamp-2">{description}</p>}
      </div>

      {/* Engagement Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-200">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="w-4 h-4 bg-blue-500 rounded-full" />
            <span className="w-4 h-4 bg-green-500 rounded-full" />
            <span className="w-4 h-4 bg-red-500 rounded-full" />
          </div>
          <span>{likes.toLocaleString()}</span>
        </div>
        <span>{comments} comments · {shares} reposts</span>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-around">
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md">
          <HandThumbUpIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md">
          <ChatBubbleOvalLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md">
          <ArrowPathRoundedSquareIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Repost</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md">
          <PaperAirplaneIcon className="h-5 w-5 -rotate-45" />
          <span className="text-sm font-medium">Send</span>
        </button>
      </div>

      {/* CTA Button */}
      <div className="px-4 pb-4">
        <button className="w-full border-2 border-blue-600 text-blue-600 py-2 rounded-full text-sm font-semibold hover:bg-blue-50">
          {callToAction}
        </button>
      </div>
    </div>
  );

  const renderYouTubePreview = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-[400px] overflow-hidden">
      {/* Video Thumbnail */}
      <div className={`relative bg-black ${format === 'shorts' ? 'aspect-[9/16]' : 'aspect-video'}`}>
        {videoUrl ? (
          <video src={videoUrl} className="w-full h-full object-cover" />
        ) : imageUrl ? (
          <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800">
            <PlayIcon className="h-16 w-16 text-white" />
          </div>
        )}
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
          0:15
        </div>

        {/* Ad badge */}
        <div className="absolute bottom-2 left-2 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded font-medium">
          Ad
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <PlayIcon className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-3">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {brandName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm line-clamp-2 leading-5">
              {headline}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {brandName} · Sponsored
            </p>
          </div>
          <EllipsisHorizontalIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
        </div>

        {/* CTA Button */}
        <button className="mt-3 w-full bg-blue-600 text-white py-2 rounded-sm text-sm font-medium hover:bg-blue-700">
          {callToAction}
        </button>
      </div>
    </div>
  );

  const renderGooglePreview = () => (
    <div className="bg-white rounded-xl shadow-lg max-w-[336px] overflow-hidden border border-gray-200">
      {/* Display Ad Format */}
      <div className="relative aspect-[1.91/1] bg-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-green-500">
            <p className="text-white font-bold text-lg px-4 text-center">{headline}</p>
          </div>
        )}
        
        {/* Ad label */}
        <div className="absolute top-2 left-2">
          <span className="bg-yellow-300 text-gray-800 text-[10px] px-1 py-0.5 rounded font-bold">Ad</span>
        </div>

        {/* Info icon */}
        <div className="absolute top-2 right-2">
          <div className="w-4 h-4 bg-white/80 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-[10px] font-bold">i</span>
          </div>
        </div>
      </div>

      {/* Ad Content */}
      <div className="p-3 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {brandName.charAt(0)}
          </div>
          <span className="text-xs text-gray-600">{brandName}</span>
        </div>
        <p className="font-medium text-gray-900 text-sm leading-5">{headline}</p>
        <p className="text-gray-600 text-xs mt-1 line-clamp-2">{primaryText}</p>
        
        {/* CTA */}
        <button className="mt-3 bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium">
          {callToAction}
        </button>
      </div>
    </div>
  );

  // Render based on platform
  switch (platform) {
    case 'facebook':
      return renderFacebookPreview();
    case 'instagram':
      return renderInstagramPreview();
    case 'tiktok':
      return renderTikTokPreview();
    case 'twitter':
      return renderTwitterPreview();
    case 'linkedin':
      return renderLinkedInPreview();
    case 'youtube':
      return renderYouTubePreview();
    case 'google':
      return renderGooglePreview();
    default:
      return renderFacebookPreview();
  }
};

export default AdPreviewMockup;

