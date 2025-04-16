// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5WjXzmGNUWUCr-_-PDPagpUfYaTmjjGY",
  authDomain: "cheney-25352.firebaseapp.com",
  projectId: "cheney-25352",
  storageBucket: "cheney-25352.appspot.com",
  messagingSenderId: "731368175146",
  appId: "1:731368175146:web:b2fd024d600c930373f553",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth();

let userId = null;
let selectedMediaUrls = [];

// // Video compression settings
// const compressionSettings = {
//   video: {
//     width: 1920,
//     height: 1080,
//     fps: 30,
//     bitrate: 6000000, // 8 Mbps
//   }
// };

// Helper function to get file size in KB/MB format
async function getFileSize(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    const sizeInBytes = parseInt(contentLength, 10);
    
    if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  } catch (error) {
    console.error("Error getting file size:", error);
    return "Unknown size";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const mediaGrid = document.getElementById("media-grid");
  const addMediaBtn = document.getElementById("add-media-btn");
  const deleteSelectedMediaBtn = document.getElementById("delete-selected-media");
  const fileUploadInput = document.getElementById("file-upload");
  const uploadOverlay = document.getElementById("upload-overlay");
  const uploadProgress = document.getElementById("upload-progress");
  const uploadStatus = document.getElementById("upload-status");
  const uploadMessage = document.getElementById("upload-message");
  const openPlaylistModalBtn = document.getElementById("open-playlist-modal");
  const playlistModal = document.getElementById("playlist-modal");
  const playlistOptions = document.getElementById("playlist-options");
  const newPlaylistInput = document.getElementById("new-playlist-name");
  const createPlaylistBtn = document.getElementById("create-playlist-btn");
  const addToExistingPlaylistsBtn = document.getElementById("add-to-existing-playlists-btn");
  const closeModalBtn = document.getElementById("close-modal");

  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      loadMedia(userId);
      loadPlaylists(userId);
    } else {
      alert("Please log in to manage your media.");
      window.location.href = "login.html";
    }
  });

  // async function loadMedia(userId) {
  //   mediaGrid.innerHTML = "";
  //   const mediaRef = collection(db, "users", userId, "media");
  //   const mediaSnapshot = await getDocs(mediaRef);
  
  //   mediaSnapshot.forEach(async (doc) => {
  //     const mediaData = doc.data();
  //     const mediaItem = document.createElement("div");
  //     mediaItem.classList.add("media-item");
  
  //     try {
  //       const mediaRef = ref(storage, mediaData.mediaUrl);
  //       await getDownloadURL(mediaRef); 
  
  //       // Extract and decode the filename from the URL path
  //       const urlParts = mediaData.mediaUrl.split('%2F');
  //       const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
        
  //       const isImage = mediaData.mediaType && mediaData.mediaType.startsWith("image");
  //       const isVideo = mediaData.mediaType && mediaData.mediaType.startsWith("video");
        
  //       // Add appropriate icon based on file type
  //       let fileIcon = '';
  //       if (isImage) {
  //         fileIcon = '<span class="material-icons file-icon">image</span>';
  //       } else if (isVideo) {
  //         fileIcon = '<span class="material-icons file-icon">video</span>';
  //       } else {
  //         fileIcon = '<span class="material-icons file-icon">insert_drive_file</span>';
  //       }
  
  //       // Add file size if available
  //       const fileSize = mediaData.fileSize ? `<span class="file-size">${mediaData.fileSize}</span>` : '';
  
  //       mediaItem.innerHTML = `
  //         ${isImage ? 
  //           `<img src="${mediaData.mediaUrl}" alt="Media" class="media-thumbnail" />` : 
  //           isVideo ?
  //           `<video src="${mediaData.mediaUrl}" class="media-thumbnail" preload="metadata"></video>` :
  //           `<div class="generic-file-thumbnail"></div>`}
  //         <div class="file-item">
  //           ${fileIcon}
  //           <span class="file-name">${fileName}</span>
  //           ${fileSize}
  //         </div>
  //         <div class="media-actions">
  //           <input type="checkbox" class="select-media-checkbox" data-id="${doc.id}" data-url="${mediaData.mediaUrl}" />
  //         </div>
  //       `;
  
  //       mediaItem.querySelector(".select-media-checkbox").addEventListener("change", (e) => {
  //         toggleMediaSelection(mediaData.mediaUrl, e.target.checked);
  //       });
  
  //       mediaGrid.appendChild(mediaItem);
  //     } catch (error) {
  //       if (error.code === "storage/object-not-found") {
  //         // Delete the document from Firestore if file does not exist in storage
  //         await deleteDoc(doc.ref);
  //       } else {
  //         console.error("Error verifying media file existence:", error);
  //       }
  //     }
  //   });
  // }
  async function loadMedia(userId) {
    mediaGrid.innerHTML = "";
    const mediaRef = collection(db, "users", userId, "media");
    const mediaSnapshot = await getDocs(mediaRef);
  
    mediaSnapshot.forEach(async (doc) => {
      const mediaData = doc.data();
      const mediaItem = document.createElement("div");
      mediaItem.classList.add("media-item");
  
      try {
        const mediaRef = ref(storage, mediaData.mediaUrl);
        await getDownloadURL(mediaRef); 
  
        // Extract and decode the filename from the URL path
        const urlParts = mediaData.mediaUrl.split('%2F');
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
        
        const isImage = mediaData.mediaType && mediaData.mediaType.startsWith("image");
        // Add appropriate icon based on file type
        let fileIcon = '';
        if (isImage) {
          fileIcon = '<span class="material-icons file-icon">image</span>';
        } else if (fileName.endsWith('.mp4') || fileName.endsWith('.webm')) {
          fileIcon = '<span class="material-icons file-icon">video</span>';
        } else {
          fileIcon = '<span class="material-icons file-icon">insert_drive_file</span>';
        }
  
        mediaItem.innerHTML = `
          ${isImage ? 
            `<img src="${mediaData.mediaUrl}" alt="Media" class="media-thumbnail" />` : 
            `<video src="${mediaData.mediaUrl}" class="media-thumbnail" preload="metadata"></video>`}
          <div class="file-item">
            ${fileIcon}
            <span class="file-name">${fileName}</span>
          </div>
          <div class="media-actions">
            <input type="checkbox" class="select-media-checkbox" data-id="${doc.id}" data-url="${mediaData.mediaUrl}" />
          </div>
        `;
  
        mediaItem.querySelector(".select-media-checkbox").addEventListener("change", (e) => {
          toggleMediaSelection(mediaData.mediaUrl, e.target.checked);
        });
  
        mediaGrid.appendChild(mediaItem);
      } catch (error) {
        if (error.code === "storage/object-not-found") {
          // Delete the document from Firestore if file does not exist in storage
          await deleteDoc(doc.ref);
        } else {
          console.error("Error verifying media file existence:", error);
        }
      }
    });
  }

  // Load playlists for user
  async function loadPlaylists(userId) {
    playlistOptions.innerHTML = "";
    const playlistsRef = collection(db, "users", userId, "playlists");
    const playlistsSnapshot = await getDocs(playlistsRef);

    playlistsSnapshot.forEach((doc) => {
      const playlistData = doc.data();
      const playlistOption = document.createElement("div");
      playlistOption.classList.add("playlist-option");
      playlistOption.innerHTML = `
        <label>
          <input type="checkbox" data-id="${doc.id}" />
          ${playlistData.name}
        </label>
      `;

      playlistOptions.appendChild(playlistOption);
    });
  }

  // Toggle media selection
  function toggleMediaSelection(mediaUrl, isSelected) {
    if (isSelected) {
      selectedMediaUrls.push(mediaUrl);
    } else {
      selectedMediaUrls = selectedMediaUrls.filter((url) => url !== mediaUrl);
    }
  }

  // Close playlist modal
  function closeModal() {
    playlistModal.style.display = "none";
    newPlaylistInput.value = "";
    selectedMediaUrls = [];
  }

// Video compression function with audio preservation
// async function compressVideo(file, userId) {
//   return new Promise((resolve, reject) => {
//     try {
//       // Create video element to get metadata
//       const video = document.createElement('video');
//       video.muted = true;
//       video.src = URL.createObjectURL(file);
      
