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

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const mediaGrid = document.getElementById("media-grid");
  const addMediaBtn = document.getElementById("add-media-btn");
  const add4kVideoBtn = document.getElementById("add-4k-video-btn");
  const deleteSelectedMediaBtn = document.getElementById("delete-selected-media");
  const fileUploadInput = document.getElementById("file-upload");
  const fourKVideoUploadInput = document.getElementById("4k-video-upload"); // Using the existing input from HTML
  const uploadOverlay = document.getElementById("upload-overlay");
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
            ${mediaData.isDownscaled ? '<span class="downscaled-badge">1080p</span>' : ''}
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

  // Optimized video downscaling function for cross-platform compatibility
async function downscaleVideoTo1080p(videoFile) {
  return new Promise((resolve, reject) => {
    // Create a temporary URL for the video file
    const videoURL = URL.createObjectURL(videoFile);
    
    // Create video element to get video metadata
    const video = document.createElement('video');
    video.muted = false; 
    video.autoplay = false;
    
    // Create elements for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Temporary element storage
    let mediaRecorder = null;
    let processingInterval = null;
    const chunks = [];
    
    // Cleanup function to prevent memory leaks
    const cleanupResources = () => {
      if (processingInterval) {
        clearInterval(processingInterval);
        processingInterval = null;
      }
      
      if (video) {
        video.pause();
        video.src = "";
        video.load();
      }
      
      URL.revokeObjectURL(videoURL);
    };
    
    // When video metadata is loaded
    video.onloadedmetadata = () => {
      console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);
      
      // Check if video needs downscaling (higher than 1920x1080)
      const isHighResolution = video.videoWidth > 1920 || video.videoHeight > 1080;
      
      if (!isHighResolution) {
        console.log("Video is already 1080p or lower. Skipping downscaling.");
        cleanupResources();
        resolve(videoFile);
        return;
      }
      
      // Calculate target dimensions (maintaining aspect ratio)
      let targetWidth, targetHeight;
      
      if (video.videoWidth > video.videoHeight) {
        // Landscape orientation
        targetWidth = Math.min(1920, video.videoWidth);
        targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);
        if (targetHeight > 1080) {
          targetHeight = 1080;
          targetWidth = Math.round((targetHeight / video.videoHeight) * video.videoWidth);
        }
      } else {
        // Portrait or square orientation
        targetHeight = Math.min(1080, video.videoHeight);
        targetWidth = Math.round((targetHeight / video.videoHeight) * video.videoWidth);
        if (targetWidth > 1920) {
          targetWidth = 1920;
          targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);
        }
      }
      
      console.log(`Downscaling to: ${targetWidth}x${targetHeight}`);
      
      // Set canvas dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Determine if browser supports audio capture
      let canCaptureAudio = false;
      try {
        canCaptureAudio = video.captureStream && video.captureStream().getAudioTracks().length > 0;
      } catch (e) {
        console.warn("Audio capture check failed:", e);
      }
      
      // Choose the most efficient method based on browser capabilities and video duration
      const useChunkedProcessing = (video.duration > 60 || navigator.userAgent.indexOf("Windows") > -1);
      
      if (useChunkedProcessing) {
        // APPROACH 1: Chunked processing for better performance on Windows and long videos
        processVideoInChunks();
      } else {
        // APPROACH 2: Continuous stream for shorter videos (works better on Mac)
        processVideoAsStream(canCaptureAudio);
      }
    };
    
    // APPROACH 1: Process video in chunks for better Windows performance
    function processVideoInChunks() {
      console.log("Using chunked processing method");
      
      // Frame extraction settings
      const fps = 30;  // Target frames per second
      const chunkDuration = 3; // Process 3 seconds at a time
      const framesPerChunk = fps * chunkDuration;
      const timePerFrame = 1 / fps;
      
      // Processing state
      let currentChunk = 0;
      const totalChunks = Math.ceil(video.duration / chunkDuration);
      let processedFrames = 0;
      let currentChunkFrames = [];
      
      // Estimate appropriate bitrate based on resolution
      const pixelCount = targetWidth * targetHeight;
      const baseBitrate = 4000000; // 4 Mbps base
      const bitrate = Math.min(8000000, Math.max(baseBitrate, Math.round(pixelCount / (1920 * 1080) * baseBitrate * 1.5)));
      
      // Find supported mime type
      let mimeType = getSupportedMimeType();
      
      // Set up the result processor
      video.addEventListener('seeked', async function processChunk() {
        // Skip if we're done or seeking elsewhere
        if (currentChunk >= totalChunks) return;
        
        const startTime = currentChunk * chunkDuration;
        const endTime = Math.min((currentChunk + 1) * chunkDuration, video.duration);
        const chunkFrameCount = Math.ceil((endTime - startTime) * fps);
        
        console.log(`Processing chunk ${currentChunk + 1}/${totalChunks} (${startTime.toFixed(2)}s to ${endTime.toFixed(2)}s)`);
        
        // Clear frame array for this chunk
        currentChunkFrames = [];
        
        // Extract frames for this chunk
        for (let i = 0; i < chunkFrameCount; i++) {
          const frameTime = startTime + (i * timePerFrame);
          if (frameTime <= video.duration) {
            video.currentTime = frameTime;
            await new Promise(resolve => {
              const onSeeked = () => {
                // Draw frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Get the frame data
                currentChunkFrames.push(canvas.toDataURL('image/jpeg', 0.9));
                
                // Move on
                video.removeEventListener('seeked', onSeeked);
                resolve();
              };
              video.addEventListener('seeked', onSeeked, { once: true });
            });
            
            processedFrames++;
            
            // Update progress (every 30 frames)
            if (processedFrames % 30 === 0) {
              const progress = (processedFrames / (totalChunks * framesPerChunk)) * 100;
              console.log(`Progress: ${Math.min(100, progress.toFixed(1))}%`);
            }
          }
        }
        
        // When all frames in chunk are processed
        currentChunk++;
        
        // Process next chunk or finalize
        if (currentChunk < totalChunks) {
          // Process next chunk
          video.currentTime = currentChunk * chunkDuration;
        } else {
          // All chunks processed, create video from frames
          console.log("All frames extracted, creating final video...");
          await createVideoFromFrames(currentChunkFrames, mimeType, bitrate);
        }
      });
      
      // Start processing from the beginning
      video.currentTime = 0;
    }
    
    // Create a video from extracted frames
    async function createVideoFromFrames(frames, mimeType, bitrate) {
      // Create a canvas element for the final video
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = canvas.width;
      videoCanvas.height = canvas.height;
      const videoCtx = videoCanvas.getContext('2d');
      
      // Create a stream from the canvas
      const videoStream = videoCanvas.captureStream(30); // 30 fps
      
      // Try to add audio if we can extract it
      try {
        const audioTracks = video.mozCaptureStream ? 
                           video.mozCaptureStream().getAudioTracks() : 
                           (video.captureStream ? video.captureStream().getAudioTracks() : []);
        
        audioTracks.forEach(track => {
          try {
            videoStream.addTrack(track);
            console.log("Added audio track to output");
          } catch (e) {
            console.warn("Could not add audio track:", e);
          }
        });
      } catch (e) {
        console.warn("Could not capture audio:", e);
      }
      
      // Create and set up media recorder
      const recorder = new MediaRecorder(videoStream, {
        mimeType: mimeType,
        videoBitsPerSecond: bitrate
      });
      
      const videoChunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const fileExt = mimeType.includes('mp4') ? '.mp4' : '.webm';
        const outputBlob = new Blob(videoChunks, { type: mimeType.split(';')[0] });
        
        // Create file from blob
        const outputFile = new File(
          [outputBlob],
          videoFile.name.replace(/\.[^/.]+$/, "") + "_1080p" + fileExt,
          { type: mimeType.split(';')[0] }
        );
        
        cleanupResources();
        resolve(outputFile);
      };
      
      // Start recording
      recorder.start(1000);
      
      // Draw each frame at the correct time
      let frameIndex = 0;
      const frameInterval = 1000 / 30; // 30fps = ~33.33ms per frame
      
      // Function to play back frames
      const playFrames = () => {
        if (frameIndex < frames.length) {
          // Create an image from the data URL
          const img = new Image();
          img.onload = () => {
            // Draw the frame on the canvas
            videoCtx.drawImage(img, 0, 0, videoCanvas.width, videoCanvas.height);
            frameIndex++;
            
            // Progress reporting
            if (frameIndex % 30 === 0) {
              console.log(`Encoding frames: ${Math.round((frameIndex / frames.length) * 100)}%`);
            }
            
            // Schedule next frame
            setTimeout(playFrames, frameInterval);
          };
          img.src = frames[frameIndex];
        } else {
          // All frames played, stop recording
          console.log("Finalizing video...");
          setTimeout(() => {
            recorder.stop();
          }, 500); // Give some time for the last frame
        }
      };
      
      // Start playing frames
      playFrames();
    }
    
    // APPROACH 2: Process video as a continuous stream (better for Mac/shorter videos)
    function processVideoAsStream(canCaptureAudio) {
      console.log("Using continuous stream processing method");
      
      // Create a MediaStream from the canvas
      const canvasStream = canvas.captureStream();
      
      // Add audio tracks if possible
      if (canCaptureAudio) {
        try {
          const audioTracks = video.captureStream().getAudioTracks();
          audioTracks.forEach(track => canvasStream.addTrack(track));
          console.log(`Added ${audioTracks.length} audio tracks`);
        } catch (e) {
          console.warn("Could not add audio tracks:", e);
        }
      }
      
      // Find supported mime type
      let mimeType = getSupportedMimeType();
      
      // Estimate appropriate bitrate based on resolution
      const pixelCount = targetWidth * targetHeight;
      const baseBitrate = 4000000; // 4 Mbps base
      const bitrate = Math.min(8000000, Math.max(baseBitrate, Math.round(pixelCount / (1920 * 1080) * baseBitrate * 1.5)));
      
      console.log(`Using ${mimeType} with bitrate: ${bitrate/1000000}Mbps`);
      
      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: mimeType,
        videoBitsPerSecond: bitrate
      });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Determine file extension based on mime type
        const fileExt = mimeType.includes('mp4') ? '.mp4' : '.webm';
        
        // Create a new Blob from the recorded chunks
        const outputType = mimeType.split(';')[0];
        const downscaledBlob = new Blob(chunks, { type: outputType });
        
        // Create a new File object with the same name but downscaled content
        const downscaledFile = new File(
          [downscaledBlob],
          videoFile.name.replace(/\.[^/.]+$/, "") + "_1080p" + fileExt,
          { type: outputType }
        );
        
        cleanupResources();
        resolve(downscaledFile);
      };
      
      // Process frames at a consistent rate rather than relying on requestAnimationFrame
      processingInterval = setInterval(() => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }, 1000 / 30); // Target 30fps
      
      // Start recording
      mediaRecorder.start(1000); // Capture in 1-second chunks
      
      // Play the video at normal speed
      video.currentTime = 0;
      video.play().catch(err => {
        console.error("Error playing video for processing:", err);
        cleanupResources();
        reject(err);
      });
      
      // Set a timeout to stop recording after video duration (plus a buffer)
      const processingDuration = (video.duration * 1000) + 2000; // 2 second buffer
      
      // Report progress periodically
      const progressInterval = setInterval(() => {
        if (video.currentTime > 0) {
          const progress = (video.currentTime / video.duration) * 100;
          console.log(`Processing: ${Math.min(100, progress.toFixed(1))}%`);
        }
      }, 3000);
      
      // Set timeout to stop processing
      setTimeout(() => {
        clearInterval(progressInterval);
        clearInterval(processingInterval);
        video.pause();
        mediaRecorder.stop();
        console.log("Processing complete");
      }, processingDuration);
    }
    
    // Get supported mime type based on browser capabilities
    function getSupportedMimeType() {
      // In order of preference
      const mimeOptions = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
        '' // fallback to browser default
      ];
      
      for (const mime of mimeOptions) {
        if (!mime || MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      }
      
      return ''; // Use browser default if none supported
    }
    
    // Handle errors
    video.onerror = (err) => {
      console.error("Error loading video for downscaling:", err);
      cleanupResources();
      reject(err);
    };
    
    // Set video source and load metadata
    video.src = videoURL;
    video.preload = "metadata";
  });
}

  // Upload media to Firebase
  async function uploadMediaToFirebase(file, isDownscaled = false) {
    try {
      uploadOverlay.style.display = "flex";
      
      const storageRef = ref(storage, `users/${userId}/media/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            // Show upload progress if needed
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadOverlay.textContent = `Uploading: ${Math.round(progress)}%`;
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const mediaType = file.type;

            const mediaRef = collection(db, "users", userId, "media");
            await addDoc(mediaRef, {
              mediaUrl: downloadURL,
              mediaType: mediaType,
              uploadedAt: new Date().toISOString(),
              isDownscaled: isDownscaled
            });

            resolve();
          }
        );
      });
      
      return true;
    } catch (error) {
      console.error("File upload failed:", error);
      alert(`Failed to upload ${file.name}: ${error.message}`);
      return false;
    }
  }

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

    const confirmDelete = confirm("Are you sure you want to delete the selected media?");
    if (!confirmDelete) return;

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

  // Add event listener for the 4K video button
  add4kVideoBtn.addEventListener("click", () => {
    fourKVideoUploadInput.click();
  });

  fileUploadInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      alert("No files selected.");
      return;
    }

    uploadOverlay.style.display = "flex";

    for (const file of files) {
      try {
        await uploadMediaToFirebase(file);
      } catch (error) {
        console.error("File upload failed:", error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    uploadOverlay.style.display = "none";
    uploadOverlay.textContent = "Uploading Media..."; // Reset the text
    loadMedia(userId);
    // Reset the file input
    fileUploadInput.value = "";
  });

  // Handle 4K video uploads
  fourKVideoUploadInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      alert("No video files selected.");
      return;
    }

    uploadOverlay.style.display = "flex";
    uploadOverlay.textContent = "Processing and Downscaling Video...";

    for (const file of files) {
      try {
        // Check if file is a video
        if (!file.type.startsWith('video/')) {
          alert(`${file.name} is not a video file. Please select video files only.`);
          continue;
        }

        // Log original video dimensions for debugging
        const videoURL = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.muted = true;
        
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            console.log(`Original video dimensions: ${video.videoWidth}x${video.videoHeight}`);
            URL.revokeObjectURL(videoURL);
            resolve();
          };
          video.src = videoURL;
        });

        // Downscale the video
        const downscaledFile = await downscaleVideoTo1080p(file);
        
        // Update overlay text
        uploadOverlay.textContent = `Uploading Downscaled Video: ${downscaledFile.name}`;
        
        // Upload the downscaled video
        await uploadMediaToFirebase(downscaledFile, true);
        
      } catch (error) {
        console.error("Video processing failed:", error);
        alert(`Failed to process and upload ${file.name}: ${error.message}`);
      }
    }

    uploadOverlay.style.display = "none";
    uploadOverlay.textContent = "Uploading Media..."; // Reset the text
    loadMedia(userId);
    // Reset the file input
    fourKVideoUploadInput.value = "";
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

document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
  if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0))) {
    return false;
  }
};