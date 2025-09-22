// pages/index.js
import { useState, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [originalImage, setOriginalImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [focalPoint, setFocalPoint] = useState(null);
  const [fileName, setFileName] = useState('');
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Mobile aspect ratio and output size
  const MOBILE_ASPECT_RATIO = 9 / 16; // Portrait mobile
  const OUTPUT_HEIGHT = 800;
  const OUTPUT_WIDTH = OUTPUT_HEIGHT * MOBILE_ASPECT_RATIO;

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target.result);
        setCroppedImage(null);
        setFocalPoint(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      
      setImageDimensions({
        natural: { width: naturalWidth, height: naturalHeight },
        display: { width: displayWidth, height: displayHeight }
      });
    }
  };

  const getMousePos = (e) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleImageClick = (e) => {
    const pos = getMousePos(e);
    setFocalPoint(pos);
    setCroppedImage(null); // Reset cropped image when focal point changes
  };

  const cropToMobile = () => {
    if (!originalImage || !imageDimensions.natural) return;

    setIsProcessing(true);
    
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Auto crop logic with focal point
      const originalWidth = img.width;
      const originalHeight = img.height;
      const originalAspectRatio = originalWidth / originalHeight;

      let cropWidth, cropHeight;
      
      if (originalAspectRatio > MOBILE_ASPECT_RATIO) {
        // Original is wider, crop from sides
        cropHeight = originalHeight;
        cropWidth = cropHeight * MOBILE_ASPECT_RATIO;
      } else {
        // Original is taller, crop from top/bottom
        cropWidth = originalWidth;
        cropHeight = cropWidth / MOBILE_ASPECT_RATIO;
      }

      let sourceX, sourceY;

      // Calculate crop position based on focal point
      if (focalPoint && imageDimensions.display && imageDimensions.natural) {
        const scaleX = imageDimensions.natural.width / imageDimensions.display.width;
        const scaleY = imageDimensions.natural.height / imageDimensions.display.height;
        
        // Convert focal point to natural image coordinates
        const focalX = focalPoint.x * scaleX;
        const focalY = focalPoint.y * scaleY;
        
        // Center crop around focal point, but constrain to image bounds
        sourceX = Math.max(0, Math.min(focalX - cropWidth / 2, originalWidth - cropWidth));
        sourceY = Math.max(0, Math.min(focalY - cropHeight / 2, originalHeight - cropHeight));
      } else {
        // Default center crop if no focal point
        sourceX = (originalWidth - cropWidth) / 2;
        sourceY = (originalHeight - cropHeight) / 2;
      }

      // Set canvas size for mobile output
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;

      // Draw cropped image
      ctx.drawImage(
        img,
        sourceX, sourceY, cropWidth, cropHeight,
        0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT
      );

      // Convert to data URL with high quality
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCroppedImage(croppedDataUrl);
      setIsProcessing(false);
    };

    img.src = originalImage;
  };

  const downloadImage = () => {
    if (!croppedImage) return;

    const link = document.createElement('a');
    // Use custom filename if provided, otherwise use timestamp
    const downloadFileName = fileName.trim() 
      ? `${fileName.trim()}.jpg` 
      : `mobile-cropped-${Date.now()}.jpg`;
    
    link.download = downloadFileName;
    link.href = croppedImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetApp = () => {
    setOriginalImage(null);
    setCroppedImage(null);
    setIsProcessing(false);
    setFocalPoint(null);
    setFileName('');
    setImageDimensions({ width: 0, height: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Head>
        <title>Mobile Image Cropper</title>
        <meta name="description" content="Crop images for mobile-friendly dimensions (9:16 portrait)" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <header>
          <h1>📱 Mobile Image Cropper</h1>
          <p>Upload → Click to focus → Crop → Download</p>
        </header>

        <main>
          {!originalImage ? (
            <div className="upload-area">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                id="file-upload"
                className="file-input"
              />
              <label htmlFor="file-upload" className="upload-label">
                <div className="upload-content">
                  <span className="upload-icon">📤</span>
                  <span>Click to upload an image</span>
                  <small>Supports JPG, PNG, WebP, etc.</small>
                  <small className="size-info">Output: {OUTPUT_WIDTH}×{OUTPUT_HEIGHT}px</small>
                </div>
              </label>
            </div>
          ) : (
            <div className="image-processing">
              {/* Top Control Bar */}
              <div className="control-bar">
                <div className="info-section">
                  <span className="mode-indicator">🎯 Auto Crop Mode</span>
                  {focalPoint ? (
                    <span className="status-text">Focus point set!</span>
                  ) : (
                    <span className="status-text">Click image to set focus point</span>
                  )}
                </div>
                
                <div className="action-section">
                  {!croppedImage ? (
                    <button
                      onClick={cropToMobile}
                      disabled={isProcessing}
                      className="control-btn crop-btn"
                    >
                      {isProcessing ? 'Processing...' : 'Crop Image'}
                    </button>
                  ) : (
                    <>
                      <div className="filename-input-container">
                        <input
                          type="text"
                          placeholder="Enter filename (optional)"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          className="filename-input"
                          maxLength={50}
                        />
                        <small className="filename-hint">.jpg</small>
                      </div>
                      
                      <button onClick={downloadImage} className="control-btn download-btn">
                        📥 Download
                      </button>
                      <button onClick={() => setCroppedImage(null)} className="control-btn secondary-btn">
                        🔄 Try Again
                      </button>
                      <button onClick={resetApp} className="control-btn secondary-btn">
                        📤 New Image
                      </button>
                    </>
                  )}
                  
                  {focalPoint && (
                    <button 
                      onClick={() => setFocalPoint(null)}
                      className="control-btn clear-btn"
                    >
                      Clear Focus
                    </button>
                  )}
                </div>
              </div>

              <div className="image-grid">
                <div className="image-section">
                  <h3>Original Image {!focalPoint ? '(Click to Set Focus Point)' : ''}</h3>
                  <div className="image-container">
                    <img 
                      ref={imageRef}
                      src={originalImage} 
                      alt="Original" 
                      className="preview-image"
                      onLoad={handleImageLoad}
                      onClick={handleImageClick}
                      style={{ 
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      draggable={false}
                    />
                    
                    {/* Focal point indicator */}
                    {focalPoint && (
                      <div 
                        className="focal-point"
                        style={{
                          left: `${focalPoint.x}px`,
                          top: `${focalPoint.y}px`
                        }}
                      >
                        <div className="focal-point-inner"></div>
                        <div className="focal-point-rings">
                          <div className="ring ring-1"></div>
                          <div className="ring ring-2"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {croppedImage && (
                  <div className="image-section">
                    <h3>Mobile Version ({OUTPUT_WIDTH}×{OUTPUT_HEIGHT}px)</h3>
                    <img src={croppedImage} alt="Cropped" className="preview-image mobile-preview" />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <style jsx>{`
          .container {
            min-height: 100vh;
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          header {
            text-align: center;
            margin-bottom: 3rem;
          }

          h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            color: #333;
          }

          p {
            font-size: 1.2rem;
            color: #666;
            margin: 0;
            font-weight: 500;
          }

          .upload-area {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
          }

          .file-input {
            display: none;
          }

          .upload-label {
            display: block;
            width: 100%;
            max-width: 500px;
            padding: 3rem;
            border: 3px dashed #007bff;
            border-radius: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f8f9ff;
          }

          .upload-label:hover {
            border-color: #0056b3;
            background: #e6f0ff;
            transform: translateY(-2px);
          }

          .upload-content {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .upload-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .upload-content span {
            font-size: 1.2rem;
            font-weight: 500;
            color: #007bff;
          }

          .upload-content small {
            font-size: 0.9rem;
            color: #666;
          }

          .size-info {
            font-weight: 600;
            color: #007bff !important;
          }

          .image-processing {
            max-width: 100%;
          }

          .control-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 50px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            gap: 2rem;
          }

          .info-section {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .mode-indicator {
            font-size: 1.1rem;
            font-weight: 600;
            color: #007bff;
          }

          .status-text {
            font-size: 0.9rem;
            color: #666;
          }

          .action-section {
            display: flex;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
          }

          .control-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 20px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
          }

          .crop-btn {
            background: #007bff;
            color: white;
            min-width: 140px;
          }

          .crop-btn:hover:not(:disabled) {
            background: #0056b3;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.3);
          }

          .crop-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          .download-btn {
            background: #28a745;
            color: white;
            min-width: 120px;
          }

          .download-btn:hover {
            background: #1e7e34;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(40,167,69,0.3);
          }

          .secondary-btn {
            background: #6c757d;
            color: white;
          }

          .secondary-btn:hover {
            background: #545b62;
            transform: translateY(-1px);
          }

          .filename-input-container {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            position: relative;
          }

          .filename-input {
            padding: 0.75rem 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 20px;
            font-size: 0.9rem;
            min-width: 200px;
            background: white;
            transition: all 0.3s ease;
          }

          .filename-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
          }

          .filename-input::placeholder {
            color: #999;
          }

          .filename-hint {
            color: #666;
            font-size: 0.85rem;
            font-weight: 500;
          }

          .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
          }

          .image-section {
            text-align: center;
          }

          .image-section h3 {
            margin-bottom: 1rem;
            color: #333;
            font-size: 1.3rem;
          }

          .image-container {
            position: relative;
            display: inline-block;
            max-width: 100%;
          }

          .preview-image {
            max-width: 100%;
            max-height: 500px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            user-select: none;
          }

          .preview-image:hover {
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
          }

          .mobile-preview {
            max-height: 600px;
          }

          .focal-point {
            position: absolute;
            width: 20px;
            height: 20px;
            pointer-events: none;
            z-index: 10;
            transform: translate(-50%, -50%);
          }

          .focal-point-inner {
            width: 8px;
            height: 8px;
            background: #007bff;
            border: 2px solid white;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
          }

          .focal-point-rings {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }

          .ring {
            position: absolute;
            border: 2px solid #007bff;
            border-radius: 50%;
            opacity: 0.6;
            animation: pulse 2s infinite;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }

          .ring-1 {
            width: 30px;
            height: 30px;
            animation-delay: 0s;
          }

          .ring-2 {
            width: 45px;
            height: 45px;
            animation-delay: 0.5s;
          }

          @keyframes pulse {
            0% {
              opacity: 0.6;
              transform: translate(-50%, -50%) scale(0.8);
            }
            50% {
              opacity: 0.3;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(1.2);
            }
          }

          @media (max-width: 768px) {
            .container {
              padding: 1rem;
            }

            h1 {
              font-size: 2rem;
            }

            .control-bar {
              flex-direction: column;
              gap: 1rem;
              padding: 1rem;
              border-radius: 20px;
            }

            .info-section {
              text-align: center;
            }

            .action-section {
              width: 100%;
              justify-content: center;
            }

            .filename-input-container {
              flex-direction: column;
              gap: 0.5rem;
              width: 100%;
            }

            .filename-input {
              min-width: auto;
              width: 100%;
            }

            .control-btn {
              min-width: auto;
              flex: 1;
              max-width: 150px;
            }

            .image-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </>
  );
}