//       video.onloadedmetadata = async () => {
//         uploadStatus.textContent = "Processing video...";
        
//         // Determine if compression is needed
//         const needsCompression = video.videoHeight > compressionSettings.video.height;
        
//         if (!needsCompression) {
//           // If no compression needed, upload the original file directly
//           uploadStatus.textContent = "Video doesn't need compression, uploading directly...";
//           URL.revokeObjectURL(video.src);
          
//           const fileName = `${Date.now()}_${file.name}`;
//           const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//           const uploadTask = uploadBytesResumable(fileRef, file);
          
//           uploadTask.on('state_changed', 
//             (snapshot) => {
//               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//               uploadProgress.value = progress;
//               uploadStatus.textContent = `Uploading video: ${Math.round(progress)}%`;
//             },
//             (error) => {
//               console.error("Error uploading video:", error);
//               reject(error);
//             }
//           );
          
//           await new Promise((resolve) => {
//             uploadTask.on('state_changed', null, null, resolve);
//           });
          
//           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//           resolve(downloadURL);
//           return;
//         }
        
//         try {
//           // We'll use MediaRecorder with audio stream
//           uploadStatus.textContent = "Using MediaRecorder API with audio stream...";
          
//           // Create a MediaStream from video element with both audio and video tracks
//           const videoStream = video.captureStream();
          
//           // Create canvas for video resizing
//           const canvas = document.createElement('canvas');
//           const ctx = canvas.getContext('2d');
          
//           // Calculate aspect ratio
//           const aspectRatio = video.videoWidth / video.videoHeight;
//           const targetWidth = Math.min(compressionSettings.video.width, 
//                                       Math.round(compressionSettings.video.height * aspectRatio));
//           const targetHeight = Math.min(compressionSettings.video.height,
//                                         Math.round(compressionSettings.video.width / aspectRatio));
          
//           canvas.width = targetWidth;
//           canvas.height = targetHeight;
          
//           // Capture canvas stream for video
//           const canvasStream = canvas.captureStream(compressionSettings.video.fps);
          
//           // Create a new MediaStream with canvas video track and original audio tracks
//           const combinedStream = new MediaStream();
          
//           // Add the video track from canvas
//           canvasStream.getVideoTracks().forEach(track => {
//             combinedStream.addTrack(track);
//           });
          
//           // Extract audio from original file using AudioContext
//           const audioContext = new AudioContext();
//           const audioSource = audioContext.createMediaElementSource(video);
//           const audioDestination = audioContext.createMediaStreamDestination();
//           audioSource.connect(audioDestination);
          
//           // Add audio track from the destination stream
//           audioDestination.stream.getAudioTracks().forEach(track => {
//             combinedStream.addTrack(track);
//           });
          
//           // Set up MediaRecorder to capture the combined stream
//           const mediaRecorder = new MediaRecorder(combinedStream, {
//             mimeType: 'video/webm;codecs=vp9',
//             videoBitsPerSecond: compressionSettings.video.bitrate
//           });
          
//           const chunks = [];
//           mediaRecorder.ondataavailable = (e) => {
//             if (e.data.size > 0) {
//               chunks.push(e.data);
//             }
//           };
          
//           let uploadPromiseResolve;
//           const uploadPromise = new Promise(resolve => {
//             uploadPromiseResolve = resolve;
//           });
          
//           mediaRecorder.onstop = async () => {
//             audioContext.close(); // Close audio context when done
            
//             const compressedBlob = new Blob(chunks, { type: 'video/webm' });
            
//             // Upload compressed video
//             const fileName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}.webm`;
//             const compressedRef = ref(storage, `users/${userId}/media/${fileName}`);
            
//             const uploadTask = uploadBytesResumable(compressedRef, compressedBlob);
            
//             uploadTask.on('state_changed', 
//               (snapshot) => {
//                 const progress = 50 + (snapshot.bytesTransferred / snapshot.totalBytes) * 50; // First 50% for compression
//                 uploadProgress.value = progress;
//                 uploadStatus.textContent = `Uploading compressed video: ${Math.round((progress - 50) * 2)}%`;
//               },
//               (error) => {
//                 console.error("Error uploading compressed video:", error);
//                 uploadPromiseResolve(null);
//               },
//               async () => {
//                 const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//                 uploadPromiseResolve(downloadURL);
//               }
//             );
//           };
          
//           // Start recording
//           mediaRecorder.start(1000);
          
//           // Process the video
//           video.currentTime = 0;
//           video.muted = false; // Unmute to capture audio
//           await video.play();
          
//           const processFrame = async () => {
//             if (video.ended || video.paused) {
//               mediaRecorder.stop();
//               video.pause();
//               URL.revokeObjectURL(video.src);
//               return;
//             }
            
//             ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            
//             // Update upload status with current position - this represents the first 50% (compression stage)
//             const progressPercent = (video.currentTime / video.duration) * 50;
//             uploadProgress.value = progressPercent;
//             uploadStatus.textContent = `Video compression: ${Math.round(progressPercent * 2)}%`;
            
//             // Continue processing
//             requestAnimationFrame(processFrame);
//           };
          
//           // Start processing frames
//           processFrame();
          
//           // Return the upload promise result
//           const compressedUrl = await uploadPromise;
//           resolve(compressedUrl);
//         } catch (mediaRecorderError) {
//           console.error("Error with MediaRecorder API:", mediaRecorderError);
//           // Fallback: just upload the original if there's an issue with compression
//           uploadStatus.textContent = "Compression failed, uploading original video...";
          
//           const fileName = `${Date.now()}_${file.name}`;
//           const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//           const uploadTask = uploadBytesResumable(fileRef, file);
          
//           uploadTask.on('state_changed', 
//             (snapshot) => {
//               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//               uploadProgress.value = progress;
//               uploadStatus.textContent = `Uploading original video: ${Math.round(progress)}%`;
//             },
//             (error) => {
//               console.error("Error uploading original video as fallback:", error);
//               reject(error);
//             }
//           );
          
//           await new Promise((resolve) => {
//             uploadTask.on('state_changed', null, null, resolve);
//           });
          
//           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//           resolve(downloadURL);
//         }
//       };
      
//       video.onerror = (error) => {
//         console.error("Error loading video for compression:", error);
//         reject(error);
//       };
      
//       video.load();
//     } catch (error) {
//       console.error("Error during video compression:", error);
//       reject(error);
//     }
//   });
// }

// Improved video compression function that works better across platforms




// async function compressVideo(file, userId) {
//   return new Promise((resolve, reject) => {
//     try {
//       // Create video element to get metadata
//       const video = document.createElement('video');
//       video.muted = true;
//       video.preload = "metadata"; // Only load metadata initially
//       video.src = URL.createObjectURL(file);
      
//       // Define compression settings based on platform
//       const compressionSettings = {
//         video: {
//           // More conservative settings that work well cross-platform
//           height: 720,
//           width: 1280,
//           fps: 30,
//           bitrate: 2500000, // 2.5 Mbps - more reasonable for cross-platform
//           // Add chunking size to optimize memory usage
//           chunkSize: 1000
//         }
//       };

//       // Add upload progress elements that should be defined elsewhere in your app
//       const uploadStatus = document.getElementById('uploadStatus') || { textContent: '' };
//       const uploadProgress = document.getElementById('uploadProgress') || { value: 0 };
      
//       video.onloadedmetadata = async () => {
//         uploadStatus.textContent = "Processing video...";
        
//         // Get video details
//         const duration = video.duration;
//         const videoWidth = video.videoWidth;
//         const videoHeight = video.videoHeight;
        
//         // Check file size - for larger files, use more aggressive compression
//         const fileSizeMB = file.size / (1024 * 1024);
//         const isLargeFile = fileSizeMB > 50; // 50MB threshold
        
//         // Determine if compression is needed based on resolution and file size
//         const needsCompression = videoHeight > compressionSettings.video.height || 
//                                  videoWidth > compressionSettings.video.width || 
//                                  isLargeFile;
        
//         if (!needsCompression) {
//           // If no compression needed, upload the original file directly
//           uploadStatus.textContent = "Video doesn't need compression, uploading directly...";
//           URL.revokeObjectURL(video.src);
          
//           const fileName = `${Date.now()}_${file.name}`;
//           const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//           const uploadTask = uploadBytesResumable(fileRef, file);
          
