import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '@/services/api';
import axios from 'axios';
import { X, Upload, Video, Image as ImageIcon, Loader, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Camera, Smartphone, Cloud, Sparkles } from 'lucide-react';

interface AvatarCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (avatar: any) => void;
}

type CreationMethod = 'video' | 'photo' | 'ai';
type UploadMethod = 'file_upload' | 'webcam' | 'phone' | 'google_drive';
type Step = 'method' | 'instructions' | 'upload' | 'verify' | 'review';

const AvatarCreationModal: React.FC<AvatarCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [creationMethod, setCreationMethod] = useState<CreationMethod | null>(null);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file_upload');
  
  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  
  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  
  // Photo upload state
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  
  // Processing state
  const [isCreating, setIsCreating] = useState(false);
  const [createdAvatarId, setCreatedAvatarId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentStep('method');
      setCreationMethod(null);
      setUploadMethod('file_upload');
      setName('');
      setDescription('');
      setTags('');
      setVisibility('private');
      setVideoFile(null);
      setVideoUrl('');
      setVideoPreview('');
      setPhotoFiles([]);
      setPhotoUrls([]);
      setPhotoPreviews([]);
      setCreatedAvatarId(null);
      setProcessingStatus(null);
    }
  }, [isOpen]);

  // Poll processing status
  useEffect(() => {
    if (createdAvatarId && currentStep === 'review') {
      const interval = setInterval(async () => {
        try {
          const response = await apiService.get(`/characters/${createdAvatarId}/processing-status`) as any;
          if (response.success && response.data) {
            setProcessingStatus(response.data);
            if (response.data.character.processing_status === 'completed') {
              clearInterval(interval);
              toast.success('Avatar created successfully!');
            } else if (response.data.character.processing_status === 'failed') {
              clearInterval(interval);
              toast.error('Avatar creation failed');
            }
          }
        } catch (error) {
          console.error('Failed to check processing status:', error);
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [createdAvatarId, currentStep]);

  const handleMethodSelect = (method: CreationMethod) => {
    setCreationMethod(method);
    setCurrentStep('instructions');
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid video format. Please use MP4, MOV, or WebM');
      return;
    }

    // Validate file size (10GB max)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size > maxSize) {
      toast.error('Video file is too large. Maximum size: 10GB');
      return;
    }

    setVideoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setVideoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }

    if (photoFiles.length + imageFiles.length > 10) {
      toast.error('Maximum 10 photos allowed');
      return;
    }

    // Check file sizes (50MB per file)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed 50MB limit. Please compress your images.`);
      return;
    }

    setPhotoFiles(prev => [...prev, ...imageFiles]);
    
    // Create previews
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreviews(prev => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadVideo = async () => {
    if (!videoFile) {
      toast.error('Please select a video file');
      return;
    }

    setIsUploadingVideo(true);
    setVideoUploadProgress(0);

    try {
      // Use axios directly for video upload with progress tracking
      const videoFormData = new FormData();
      videoFormData.append('video', videoFile);
      
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await axios.post(
        `${apiUrl}/api/characters/upload-video`,
        videoFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              setVideoUploadProgress(progress);
            }
          },
        }
      );

      // Axios returns response.data which contains our API response
      const apiResponse = response.data;
      if (apiResponse.success && apiResponse.data) {
        setVideoUrl(apiResponse.data.videoUrl);
        toast.success('Video uploaded successfully!');
        setCurrentStep('verify');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload video');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleUploadPhotos = async () => {
    if (photoFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    setIsUploadingPhotos(true);

    try {
      const photosFormData = new FormData();
      photoFiles.forEach(file => {
        photosFormData.append('images', file);
      });

      const response = await apiService.post('/characters/upload-images', photosFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }) as any;

      if (response.success && response.data) {
        setPhotoUrls(response.data.imageUrls);
        toast.success(`${response.data.count} photo(s) uploaded successfully!`);
        setCurrentStep('verify');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload photos');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleCreateAvatar = async () => {
    if (!name.trim()) {
      toast.error('Avatar name is required');
      return;
    }

    setIsCreating(true);

    try {
      let response;
      
      if (creationMethod === 'video') {
        if (!videoUrl) {
          toast.error('Please upload a video first');
          setIsCreating(false);
          return;
        }
        
        response = await apiService.post('/characters/create-from-video', {
          name: name.trim(),
          videoUrl,
          description: description.trim() || undefined,
          tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
          visibility,
          uploadMethod,
          uploadSource: null
        }) as any;
      } else if (creationMethod === 'photo') {
        if (photoUrls.length === 0) {
          toast.error('Please upload at least one photo');
          setIsCreating(false);
          return;
        }
        
        response = await apiService.post('/characters/create-from-photos', {
          name: name.trim(),
          photoUrls,
          description: description.trim() || undefined,
          tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
          visibility
        }) as any;
      } else {
        toast.error('Please select a creation method');
        setIsCreating(false);
        return;
      }

      if (response.success && response.data) {
        setCreatedAvatarId(response.data.id);
        setCurrentStep('review');
        toast.success('Avatar creation started! Processing in background...');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create avatar');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Create Your Avatar</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {['method', 'instructions', 'upload', 'verify', 'review'].map((step, index) => {
              const stepNames: Record<string, string> = {
                method: 'Method',
                instructions: 'Instructions',
                upload: 'Upload',
                verify: 'Verify',
                review: 'Review'
              };
              
              const currentStepIndex = ['method', 'instructions', 'upload', 'verify', 'review'].indexOf(currentStep);
              const isActive = index <= currentStepIndex;
              const isCurrent = step === currentStep;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                    } ${isCurrent ? 'ring-2 ring-blue-400' : ''}`}>
                      {isActive && step !== currentStep ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {stepNames[step]}
                    </span>
                  </div>
                  {index < 4 && (
                    <div className={`h-1 flex-1 mx-2 ${isActive ? 'bg-blue-600' : 'bg-gray-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Method Selection */}
          {currentStep === 'method' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">Choose Creation Method</h3>
                <p className="text-gray-400">Select how you want to create your avatar</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Option */}
                <div
                  onClick={() => handleMethodSelect('video')}
                  className="border-2 border-gray-700 rounded-lg p-6 cursor-pointer hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Start from a video</h4>
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">Most realistic</span>
                  </div>
                  <p className="text-gray-400 mb-4">
                    Use a single video to create an avatar that moves and acts just like you.
                  </p>
                  <div className="flex items-center text-blue-400">
                    <Video className="w-5 h-5 mr-2" />
                    <span>Recommended: 2-5 min video</span>
                  </div>
                </div>

                {/* Photo Option */}
                <div
                  onClick={() => handleMethodSelect('photo')}
                  className="border-2 border-gray-700 rounded-lg p-6 cursor-pointer hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Start from a photo</h4>
                  </div>
                  <p className="text-gray-400 mb-4">
                    Bring photos to life with natural motion - no video footage needed.
                  </p>
                  <div className="flex items-center text-blue-400">
                    <ImageIcon className="w-5 h-5 mr-2" />
                    <span>1-10 photos recommended</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Instructions */}
          {currentStep === 'instructions' && creationMethod && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {creationMethod === 'video' ? 'Footage Instructions' : 'Photo Instructions'}
                </h3>
                <button
                  onClick={() => setCurrentStep('method')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ← Back
                </button>
              </div>

              {creationMethod === 'video' ? (
                <div className="space-y-6">
                  <p className="text-gray-400">
                    We create your avatar from real footage of you. Here are a few recording tips to help you create the highest quality avatar.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-600 rounded-full p-2 mt-1">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Use the right equipment</h4>
                          <p className="text-gray-400 text-sm">
                            Submit 2-5 min (at least 30 sec) of unedited footage with a professional camera or smartphone.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-600 rounded-full p-2 mt-1">
                          <Video className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Set the right environment</h4>
                          <p className="text-gray-400 text-sm">
                            Look straight ahead and keep your head level. Good lighting is essential.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-600 rounded-full p-2 mt-1">
                          <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Speak naturally and clearly</h4>
                          <p className="text-gray-400 text-sm">
                            Maintain a steady pace, pausing 1-2 seconds between sentences with lips closed.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-600 rounded-full p-2 mt-1">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">Expressive natural motion</h4>
                          <p className="text-gray-400 text-sm">
                            Sit, stand, or walk while engaging naturally with the camera. Use varied facial expressions and speak with natural hand gestures.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-400">
                    Upload photos to create multiple looks for your avatar.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                        <h4 className="font-semibold text-white">Good Photos</h4>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Recent photos of yourself (just you), showing a mix of close-ups and full-body shots, with different angles, expressions (smiling, neutral, serious), and a variety of outfits. Make sure they are high-resolution and reflect your current appearance.
                      </p>
                    </div>

                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                        <h4 className="font-semibold text-white">Bad Photos</h4>
                      </div>
                      <p className="text-gray-300 text-sm">
                        No group photos, hats, sunglasses, pets, heavy filters, low-resolution images, or screenshots. Avoid photos that are too old, overly edited, or don't represent how you currently look.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Upload */}
          {currentStep === 'upload' && creationMethod && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {creationMethod === 'video' ? 'Upload your footage' : 'Upload your photos'}
                </h3>
                <button
                  onClick={() => setCurrentStep('instructions')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ← Back
                </button>
              </div>

              {creationMethod === 'video' ? (
                <div className="space-y-6">
                  <p className="text-gray-400">
                    For optimal, most realistic results, we recommend uploading a 2min video recorded with a high-resolution camera or smartphone. If you're just testing the product, feel free to submit a 30s recording using your webcam.
                  </p>

                  {/* Upload Tabs */}
                  <div className="flex space-x-2 border-b border-gray-700">
                    <button
                      onClick={() => setUploadMethod('file_upload')}
                      className={`px-4 py-2 border-b-2 ${
                        uploadMethod === 'file_upload'
                          ? 'border-blue-600 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      Upload footage
                    </button>
                    <button
                      onClick={() => setUploadMethod('webcam')}
                      className={`px-4 py-2 border-b-2 ${
                        uploadMethod === 'webcam'
                          ? 'border-blue-600 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      Record via webcam
                    </button>
                    <button
                      onClick={() => setUploadMethod('phone')}
                      className={`px-4 py-2 border-b-2 ${
                        uploadMethod === 'phone'
                          ? 'border-blue-600 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      Record via phone
                    </button>
                  </div>

                  {/* Upload Area */}
                  {uploadMethod === 'file_upload' && (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                      {videoPreview ? (
                        <div className="space-y-4">
                          <video
                            src={videoPreview}
                            controls
                            className="max-w-full max-h-64 mx-auto rounded-lg"
                          />
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => {
                                setVideoFile(null);
                                setVideoPreview('');
                                if (videoInputRef.current) videoInputRef.current.value = '';
                              }}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                            >
                              Remove
                            </button>
                            <button
                              onClick={handleUploadVideo}
                              disabled={isUploadingVideo}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center space-x-2"
                            >
                              {isUploadingVideo ? (
                                <>
                                  <Loader className="w-4 h-4 animate-spin" />
                                  <span>Uploading... {videoUploadProgress}%</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span>Upload Video</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-300 mb-2">Drag and drop video, or click to upload</p>
                          <p className="text-gray-500 text-sm mb-4">
                            Landscape or portrait video, mp4/mov/webm format<br />
                            At least 30s, 2-10min recommended<br />
                            360p-4K resolution, &lt;10GB
                          </p>
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/mp4,video/mov,video/webm"
                            onChange={handleVideoSelect}
                            className="hidden"
                          />
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                          >
                            Browse local files
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadMethod === 'webcam' && (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                      <p className="text-gray-400 mb-4">Webcam recording coming soon...</p>
                      <button
                        onClick={() => setUploadMethod('file_upload')}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                      >
                        Use file upload instead
                      </button>
                    </div>
                  )}

                  {uploadMethod === 'phone' && (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                      <p className="text-gray-400 mb-4">Phone recording coming soon...</p>
                      <button
                        onClick={() => setUploadMethod('file_upload')}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                      >
                        Use file upload instead
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                    {photoPreviews.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          {photoPreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => handleRemovePhoto(index)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-center space-x-3">
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                          <button
                            onClick={() => photoInputRef.current?.click()}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                          >
                            Add More Photos
                          </button>
                          <button
                            onClick={handleUploadPhotos}
                            disabled={isUploadingPhotos}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center space-x-2"
                          >
                            {isUploadingPhotos ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Upload {photoFiles.length} Photo(s)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300 mb-2">Drag and drop photos to upload</p>
                        <p className="text-gray-500 text-sm mb-4">
                          Upload PNG, JPG, HEIC, or WebP file up to 200MB each
                        </p>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                          Select Photos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Verify */}
          {currentStep === 'verify' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Verify Upload</h3>
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ← Back
                </button>
              </div>

              <div className="bg-green-900/20 border border-green-600 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                  <h4 className="text-lg font-semibold text-white">Upload Successful!</h4>
                </div>
                <p className="text-gray-300">
                  {creationMethod === 'video'
                    ? 'Your video has been uploaded successfully. Click continue to proceed with avatar creation.'
                    : `Your ${photoUrls.length} photo(s) have been uploaded successfully. Click continue to proceed with avatar creation.`}
                </p>
              </div>

              {/* Avatar Details Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Avatar Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field w-full"
                    placeholder="Enter avatar name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field w-full h-24"
                    placeholder="Describe your avatar (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="input-field w-full"
                    placeholder="e.g., professional, casual, formal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Visibility
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="private"
                        checked={visibility === 'private'}
                        onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                      />
                      <span className="text-sm text-gray-300">Private (Only you)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="public"
                        checked={visibility === 'public'}
                        onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                      />
                      <span className="text-sm text-gray-300">Public (Community library)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreateAvatar}
                  disabled={isCreating || !name.trim()}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Avatar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Processing Avatar</h3>
              </div>

              {processingStatus ? (
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Loader className="w-6 h-6 text-blue-400 mr-3 animate-spin" />
                        <h4 className="text-lg font-semibold text-white">Processing...</h4>
                      </div>
                      <span className="text-blue-400">
                        {processingStatus.character.processing_progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${processingStatus.character.processing_progress}%` }}
                      />
                    </div>
                    {processingStatus.job?.current_step && (
                      <p className="text-gray-300 text-sm">
                        {processingStatus.job.current_step}
                      </p>
                    )}
                  </div>

                  {processingStatus.character.processing_status === 'completed' && (
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                        <h4 className="text-lg font-semibold text-white">Avatar Created Successfully!</h4>
                      </div>
                      <p className="text-gray-300 mb-4">
                        Your avatar is ready to use. You can now use it in music videos and UGC creation.
                      </p>
                      <button
                        onClick={() => {
                          onSuccess?.(processingStatus);
                          handleClose();
                        }}
                        className="btn-primary"
                      >
                        Done
                      </button>
                    </div>
                  )}

                  {processingStatus.character.processing_status === 'failed' && (
                    <div className="bg-red-900/20 border border-red-600 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <AlertCircle className="w-6 h-6 text-red-400 mr-3" />
                        <h4 className="text-lg font-semibold text-white">Processing Failed</h4>
                      </div>
                      <p className="text-gray-300">
                        {processingStatus.character.processing_error || 'An error occurred during processing'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-400">Starting avatar creation...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarCreationModal;

