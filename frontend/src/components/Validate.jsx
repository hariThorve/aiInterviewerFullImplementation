/**
 * Face Validation Component
 * 
 * This component handles face recognition validation using live camera feed.
 * It captures a photo from the user's camera and compares it with the uploaded
 * profile photo to verify the user's identity before proceeding to the interview.
 * 
 * Features:
 * - Live camera feed with user-facing camera
 * - Photo capture functionality
 * - Face recognition validation via FastAPI backend
 * - Real-time validation feedback
 * - Automatic progression to interview on successful validation
 * 
 * Process Flow:
 * 1. Start camera and display live feed
 * 2. User captures a photo
 * 3. Photo is uploaded to FastAPI backend
 * 4. Face recognition compares live photo with profile photo
 * 5. On success: proceed to interview
 * 6. On failure: prompt user to retake photo
 * 
 * @param {string} photoPath - Path to the uploaded profile photo
 * @param {Function} onValidationSuccess - Callback function called on successful validation
 * 
 * @author AI Interview Platform Team
 * @version 1.0.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Camera, Square } from 'lucide-react'; // Lucide React icons for UI

const Validate = ({ photoPath, onValidationSuccess }) => {
  // Refs for video and canvas elements
  const videoRef = useRef(null); // Reference to video element for camera feed
  const canvasRef = useRef(null); // Reference to hidden canvas for photo capture
  
  // State management
  const [stream, setStream] = useState(null); // MediaStream object for camera
  const [isLoading, setIsLoading] = useState(false); // Loading state for API calls
  const [capturedPhoto, setCapturedPhoto] = useState(null); // Captured photo blob
  const [isCameraOn, setIsCameraOn] = useState(false); // Camera status indicator

  // FastAPI server endpoint for photo upload and face recognition
  const SERVER_ENDPOINT = 'http://localhost:8000/upload-live-cam-photo';

  /**
   * Effect hook to start camera on component mount and cleanup on unmount
   */
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera(); // Cleanup: stop camera when component unmounts
    };
  }, []);

  /**
   * Starts the user-facing camera and displays live feed
   */
  const startCamera = async () => {
    try {
      // Request access to user's camera with specific constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 }, // Prefer HD resolution
          height: { ideal: 720 },
          facingMode: 'user' // Use front-facing camera
        },
        audio: false // No audio needed for face validation
      });
      
      // Set video source and start playback
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsCameraOn(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  /**
   * Stops the camera and cleans up media stream
   */
  const stopCamera = () => {
    if (stream) {
      // Stop all tracks in the media stream
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  };

  /**
   * Captures a photo from the current video frame
   */
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob (JPEG format with 80% quality)
    canvas.toBlob((blob) => {
      setCapturedPhoto(blob);
    }, 'image/jpeg', 0.8);
  };

  // Legacy photo upload function (commented out for reference)
  // const sendPhotoToServer = async () => {
  //   if (!capturedPhoto) {
  //     alert('Please capture a photo first!');
  //     return;
  //   }

  //   setIsLoading(true);
    
  //   try {
  //     const formData = new FormData();
  //     formData.append('photo', capturedPhoto, 'captured-photo.jpg');
  //     formData.append('timestamp', new Date().toISOString());

  //     const response = await fetch(SERVER_ENDPOINT, {
  //       method: 'POST',
  //       body: formData,
  //       headers: {
  //         // Don't set Content-Type header - let browser set it with boundary for FormData
  //       }
  //     });

  //     if (response.ok) {
  //       alert('Photo sent successfully!');
  //       setCapturedPhoto(null); // Clear captured photo after successful upload
  //     } else {
  //       throw new Error(`Server responded with status: ${response.status}`);
  //     }
  //   } catch (error) {
  //     console.error('Error sending photo:', error);
  //     alert('Failed to send photo. Please try again.');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  /**
   * Sends captured photo to server and performs face recognition validation
   * This function handles the complete validation workflow:
   * 1. Upload live camera photo to FastAPI
   * 2. Send both photos to face recognition endpoint
   * 3. Handle validation results and user feedback
   */
  const sendPhotoToServer = async () => {
    var livePhotoPath = "";
    if (!capturedPhoto) {
      alert('Please capture a photo first!');
      return;
    }

    setIsLoading(true);
    
    try {
      // Step 1: Upload live camera photo to FastAPI backend
      const formData = new FormData();
      formData.append('liveCamPhoto', capturedPhoto, 'captured-photo.jpg'); // Changed from 'photo' to 'liveCamPhoto'
      formData.append('userId', 'validation-user'); // Added userId field that server expects
      formData.append('timestamp', new Date().toISOString());

      const response = await fetch(SERVER_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header - let browser set it with boundary for FormData
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Photo uploaded successfully:', result);
        alert('Photo sent successfully!');
        
        // Step 2: Perform face recognition validation
        const imagePathFormdata = new FormData();
        imagePathFormdata.append('profilePhotoPath', photoPath); // Original profile photo path
        imagePathFormdata.append('liveCamPhotoPath', result.data.file_path); // Live camera photo path
        livePhotoPath = result.data.file_path;
        console.log("Face recognition data:", imagePathFormdata);
        
        // Send both photo paths to face recognition endpoint
        const validateResponse = await fetch('http://localhost:8000/face-recognition', {
          method: 'POST',
          body: imagePathFormdata,
          headers: {
            // Don't set Content-Type header - let browser set it with boundary for FormData
          }
        });
        const validateResult = await validateResponse.json();

        console.log('Face recognition result:', validateResult.message);
        
        // Step 3: Handle validation results
        if (validateResult.success) {
          // Face recognition successful - proceed to interview
          if (onValidationSuccess) {
            onValidationSuccess(); // Call parent callback to change view
          }
        } else {
          // Face recognition failed - prompt user to retake photo
          alert("Face validation failed. Please ensure you're in good lighting and retake the photo.");
        }
        
        setCapturedPhoto(null); // Clear captured photo after processing
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(`Server responded with status: ${response.status} - ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending photo:', error);
      alert('Failed to send photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clears the captured photo and allows user to retake
   */
  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Face Validation
        </h1>
        
        {/* Live Camera Feed Container */}
        <div className="relative mb-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {isCameraOn ? (
              <>
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect for user comfort
                  autoPlay
                  playsInline
                  muted
                />
                {/* Live Camera Indicator */}
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium">LIVE</span>
                </div>
              </>
            ) : (
              /* Camera Loading State */
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Camera is starting...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden Canvas for Photo Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Control Buttons */}
        <div className="flex flex-col space-y-4">
          {!capturedPhoto ? (
            /* Capture Photo Button */
            <button
              onClick={capturePhoto}
              disabled={!isCameraOn}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              <Camera className="w-5 h-5" />
              <span>Capture Photo</span>
            </button>
          ) : (
            /* Retake and Send Buttons */
            <div className="flex space-x-3">
              <button
                onClick={retakePhoto}
                className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                <Camera className="w-5 h-5" />
                <span>Retake</span>
              </button>
              
              <button
                onClick={sendPhotoToServer}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {isLoading ? (
                  /* Loading State */
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  /* Send Photo State */
                  <>
                    <Square className="w-5 h-5" />
                    <span>Send Photo</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Success Status Message */}
        {capturedPhoto && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-800 text-sm text-center">
              ✓ Photo captured successfully! Ready to send to server.
            </p>
          </div>
        )}

        {/* Development Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-xs text-center">
            <strong>Note:</strong> Update the SERVER_ENDPOINT constant with your actual server URL
          </p>
        </div>
      </div>
    </div>
  );
};

export default Validate;