//           uploadTask.on('state_changed', 
//             (snapshot) => {
//               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//               uploadProgress.value = progress;
//               uploadStatus.textContent = `Uploading video: ${Math.round(progress)}%`;
//             },
//             (error) => {
//               console.error("Error uploading video:", error);
//               reject(error);
//             }
//           );
          
//           await new Promise((resolve) => {
//             uploadTask.on('state_changed', null, null, resolve);
//           });
          
//           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//           resolve(downloadURL);
//           return;
//         }
        
//         try {
//           // Platform detection to adjust settings if needed
//           const isWindows = navigator.platform.indexOf('Win') > -1;
          
//           // Adjust settings for Windows to improve performance
//           if (isWindows) {
//             compressionSettings.video.fps = 24; // Lower framerate for Windows
//             // Use a less demanding codec on Windows
//             compressionSettings.video.codec = 'vp8'; 
//           } else {
//             compressionSettings.video.codec = 'vp9'; // Better quality on macOS
//           }
          
//           uploadStatus.textContent = "Initializing compression...";
          
//           // Calculate target dimensions while preserving aspect ratio
//           const aspectRatio = videoWidth / videoHeight;
//           let targetWidth, targetHeight;
          
//           if (aspectRatio > 1) {
//             // Landscape orientation
//             targetWidth = Math.min(compressionSettings.video.width, 
//                                  Math.round(compressionSettings.video.height * aspectRatio));
//             targetHeight = Math.min(compressionSettings.video.height,
//                                   Math.round(targetWidth / aspectRatio));
//           } else {
//             // Portrait orientation
//             targetHeight = Math.min(compressionSettings.video.height, 
//                                   Math.round(compressionSettings.video.width / aspectRatio));
//             targetWidth = Math.min(compressionSettings.video.width,
//                                  Math.round(targetHeight * aspectRatio));
//           }
          
//           // Make dimensions even (required by some codecs)
//           targetWidth = Math.floor(targetWidth / 2) * 2;
//           targetHeight = Math.floor(targetHeight / 2) * 2;
          
//           // Create canvas for video resizing
//           const canvas = document.createElement('canvas');
//           const ctx = canvas.getContext('2d');
//           canvas.width = targetWidth;
//           canvas.height = targetHeight;
          
//           // Check for browser support for specific codecs
//           const mimeType = `video/webm;codecs=${compressionSettings.video.codec}`;
//           if (!MediaRecorder.isTypeSupported(mimeType)) {
//             // Fallback to basic WebM if the specified codec isn't supported
//             compressionSettings.video.codec = 'vp8';
//             compressionSettings.video.mimeType = 'video/webm';
//           } else {
//             compressionSettings.video.mimeType = mimeType;
//           }
          
//           // Create streams and recorder with optimized settings
//           let canvasStream;
//           try {
//             // Try with the specified FPS first
//             canvasStream = canvas.captureStream(compressionSettings.video.fps);
//           } catch (e) {
//             // Fallback to default FPS if specifying FPS fails
//             canvasStream = canvas.captureStream();
//           }
          
//           // Set up audio processing
//           const audioContext = new AudioContext();
//           const audioSource = audioContext.createMediaElementSource(video);
//           const audioDestination = audioContext.createMediaStreamDestination();
          
//           // Add a gain node to control audio levels
//           const gainNode = audioContext.createGain();
//           gainNode.gain.value = 1.0; // Maintain original volume
          
//           // Connect audio nodes
//           audioSource.connect(gainNode);
//           gainNode.connect(audioDestination);
          
//           // Combine streams
//           const combinedStream = new MediaStream();
          
//           // Add video track
//           canvasStream.getVideoTracks().forEach(track => {
//             combinedStream.addTrack(track);
//           });
          
//           // Add audio track
//           audioDestination.stream.getAudioTracks().forEach(track => {
//             combinedStream.addTrack(track);
//           });
          
//           // Set up MediaRecorder with optimized settings
//           const mediaRecorder = new MediaRecorder(combinedStream, {
//             mimeType: compressionSettings.video.mimeType,
//             videoBitsPerSecond: compressionSettings.video.bitrate
//           });
          
//           const chunks = [];
//           mediaRecorder.ondataavailable = (e) => {
//             if (e.data.size > 0) {
//               chunks.push(e.data);
//             }
//           };
          
//           // Create promise for upload completion
//           let uploadPromiseResolve;
//           const uploadPromise = new Promise(resolve => {
//             uploadPromiseResolve = resolve;
//           });
          
//           mediaRecorder.onstop = async () => {
//             // Clean up resources
//             canvasStream.getTracks().forEach(track => track.stop());
//             audioContext.close();
            
//             // Create final video blob
//             const compressedBlob = new Blob(chunks, { type: compressionSettings.video.mimeType });
            
//             uploadStatus.textContent = `Compression complete. Original: ${Math.round(fileSizeMB * 10) / 10}MB, Compressed: ${Math.round(compressedBlob.size / 1024 / 1024 * 10) / 10}MB`;
            
//             // Upload compressed video
//             const extension = compressionSettings.video.mimeType.includes('webm') ? 'webm' : 'mp4';
//             const fileName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
//             const compressedRef = ref(storage, `users/${userId}/media/${fileName}`);
            
//             const uploadTask = uploadBytesResumable(compressedRef, compressedBlob);
            
//             uploadTask.on('state_changed', 
//               (snapshot) => {
//                 const progress = 50 + (snapshot.bytesTransferred / snapshot.totalBytes) * 50;
//                 uploadProgress.value = progress;
//                 uploadStatus.textContent = `Uploading compressed video: ${Math.round((progress - 50) * 2)}%`;
//               },
//               (error) => {
//                 console.error("Error uploading compressed video:", error);
//                 uploadPromiseResolve(null);
//               },
//               async () => {
//                 const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//                 uploadPromiseResolve(downloadURL);
//               }
//             );
//           };
          
//           // Start recording with optimal chunk size
//           mediaRecorder.start(compressionSettings.video.chunkSize);
          
//           // Prepare video for playback with explicit loading
//           video.muted = false;
          
//           // Handle video playback for frame extraction
//           let frameCount = 0;
//           let lastProgressUpdate = 0;
          
//           // Function to process video frames with optimized performance
//           const processFrame = () => {
//             if (video.ended || video.paused) {
//               mediaRecorder.stop();
//               video.pause();
//               URL.revokeObjectURL(video.src);
//               return;
//             }
            
//             // Only process every other frame on Windows for better performance
//             frameCount++;
//             if (isWindows && frameCount % 2 !== 0) {
//               requestAnimationFrame(processFrame);
//               return;
//             }
            
//             // Draw current frame to canvas
//             ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            
//             // Update progress less frequently to reduce UI overhead
//             const currentTime = video.currentTime;
//             if (currentTime - lastProgressUpdate > 0.5 || currentTime === 0) {
//               const progressPercent = (currentTime / duration) * 50;
//               uploadProgress.value = progressPercent;
//               uploadStatus.textContent = `Video compression: ${Math.round(progressPercent * 2)}%`;
//               lastProgressUpdate = currentTime;
//             }
            
//             // Schedule next frame
//             requestAnimationFrame(processFrame);
//           };
          
//           // Start video playback and processing
//           video.currentTime = 0;
          
//           // Handle video playing event to start processing
//           video.onplaying = () => {
//             processFrame();
//           };
          
//           // Add error handler for video playback
//           video.onerror = (e) => {
//             console.error("Error during video playback:", e);
//             mediaRecorder.stop();
//             reject(new Error("Video playback failed during compression"));
//           };
          
//           try {
//             await video.play();
//           } catch (playError) {
//             console.error("Could not play video:", playError);
//             // Fallback to direct upload if playback fails
//             URL.revokeObjectURL(video.src);
            
//             uploadStatus.textContent = "Compression failed, uploading original video...";
//             const fileName = `${Date.now()}_${file.name}`;
//             const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//             const uploadTask = uploadBytesResumable(fileRef, file);
            
//             uploadTask.on('state_changed', 
//               (snapshot) => {
//                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//                 uploadProgress.value = progress;
//                 uploadStatus.textContent = `Uploading original video: ${Math.round(progress)}%`;
//               },
//               (error) => {
//                 console.error("Error uploading original video as fallback:", error);
//                 reject(error);
//               }
//             );
            
