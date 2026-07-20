import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Video, X } from 'lucide-react';

const MediaUploadStep = ({ data, updateData, onNext, onBack }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const processFiles = (filesList) => {
    setError('');
    const newMedia = [...data.media];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const fileType = file.type;
      
      const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(fileType);
      const isVideo = fileType === 'video/mp4';

      if (!isImage && !isVideo) {
        setError('Unsupported file format. Please upload JPG, PNG, WEBP, or MP4 video.');
        return;
      }

      // Check if file is already added
      const exists = newMedia.some((m) => m.name === file.name && m.size === file.size);
      if (!exists) {
        // Create an object URL for preview
        const previewUrl = URL.createObjectURL(file);
        newMedia.push({
          file,
          name: file.name,
          size: file.size,
          type: fileType,
          previewUrl
        });
      }
    }

    updateData({ media: newMedia });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveMedia = (indexToRemove) => {
    const fileToRemove = data.media[indexToRemove];
    if (fileToRemove.previewUrl && fileToRemove.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    const newMedia = data.media.filter((_, idx) => idx !== indexToRemove);
    updateData({ media: newMedia });
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (data.media.length === 0) {
      setError('Please upload at least one image or video of the appliance.');
      return;
    }
    onNext();
  };

  const triggerBrowse = () => {
    fileInputRef.current.click();
  };

  return (
    <div>
      <h3 className="step-heading">Step 2: Upload Images / Video</h3>
      <p className="step-subtitle">Upload photos or a short video to help us evaluate your e-waste.</p>

      <div 
        className={`drag-drop-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerBrowse}
      >
        <input 
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/jpg, image/webp, video/mp4"
          className="hidden-file-input"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">
          <UploadCloud size={24} />
        </div>
        <div className="upload-text">Upload images / videos</div>
        <div className="upload-subtext">Drag & drop or click to browse</div>
        <div className="upload-subtext" style={{ fontSize: '0.75rem' }}>
          Supports JPG, JPEG, PNG, WEBP images and MP4 short videos.
        </div>
      </div>

      {error && <div className="form-error-msg" style={{ marginTop: '1rem', textAlign: 'center' }}>{error}</div>}

      {data.media.length > 0 && (
        <div className="media-preview-grid">
          {data.media.map((item, index) => {
            const isImage = item.type.startsWith('image/');
            return (
              <div key={index} className="media-preview-card">
                {isImage ? (
                  <img 
                    src={item.previewUrl} 
                    alt={`Preview ${index}`} 
                    className="media-preview-image"
                  />
                ) : (
                  <div className="media-preview-fileinfo">
                    <Video size={32} className="text-gray-500" />
                    <span className="text-xs truncate max-w-full" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                )}
                <button 
                  type="button" 
                  className="remove-media-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMedia(index);
                  }}
                  aria-label="Remove item"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="wizard-buttons">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default MediaUploadStep;