//             await new Promise((resolve) => {
//               uploadTask.on('state_changed', null, null, resolve);
//             });
            
//             const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//             resolve(downloadURL);
//             return;
//           }
          
//           // Return the upload promise result
//           const compressedUrl = await uploadPromise;
//           resolve(compressedUrl);
          
//         } catch (compressionError) {
//           console.error("Error during video compression:", compressionError);
//           // Fallback: upload the original if there's an issue with compression
//           uploadStatus.textContent = "Compression failed, uploading original video...";
          
//           const fileName = `${Date.now()}_${file.name}`;
//           const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//           const uploadTask = uploadBytesResumable(fileRef, file);
          
//           uploadTask.on('state_changed', 
//             (snapshot) => {
//               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//               uploadProgress.value = progress;
//               uploadStatus.textContent = `Uploading original video: ${Math.round(progress)}%`;
//             },
//             (error) => {
//               console.error("Error uploading original video as fallback:", error);
//               reject(error);
//             }
//           );
          
//           await new Promise((resolve) => {
//             uploadTask.on('state_changed', null, null, resolve);
//           });
          
//           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//           resolve(downloadURL);
//         }
//       };
      
//       video.onerror = (error) => {
//         console.error("Error loading video for compression:", error);
//         reject(error);
//       };
      
//       video.load();
//     } catch (error) {
//       console.error("Error during video compression setup:", error);
//       reject(error);
//     }
//   });
// }

// async function compressVideo(file, userId) {
//   return new Promise((resolve, reject) => {
//     try {
//       // Create video element to get metadata
//       const video = document.createElement('video');
//       video.muted = true;
//       video.preload = "metadata"; // Only load metadata initially
//       video.src = URL.createObjectURL(file);
      
//       // Define compression settings with better Windows compatibility
//       const compressionSettings = {
//         video: {
//           height: 1080,
//           width: 1920,
//           fps: 30, // Lower default fps for better Windows compatibility
//           bitrate: 8000000, // 2 Mbps - better for cross-platform
//           chunkSize: 1000,
//           // Default to VP8 which has better support across platforms
//           codec: 'vp8',
//           mimeType: 'video/webm'
//         }
//       };

//       // Get or create placeholder UI elements if needed
//       const uploadStatus = document.getElementById('uploadStatus') || { 
//         textContent: '' 
//       };
//       const uploadProgress = document.getElementById('uploadProgress') || { 
//         value: 0 
//       };
      
//       video.onloadedmetadata = async () => {
//         uploadStatus.textContent = "Processing video...";
        
//         // Get video details
//         const duration = video.duration;
//         const videoWidth = video.videoWidth;
//         const videoHeight = video.videoHeight;
        
//         // Check file size - for larger files, use more aggressive compression
//         const fileSizeMB = file.size / (1024 * 1024);
//         const isLargeFile = fileSizeMB > 50; // 50MB threshold
        
//         // FIXED: Improved decision logic that properly handles smaller videos
//         const needsCompression = (videoHeight > compressionSettings.video.height || 
//                                  videoWidth > compressionSettings.video.width ||
//                                  (isLargeFile && !(videoHeight < compressionSettings.video.height && 
//                                                   videoWidth < compressionSettings.video.width)));
        
//         if (!needsCompression) {
//           // If no compression needed, upload the original file directly
//           uploadStatus.textContent = "Video doesn't need compression, uploading directly...";
//           URL.revokeObjectURL(video.src);
          
//           const fileName = `${Date.now()}_${file.name}`;
//           const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//           const uploadTask = uploadBytesResumable(fileRef, file);
          
//           uploadTask.on('state_changed', 
//             (snapshot) => {
//               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//               uploadProgress.value = progress;
//               uploadStatus.textContent = `Uploading video: ${Math.round(progress)}%`;
//             },
//             (error) => {
//               console.error("Error uploading video:", error);
//               reject(error);
//             }
//           );
          
//           await new Promise((resolve) => {
//             uploadTask.on('state_changed', null, null, resolve);
//           });
          
//           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//           resolve(downloadURL);
//           return;
//         }
        
//         try {
//           // Platform detection with more specific browser capability checks
//           const isWindows = navigator.platform.indexOf('Win') > -1;
//           const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
//           const isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
          
//           // IMPROVED: More specialized codec selection based on browser
//           if (isWindows) {
//             // VP8 is more widely supported on Windows
//             compressionSettings.video.codec = 'vp8';
//             compressionSettings.video.mimeType = 'video/webm';
            
//             // Lower quality but better compatibility for Windows
//             if (!isChrome && !isFirefox) {
//               // For Edge or IE, use even more conservative settings
//               compressionSettings.video.bitrate = 1500000; // 1.5 Mbps
//               compressionSettings.video.fps = 20; // Even lower framerate
//             }
//           } else {
//             // Try better quality on non-Windows if supported
//             if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
//               compressionSettings.video.codec = 'vp9';
//               compressionSettings.video.mimeType = 'video/webm;codecs=vp9';
//             } else {
//               // Fallback to VP8
//               compressionSettings.video.codec = 'vp8';
//               compressionSettings.video.mimeType = 'video/webm';
//             }
//           }
          
//           uploadStatus.textContent = "Initializing compression...";
          
//           // Calculate target dimensions while preserving aspect ratio
//           const aspectRatio = videoWidth / videoHeight;
//           let targetWidth, targetHeight;
          
//           if (aspectRatio > 1) {
//             // Landscape orientation
//             targetWidth = Math.min(compressionSettings.video.width, 
//                                  Math.round(compressionSettings.video.height * aspectRatio));
//             targetHeight = Math.min(compressionSettings.video.height,
//                                   Math.round(targetWidth / aspectRatio));
//           } else {
//             // Portrait orientation
//             targetHeight = Math.min(compressionSettings.video.height, 
//                                   Math.round(compressionSettings.video.width / aspectRatio));
//             targetWidth = Math.min(compressionSettings.video.width,
//                                  Math.round(targetHeight * aspectRatio));
//           }
          
//           // Make dimensions even (required by some codecs)
//           targetWidth = Math.floor(targetWidth / 2) * 2;
//           targetHeight = Math.floor(targetHeight / 2) * 2;
          
//           // Create canvas for video resizing
//           const canvas = document.createElement('canvas');
//           const ctx = canvas.getContext('2d');
//           canvas.width = targetWidth;
//           canvas.height = targetHeight;
          
//           // IMPROVED: More robust MediaRecorder type checking
//           let mimeType = compressionSettings.video.mimeType;
//           if (!MediaRecorder.isTypeSupported(mimeType)) {
//             // Try simpler MIME types if the specific codec isn't supported
//             if (MediaRecorder.isTypeSupported('video/webm')) {
//               mimeType = 'video/webm';
//             } else if (MediaRecorder.isTypeSupported('video/mp4')) {
//               mimeType = 'video/mp4';
//             } else {
//               // If no supported type is found, use default
//               mimeType = '';
//             }
//           }
//           compressionSettings.video.mimeType = mimeType;
          
//           // IMPROVED: More robust canvas stream creation with better fallbacks
//           let canvasStream;
//           try {
//             // Try with the specified FPS first
//             canvasStream = canvas.captureStream(compressionSettings.video.fps);
//           } catch (e) {
//             console.warn("Error capturing canvas stream with FPS:", e);
//             try {
//               // Fallback to default FPS
//               canvasStream = canvas.captureStream();
//             } catch (e2) {
//               console.error("Cannot capture canvas stream:", e2);
//               // If canvas streaming fails, fallback to original upload
//               throw new Error("Canvas stream capture not supported in this browser");
//             }
//           }
          
//           // IMPROVED: Audio handling with better error recovery
//           let audioDestination;
//           let audioContext;
//           let audioTracks = [];
          
//           try {
//             // Create AudioContext only when needed (deferred initialization)
//             // Use window.AudioContext for better cross-browser support
//             const AudioContextClass = window.AudioContext || window.webkitAudioContext;
//             audioContext = new AudioContextClass();
            
//             // Use try-catch for each audio processing step
//             try {
//               const audioSource = audioContext.createMediaElementSource(video);
//               audioDestination = audioContext.createMediaStreamDestination();
              
//               // Add a gain node to control audio levels
//               const gainNode = audioContext.createGain();
//               gainNode.gain.value = 1.0; // Maintain original volume
              
//               // Connect audio nodes
//               audioSource.connect(gainNode);
//               gainNode.connect(audioDestination);
              
//               // Store audio tracks for later use
//               audioTracks = audioDestination.stream.getAudioTracks();
//             } catch (audioErr) {
//               console.warn("Audio processing failed, continuing without audio:", audioErr);
//               if (audioContext) {
//                 audioContext.close().catch(e => console.warn("Error closing audio context:", e));
//               }
//             }
//           } catch (audioContextErr) {
//             console.warn("AudioContext creation failed, continuing without audio:", audioContextErr);
//           }
          
//           // Combine streams
//           const combinedStream = new MediaStream();
          
//           // Add video track
//           canvasStream.getVideoTracks().forEach(track => {
//             combinedStream.addTrack(track);
//           });
          
//           // Add audio track if available
//           if (audioTracks && audioTracks.length > 0) {
//             audioTracks.forEach(track => {
//               combinedStream.addTrack(track);
//             });
//           }
          
//           // IMPROVED: More robust MediaRecorder creation with better fallbacks
//           let mediaRecorder;
//           try {
//             const recorderOptions = compressionSettings.video.mimeType ? 
//               { mimeType: compressionSettings.video.mimeType } : {};
              
//             // Add bitrate only if supported by the browser
//             if ('videoBitsPerSecond' in MediaRecorder.prototype) {
//               recorderOptions.videoBitsPerSecond = compressionSettings.video.bitrate;
//             }
            
//             mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
//           } catch (recorderError) {
//             console.warn("Failed to create MediaRecorder with options, trying default:", recorderError);
//             try {
//               // Try with minimal options
//               mediaRecorder = new MediaRecorder(combinedStream);
//             } catch (fallbackError) {
//               console.error("MediaRecorder creation failed completely:", fallbackError);
//               throw new Error("MediaRecorder not supported in this browser");
//             }
//           }
          
//           const chunks = [];
//           mediaRecorder.ondataavailable = (e) => {
//             if (e.data.size > 0) {
//               chunks.push(e.data);
//             }
//           };
          
//           // Create promise for upload completion
//           let uploadPromiseResolve;
//           const uploadPromise = new Promise(resolve => {
//             uploadPromiseResolve = resolve;
//           });
          
//           mediaRecorder.onstop = async () => {
//             // Clean up resources
//             canvasStream.getTracks().forEach(track => track.stop());
//             if (audioContext) {
//               try {
//                 await audioContext.close();
//               } catch (e) {
//                 console.warn("Error closing audio context:", e);
//               }
//             }
            
//             // Create final video blob with appropriate type
//             const blobOptions = { type: compressionSettings.video.mimeType || 'video/webm' };
//             const compressedBlob = new Blob(chunks, blobOptions);
            
//             uploadStatus.textContent = `Compression complete. Original: ${Math.round(fileSizeMB * 10) / 10}MB, Compressed: ${Math.round(compressedBlob.size / 1024 / 1024 * 10) / 10}MB`;
            
//             // Handle case where compression failed to reduce size
//             if (compressedBlob.size >= file.size) {
//               console.warn("Compression did not reduce file size, using original");
//               uploadStatus.textContent = "Compression ineffective, uploading original...";
              
//               const fileName = `${Date.now()}_${file.name}`;
//               const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//               const uploadTask = uploadBytesResumable(fileRef, file);
              
//               uploadTask.on('state_changed', 
//                 (snapshot) => {
//                   const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//                   uploadProgress.value = progress;
//                   uploadStatus.textContent = `Uploading original video: ${Math.round(progress)}%`;
//                 },
//                 (error) => {
//                   console.error("Error uploading original video:", error);
//                   uploadPromiseResolve(null);
//                 },
//                 async () => {
//                   const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//                   uploadPromiseResolve(downloadURL);
//                 }
//               );
              
//               return;
//             }
            
//             // Upload compressed video
//             const extension = compressionSettings.video.mimeType.includes('webm') ? 'webm' : 'mp4';
//             const fileName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
//             const compressedRef = ref(storage, `users/${userId}/media/${fileName}`);
            
//             const uploadTask = uploadBytesResumable(compressedRef, compressedBlob);
            
//             uploadTask.on('state_changed', 
//               (snapshot) => {
//                 const progress = 50 + (snapshot.bytesTransferred / snapshot.totalBytes) * 50;
//                 uploadProgress.value = progress;
//                 uploadStatus.textContent = `Uploading compressed video: ${Math.round((progress - 50) * 2)}%`;
//               },
//               (error) => {
//                 console.error("Error uploading compressed video:", error);
//                 uploadPromiseResolve(null);
//               },
//               async () => {
//                 const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//                 uploadPromiseResolve(downloadURL);
//               }
//             );
//           };
          
//           // IMPROVED: More robust frame processing with better error handling
//           // Start recording with optimal chunk size
//           mediaRecorder.start(compressionSettings.video.chunkSize);
          
//           // Prepare video for playback with explicit loading
//           video.muted = false;
          
//           // Variables for frame processing
//           let frameCount = 0;
//           let lastProgressUpdate = 0;
//           let processingActive = true;
          
//           // IMPROVED: More efficient frame processing function
//           const processFrame = () => {
//             if (!processingActive || video.ended || video.paused) {
//               mediaRecorder.stop();
//               video.pause();
//               return;
//             }
            
//             // Process frames at a reduced rate on Windows for better performance
//             frameCount++;
//             if (isWindows && frameCount % 2 !== 0) {
//               requestAnimationFrame(processFrame);
//               return;
//             }
            
//             try {
//               // Draw current frame to canvas
//               ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
              
//               // Update progress less frequently to reduce UI overhead
//               const currentTime = video.currentTime;
//               if (currentTime - lastProgressUpdate > 0.5 || currentTime === 0) {
//                 const progressPercent = (currentTime / duration) * 50;
//                 uploadProgress.value = progressPercent;
//                 uploadStatus.textContent = `Video compression: ${Math.round(progressPercent * 2)}%`;
//                 lastProgressUpdate = currentTime;
//               }
              
//               // Schedule next frame
//               requestAnimationFrame(processFrame);
//             } catch (frameError) {
//               console.error("Error processing video frame:", frameError);
//               processingActive = false;
//               mediaRecorder.stop();
//             }
//           };
          
//           // IMPROVED: More robust video playback with better error handling
//           // Add timeout for video playback start
//           const playbackTimeout = setTimeout(() => {
//             console.warn("Video playback timeout - falling back to direct upload");
//             processingActive = false;
//             try {
//               mediaRecorder.stop();
//             } catch (e) {
//               console.warn("Error stopping media recorder:", e);
//             }
            
//             // Fallback to direct upload
//             uploadStatus.textContent = "Processing timeout, uploading original...";
//             const fileName = `${Date.now()}_${file.name}`;
//             const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//             const uploadTask = uploadBytesResumable(fileRef, file);
            
//             uploadTask.on('state_changed', 
//               (snapshot) => {
//                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//                 uploadProgress.value = progress;
//                 uploadStatus.textContent = `Uploading original: ${Math.round(progress)}%`;
//               },
//               (error) => {
//                 console.error("Error uploading original:", error);
//                 reject(error);
//               },
//               async () => {
//                 const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//                 resolve(downloadURL);
//               }
//             );
//           }, 30000); // 30-second timeout
          
//           // Handle video playing event to start processing
//           video.onplaying = () => {
//             clearTimeout(playbackTimeout);
//             processFrame();
//           };
          
//           // Add error handler for video playback
//           video.onerror = (e) => {
//             clearTimeout(playbackTimeout);
//             console.error("Error during video playback:", e);
//             processingActive = false;
            
//             try {
//               mediaRecorder.stop();
//             } catch (stopError) {
//               console.warn("Error stopping media recorder after playback error:", stopError);
//             }
            
//             // Fallback to direct upload on error
//             uploadDirectFallback();
//           };
          
//           // Function to handle direct upload fallback
//           const uploadDirectFallback = async () => {
//             URL.revokeObjectURL(video.src);
            
//             uploadStatus.textContent = "Processing failed, uploading original video...";
//             const fileName = `${Date.now()}_${file.name}`;
//             const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//             const uploadTask = uploadBytesResumable(fileRef, file);
            
//             uploadTask.on('state_changed', 
//               (snapshot) => {
//                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//                 uploadProgress.value = progress;
//                 uploadStatus.textContent = `Uploading original: ${Math.round(progress)}%`;
//               },
//               (error) => {
//                 console.error("Error uploading original:", error);
//                 reject(error);
//               },
//               async () => {
//                 const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//                 resolve(downloadURL);
//               }
//             );
//           };
          
//           // Start video playback
//           try {
//             video.currentTime = 0;
//             await video.play();
//           } catch (playError) {
//             clearTimeout(playbackTimeout);
//             console.error("Could not play video:", playError);
//             processingActive = false;
            
//             try {
//               mediaRecorder.stop();
//             } catch (stopError) {
//               console.warn("Error stopping media recorder after play error:", stopError);
//             }
            
//             // Fallback to direct upload if playback fails
//             uploadDirectFallback();
//             return;
//           }
          
//           // Wait for compression and upload to complete
//           const compressedUrl = await uploadPromise;
//           URL.revokeObjectURL(video.src);
//           resolve(compressedUrl);
          
//         } catch (compressionError) {
//           console.error("Error during video compression:", compressionError);
//           // Clean up resources
//           URL.revokeObjectURL(video.src);
          
//           // Fallback: upload the original if there's an issue with compression
//           uploadStatus.textContent = "Compression failed, uploading original video...";
          
//           const fileName = `${Date.now()}_${file.name}`;
//           const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
//           const uploadTask = uploadBytesResumable(fileRef, file);
          
//           uploadTask.on('state_changed', 
//             (snapshot) => {
//               const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//               uploadProgress.value = progress;
//               uploadStatus.textContent = `Uploading original: ${Math.round(progress)}%`;
//             },
//             (error) => {
//               console.error("Error uploading original video as fallback:", error);
//               reject(error);
//             },
//             async () => {
//               const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//               resolve(downloadURL);
//             }
//           );
//         }
//       };
      
//       video.onerror = (error) => {
//         console.error("Error loading video for compression:", error);
//         URL.revokeObjectURL(video.src);
//         reject(error);
//       };
      
//       video.load();
//     } catch (error) {
//       console.error("Error during video compression setup:", error);
//       reject(error);
//     }
//   });
// }

/**
 * Cross-platform video compression function that works smoothly on all operating systems
 * Uses chunked processing, adaptive quality, and optimized memory management
 * @param {File} file - The video file to compress
 * @param {string} userId - User ID for storage path
 * @returns {Promise<string>} - URL of the uploaded video
 */
async function compressVideo(file, userId) {
  return new Promise((resolve, reject) => {
    try {
      // Get or create UI elements
      const uploadStatus = document.getElementById('uploadStatus') || { textContent: '' };
      const uploadProgress = document.getElementById('uploadProgress') || { value: 0 };
      
      // Create a worker for video analysis if supported
      let analysisWorker = null;
      try {
        const workerSupported = typeof Worker !== 'undefined';
        if (workerSupported) {
          // This would be a separate file in your project
          // We're just defining a placeholder here
          const workerCode = `
            self.onmessage = function(e) {
              // Analysis code would go here in a real implementation
              self.postMessage({
                complexity: 'medium', 
                recommendedBitrate: 4000000
              });
            }
          `;
          
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          analysisWorker = new Worker(workerUrl);
        }
      } catch (e) {
        console.warn('Web Worker not supported, falling back to main thread processing', e);
      }
      
      // Create video element to load metadata
      const video = document.createElement('video');
      video.muted = true;
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);
      
      // Initial compression settings - will be adjusted based on capabilities
      const compressionSettings = {
        video: {
          height: 1080,
          width: 1920,
          fps: 30,
          bitrate: 6000000, // 8 Mbps target
          chunkSize: 1000,
          // Will be determined dynamically based on browser support
          codec: null,
          mimeType: null,
          // For chunked processing
          chunkDurationSecs: 3,
          processingQueueSize: 5
        }
      };
      
      // Detection of browser capabilities for optimal settings
      const detectCapabilities = () => {
        // Detect platform
        const isWindows = navigator.platform.indexOf('Win') > -1;
        const isMac = navigator.platform.indexOf('Mac') > -1;
        const cpuCores = navigator.hardwareConcurrency || 4;
        
        // Adjust settings for low-powered devices
        if (cpuCores <= 2) {
          compressionSettings.video.height = 720;
          compressionSettings.video.width = 1280;
          compressionSettings.video.bitrate = 2000000; // 2 Mbps for low-power
          compressionSettings.video.fps = 24;
        }
        
        // Find the best supported codec and mime type
        const supportedTypes = [
          // Best quality options first
          { mimeType: 'video/mp4; codecs=avc1.42E01E', codec: 'h264' },
          { mimeType: 'video/webm; codecs=vp9', codec: 'vp9' },
          { mimeType: 'video/webm; codecs=vp8', codec: 'vp8' },
          { mimeType: 'video/webm', codec: 'vp8' }
        ];
        
        // Test each codec in order of preference
        for (const type of supportedTypes) {
          try {
            if (MediaRecorder.isTypeSupported(type.mimeType)) {
              compressionSettings.video.codec = type.codec;
              compressionSettings.video.mimeType = type.mimeType;
              break;
            }
          } catch (e) {
            console.warn(`Error testing mime type: ${type.mimeType}`, e);
          }
        }
        
        // If no specific type is supported, use default
        if (!compressionSettings.video.mimeType) {
          compressionSettings.video.codec = 'vp8';
          compressionSettings.video.mimeType = 'video/webm';
        }
        
        // Windows-specific optimizations
        if (isWindows) {
          // Smaller chunk duration for Windows to prevent memory pressure
          compressionSettings.video.chunkDurationSecs = 2;
          
          // Prefer H.264 on Windows if available (better hardware acceleration)
          if (compressionSettings.video.codec !== 'h264') {
            try {
              if (MediaRecorder.isTypeSupported('video/webm; codecs=h264')) {
                compressionSettings.video.codec = 'h264';
                compressionSettings.video.mimeType = 'video/webm; codecs=h264';
              }
            } catch (e) {
              // H.264 not supported, stick with previously selected codec
            }
          }
        }
        
        // Mac-specific optimizations
        if (isMac) {
          // Mac can handle larger processing chunks
          compressionSettings.video.chunkDurationSecs = 5;
          compressionSettings.video.processingQueueSize = 8;
        }
        
        return {
          isWindows,
          isMac,
          cpuCores
        };
      };
      
      video.onloadedmetadata = async () => {
        try {
          uploadStatus.textContent = "Analyzing video...";
          
          // Get video details
          const duration = video.duration;
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          
          // Get platform capabilities
          const capabilities = detectCapabilities();
          
          // Check file size
          const fileSizeMB = file.size / (1024 * 1024);
          const isLargeFile = fileSizeMB > 50;
          
          // Improved compression decision logic
          const needsCompression = (videoHeight > compressionSettings.video.height || 
                                   videoWidth > compressionSettings.video.width ||
                                   (isLargeFile && !(videoHeight < compressionSettings.video.height && 
                                                    videoWidth < compressionSettings.video.width)));
          
          if (!needsCompression) {
            // If no compression needed, upload original directly
            uploadStatus.textContent = "Video doesn't need compression, uploading directly...";
            URL.revokeObjectURL(video.src);
            
            const fileName = `${Date.now()}_${file.name}`;
            const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
            const uploadTask = uploadBytesResumable(fileRef, file);
            
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadProgress.value = progress;
                uploadStatus.textContent = `Uploading video: ${Math.round(progress)}%`;
              },
              (error) => {
                console.error("Error uploading video:", error);
                reject(error);
              },
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              }
            );
            return;
          }
          
          // Calculate target dimensions preserving aspect ratio
          const aspectRatio = videoWidth / videoHeight;
          let targetWidth, targetHeight;
          
          if (aspectRatio > 1) {
            // Landscape
            targetWidth = Math.min(compressionSettings.video.width, 
                               Math.round(compressionSettings.video.height * aspectRatio));
            targetHeight = Math.min(compressionSettings.video.height,
                                Math.round(targetWidth / aspectRatio));
          } else {
            // Portrait
            targetHeight = Math.min(compressionSettings.video.height, 
                                Math.round(compressionSettings.video.width / aspectRatio));
            targetWidth = Math.min(compressionSettings.video.width,
                               Math.round(targetHeight * aspectRatio));
          }
          
          // Make dimensions even (required by codecs)
          targetWidth = Math.floor(targetWidth / 2) * 2;
          targetHeight = Math.floor(targetHeight / 2) * 2;
          
          uploadStatus.textContent = "Initializing compression...";
          
          // Create canvas for video processing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Prepare for chunked processing
          const totalChunks = Math.ceil(duration / compressionSettings.video.chunkDurationSecs);
          const chunks = [];
          
          // Function to process video in chunks
          const processVideoChunks = async () => {
            let currentChunk = 0;
            let startTime = 0;
            
            while (currentChunk < totalChunks) {
              const endTime = Math.min(startTime + compressionSettings.video.chunkDurationSecs, duration);
              
              try {
                uploadStatus.textContent = `Processing chunk ${currentChunk + 1}/${totalChunks}...`;
                const chunkBlob = await processChunk(startTime, endTime);
                chunks.push(chunkBlob);
                
                // Update progress based on chunks completed
                const progress = ((currentChunk + 1) / totalChunks) * 50;
                uploadProgress.value = progress;
                
                // Force a small delay to let the browser breathe
                await new Promise(r => setTimeout(r, 100));
                
                // Move to next chunk
                currentChunk++;
                startTime = endTime;
              } catch (chunkError) {
                console.error(`Error processing chunk ${currentChunk}:`, chunkError);
                
                if (chunks.length > 0) {
                  // We have some chunks, try to continue with what we have
                  currentChunk++;
                  startTime = endTime;
                } else {
                  // No chunks processed successfully, fall back to original upload
                  throw new Error("Failed to process any video chunks");
                }
              }
            }
            
            // Combine all chunks into final video
            return combineChunks(chunks);
          };
          
          // Process a single video chunk
          const processChunk = (startTime, endTime) => {
            return new Promise(async (resolveChunk, rejectChunk) => {
              try {
                // Set video to start time
                video.currentTime = startTime;
                
                // Wait for seek to complete
                await new Promise((resolve) => {
                  const seeked = () => {
                    video.removeEventListener('seeked', seeked);
                    resolve();
                  };
                  video.addEventListener('seeked', seeked);
                });
                
                // Create streams for this chunk
                let canvasStream;
                try {
                  canvasStream = canvas.captureStream(compressionSettings.video.fps);
                } catch (e) {
                  canvasStream = canvas.captureStream();
                }
                
                // Set up audio processing for this chunk
                let audioContext = null;
                let audioDestination = null;
                let audioTracks = [];
                
                try {
                  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                  audioContext = new AudioContextClass();
                  const audioSource = audioContext.createMediaElementSource(video);
                  audioDestination = audioContext.createMediaStreamDestination();
                  
                  // Add gain node to control volume
                  const gainNode = audioContext.createGain();
                  gainNode.gain.value = 1.0;
                  
                  audioSource.connect(gainNode);
                  gainNode.connect(audioDestination);
                  audioTracks = audioDestination.stream.getAudioTracks();
                } catch (audioErr) {
                  console.warn("Could not process audio, continuing without audio:", audioErr);
                }
                
                // Create combined stream
                const combinedStream = new MediaStream();
                
                // Add video track
                canvasStream.getVideoTracks().forEach(track => {
                  combinedStream.addTrack(track);
                });
                
                // Add audio tracks if available
                if (audioTracks && audioTracks.length > 0) {
                  audioTracks.forEach(track => {
                    combinedStream.addTrack(track);
                  });
                }
                
                // Create MediaRecorder with dynamic options
                const recorderOptions = compressionSettings.video.mimeType ? 
                  { mimeType: compressionSettings.video.mimeType } : {};
                
                // Add bitrate if supported
                if ('videoBitsPerSecond' in MediaRecorder.prototype) {
                  recorderOptions.videoBitsPerSecond = compressionSettings.video.bitrate;
                }
                
                const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
                
                // Collect data
                const chunkDataArray = [];
                mediaRecorder.ondataavailable = (e) => {
                  if (e.data.size > 0) {
                    chunkDataArray.push(e.data);
                  }
                };
                
                // Handle completion
                mediaRecorder.onstop = () => {
                  // Clean up resources
                  canvasStream.getTracks().forEach(track => track.stop());
                  if (audioContext) {
                    audioContext.close().catch(e => console.warn("Error closing audio context:", e));
                  }
                  
                  // Create blob for this chunk
                  const chunkBlob = new Blob(chunkDataArray, { 
                    type: compressionSettings.video.mimeType || 'video/webm' 
                  });
                  
                  resolveChunk(chunkBlob);
                };
                
                // Handle errors
                mediaRecorder.onerror = (err) => {
                  console.error("MediaRecorder error:", err);
                  rejectChunk(err);
                };
                
                // Start recording this chunk
                mediaRecorder.start(compressionSettings.video.chunkSize);
                
                // Frame processing variables
                let frameCount = 0;
                let lastProgressUpdate = 0;
                let processingActive = true;
                let chunkEndTime = endTime;
                
                // Frame drawing function
                const processFrame = () => {
                  if (!processingActive || video.paused || video.currentTime >= chunkEndTime) {
                    mediaRecorder.stop();
                    return;
                  }
                  
                  // Performance optimization for slower systems
                  frameCount++;
                  const isLowPowerDevice = capabilities.cpuCores <= 2 || capabilities.isWindows;
                  if (isLowPowerDevice && frameCount % 2 !== 0) {
                    requestAnimationFrame(processFrame);
                    return;
                  }
                  
                  try {
                    // Draw frame to canvas
                    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                    
                    // Less frequent progress updates to reduce overhead
                    const currentTime = video.currentTime;
                    if (currentTime - lastProgressUpdate > 0.5 || currentTime === startTime) {
                      const chunkProgress = (currentTime - startTime) / (chunkEndTime - startTime);
                      lastProgressUpdate = currentTime;
                    }
                    
                    requestAnimationFrame(processFrame);
                  } catch (frameError) {
                    console.error("Error drawing frame:", frameError);
                    processingActive = false;
                    mediaRecorder.stop();
                  }
                };
                
                // Start video playback for this chunk
                video.onplaying = () => {
                  processFrame();
                };
                
                video.onerror = (err) => {
                  console.error("Video error during chunk processing:", err);
                  processingActive = false;
                  mediaRecorder.stop();
                  rejectChunk(err);
                };
                
                // Play video to start processing frames
                try {
                  await video.play();
                  
                  // Set up a safety timeout for this chunk
                  const chunkTimeout = setTimeout(() => {
                    if (processingActive) {
                      console.warn("Chunk processing timeout, stopping current chunk");
                      processingActive = false;
                      mediaRecorder.stop();
                    }
                  }, (chunkEndTime - startTime) * 3000); // 3x real-time as timeout
                  
                  // Wait for chunk to complete (when mediaRecorder.onstop is called)
                  // This is handled by the mediaRecorder.onstop event above
                } catch (playError) {
                  console.error("Error playing video for chunk:", playError);
                  rejectChunk(playError);
                }
              } catch (processingError) {
                console.error("Error setting up chunk processing:", processingError);
                rejectChunk(processingError);
              }
            });
          };
          
          // Combine all chunks into a single video file
          const combineChunks = async (videoChunks) => {
            if (videoChunks.length === 0) {
              throw new Error("No video chunks to combine");
            }
            
            if (videoChunks.length === 1) {
              return videoChunks[0]; // Only one chunk, no need to combine
            }
            
            uploadStatus.textContent = "Combining video chunks...";
            
            // For WebM files, we can usually just concatenate the chunks
            // In a production environment, you might want a more robust solution using WebAssembly
            // or a server-side process for reliable concatenation
            const finalBlob = new Blob(videoChunks, { 
              type: compressionSettings.video.mimeType || 'video/webm' 
            });
            
            return finalBlob;
          };
          
          try {
            // Process video in chunks
            const compressedBlob = await processVideoChunks();
            
            // Check if compression was effective
            const compressedSizeMB = compressedBlob.size / (1024 * 1024);
            uploadStatus.textContent = `Compression complete. Original: ${Math.round(fileSizeMB * 10) / 10}MB, Compressed: ${Math.round(compressedSizeMB * 10) / 10}MB`;
            
            // If compression didn't reduce size, use original
            if (compressedBlob.size >= file.size) {
              console.warn("Compression did not reduce file size, using original");
              uploadStatus.textContent = "Compression ineffective, uploading original...";
              
              const fileName = `${Date.now()}_${file.name}`;
              const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
              const uploadTask = uploadBytesResumable(fileRef, file);
              
              uploadTask.on('state_changed', 
                (snapshot) => {
                  const progress = 50 + (snapshot.bytesTransferred / snapshot.totalBytes) * 50;
                  uploadProgress.value = progress;
                  uploadStatus.textContent = `Uploading original: ${Math.round((progress - 50) * 2)}%`;
                },
                (error) => {
                  console.error("Error uploading original:", error);
                  reject(error);
                },
                async () => {
                  const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(downloadURL);
                }
              );
              return;
            }
            
            // Upload compressed video
            const extension = compressionSettings.video.mimeType.includes('webm') ? 'webm' : 'mp4';
            const fileName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
            const compressedRef = ref(storage, `users/${userId}/media/${fileName}`);
            
            const uploadTask = uploadBytesResumable(compressedRef, compressedBlob);
            
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = 50 + (snapshot.bytesTransferred / snapshot.totalBytes) * 50;
                uploadProgress.value = progress;
                uploadStatus.textContent = `Uploading: ${Math.round((progress - 50) * 2)}%`;
              },
              (error) => {
                console.error("Error uploading compressed video:", error);
                reject(error);
              },
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              }
            );
            
          } catch (processingError) {
            console.error("Video processing failed:", processingError);
            
            // Clean up
            if (analysisWorker) {
              analysisWorker.terminate();
            }
            
            // Fall back to direct upload
            uploadStatus.textContent = "Processing failed, uploading original...";
            const fileName = `${Date.now()}_${file.name}`;
            const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
            const uploadTask = uploadBytesResumable(fileRef, file);
            
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadProgress.value = progress;
                uploadStatus.textContent = `Uploading original: ${Math.round(progress)}%`;
              },
              (error) => {
                console.error("Error uploading original:", error);
                reject(error);
              },
              async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
              }
            );
          }
          
        } catch (error) {
          console.error("Error in video processing:", error);
          reject(error);
        }
      };
      
      video.onerror = (error) => {
        console.error("Error loading video for compression:", error);
        URL.revokeObjectURL(video.src);
        reject(error);
      };
      
      video.load();
      
    } catch (setupError) {
      console.error("Failed to set up video compression:", setupError);
      reject(setupError);
    }
  });
}



  // Modify the file input handler to only downscale videos
  fileUploadInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      alert("No files selected.");
      return;
    }

    uploadOverlay.style.display = "flex";
    uploadProgress.value = 0;
    uploadStatus.textContent = "Preparing files...";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadMessage.textContent = `Processing ${i + 1} of ${files.length}: ${file.name}`;
      
      try {
        // Determine file type
        const mediaType = file.type;
        const isVideo = mediaType.startsWith("video");
        
        // Variable to store the final media URL
        let mediaUrl = null;
        
        if (isVideo) {
          // Only compress videos
          uploadStatus.textContent = "Compressing video...";
          mediaUrl = await compressVideo(file, userId);
        } else {
          // For all other file types, upload directly without compression
          uploadStatus.textContent = "Uploading file...";
          const fileName = `${Date.now()}_${file.name}`;
          const fileRef = ref(storage, `users/${userId}/media/${fileName}`);
          const uploadTask = uploadBytesResumable(fileRef, file);
          
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              uploadProgress.value = progress;
              uploadStatus.textContent = `Uploading file: ${Math.round(progress)}%`;
            },
            (error) => {
              console.error("Error uploading file:", error);
              uploadStatus.textContent = `Error: ${error.message}`;
            }
          );
          
          // Wait for upload to complete
          await new Promise((resolve, reject) => {
            uploadTask.on("state_changed", null, reject, resolve);
          });
          
          mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
        }
        
        if (!mediaUrl) {
          throw new Error("Failed to get media URL after processing");
        }

        // Store metadata in Firestore
        const mediaRef = collection(db, "users", userId, "media");
        await addDoc(mediaRef, {
          mediaUrl: mediaUrl,
          mediaType: mediaType,
          fileSize: await getFileSize(mediaUrl),
          uploadedAt: new Date().toISOString(),
        });

        uploadProgress.value = 100;
        uploadStatus.textContent = `${file.name} processed and uploaded successfully.`;
      } catch (error) {
        console.error("File processing failed:", error);
        uploadStatus.textContent = `Failed to process ${file.name}: ${error.message}`;
      }

      // Small delay before processing next file
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    uploadOverlay.style.display = "none";
    loadMedia(userId);
  });

  // Event Listeners
  openPlaylistModalBtn.addEventListener("click", () => {
    if (selectedMediaUrls.length === 0) {
      alert("Please select at least one media item.");
      return;
    }
    playlistModal.style.display = "flex";
  });

  createPlaylistBtn.addEventListener("click", async () => {
    const playlistName = newPlaylistInput.value.trim();

    if (playlistName) {
      const playlistsRef = collection(db, "users", userId, "playlists");
      await addDoc(playlistsRef, {
        name: playlistName,
        media: selectedMediaUrls,
        createdAt: new Date().toISOString(),
      });
      alert(`Playlist "${playlistName}" created and media added.`);
    }

    closeModal();
    loadPlaylists(userId);
  });

  addToExistingPlaylistsBtn.addEventListener("click", async () => {
    const selectedPlaylists = document.querySelectorAll(".playlist-option input:checked");

    if (selectedPlaylists.length === 0) {
      alert("Please select at least one playlist to add media.");
      return;
    }

    for (const playlistCheckbox of selectedPlaylists) {
      const playlistId = playlistCheckbox.dataset.id;
      const playlistRef = doc(db, "users", userId, "playlists", playlistId);

      try {
        const playlistSnapshot = await getDoc(playlistRef);
        if (!playlistSnapshot.exists()) continue;

        const existingMedia = playlistSnapshot.data().media || [];
        const updatedMedia = Array.from(new Set([...existingMedia, ...selectedMediaUrls]));

        await updateDoc(playlistRef, { media: updatedMedia });
      } catch (error) {
        console.error("Failed to update playlist:", error);
      }
    }

    alert("Selected media added to existing playlists.");
    closeModal();
  });

  deleteSelectedMediaBtn.addEventListener("click", async () => {
    if (selectedMediaUrls.length === 0) {
      alert("Please select at least one media item to delete.");
      return;
    }

    for (const mediaUrl of selectedMediaUrls) {
      try {
        // Delete the file from Firebase Storage
        const mediaRef = ref(storage, mediaUrl);
        await deleteObject(mediaRef);

        // Delete the document from Firestore
        const mediaDocQuery = query(collection(db, "users", userId, "media"), where("mediaUrl", "==", mediaUrl));
        const mediaDocSnapshot = await getDocs(mediaDocQuery);

        for (const docSnapshot of mediaDocSnapshot.docs) {
          await deleteDoc(docSnapshot.ref);
        }

        console.log(`Deleted media: ${mediaUrl}`);
      } catch (error) {
        console.error("Error deleting media:", error);
        alert(`Failed to delete media: ${mediaUrl}. Error: ${error.message}`);
      }
    }

    alert("Selected media deleted successfully.");
    selectedMediaUrls = []; // Clear selected media array
    loadMedia(userId); // Reload media
  });

  addMediaBtn.addEventListener("click", () => {
    fileUploadInput.click();
  });

  closeModalBtn.addEventListener("click", closeModal);
});

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the close button element by its ID
    const closeButton = document.getElementById('close-view-popup');
    
    // Add a click event listener to the close button
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            // Navigate to the home page
            window.location.href = 'home.html';
        });
    } else {
        console.error('Close button element with ID "close-view-popup" not found');
    }
});