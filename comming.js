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

  // Downscale video to 1080p while preserving audio
async function downscaleVideoTo1080p(videoFile) {
  return new Promise((resolve, reject) => {
    // Create a temporary URL for the video file
    const videoURL = URL.createObjectURL(videoFile);
    
    // Create video element to get video metadata
    const video = document.createElement('video');
    video.muted = false; // Not muting to ensure we can access the audio tracks
    video.autoplay = false;
    
    // When video metadata is loaded
    video.onloadedmetadata = () => {
      // Check if video needs downscaling (higher than 1920x1080)
      const isHighResolution = video.videoWidth > 1920 || video.videoHeight > 1080;
      
      if (!isHighResolution) {
        console.log("Video is already 1080p or lower. Skipping downscaling.");
        URL.revokeObjectURL(videoURL);
        resolve(videoFile); // Return original file if it's already 1080p or lower
        return;
      }
      
      console.log(`Downscaling video from ${video.videoWidth}x${video.videoHeight} to 1080p`);
      
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set target dimensions (maintaining aspect ratio)
      let targetWidth, targetHeight;
      
      if (video.videoWidth > video.videoHeight) {
        // Landscape orientation
        targetWidth = Math.min(1920, video.videoWidth);
        targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);
        // Ensure height doesn't exceed 1080
        if (targetHeight > 1080) {
          targetHeight = 1080;
          targetWidth = Math.round((targetHeight / video.videoHeight) * video.videoWidth);
        }
      } else {
        // Portrait or square orientation
        targetHeight = Math.min(1080, video.videoHeight);
        targetWidth = Math.round((targetHeight / video.videoHeight) * video.videoWidth);
        // Ensure width doesn't exceed 1920
        if (targetWidth > 1920) {
          targetWidth = 1920;
          targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);
        }
      }
      
      // Set canvas dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Create a MediaStream from the video element to capture its audio
      let audioTracks = [];
      
      // Function to check if video has audio
      const hasAudio = () => {
        try {
          return video.captureStream && video.captureStream().getAudioTracks().length > 0;
        } catch (e) {
          console.warn("Could not determine if video has audio tracks:", e);
          return false;
        }
      };
      
      // Try to get audio tracks if the video has them
      if (hasAudio()) {
        try {
          audioTracks = video.captureStream().getAudioTracks();
          console.log(`Found ${audioTracks.length} audio tracks in the video`);
        } catch (e) {
          console.warn("Error capturing audio tracks:", e);
        }
      }
      
      // Create a MediaStream with both the canvas stream for video and original audio tracks
      const canvasStream = canvas.captureStream();
      audioTracks.forEach(track => canvasStream.addTrack(track));
      
      // Check for supported codecs
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.warn("WebM format not supported, trying MP4");
            mimeType = 'video/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = '';
            }
          }
        }
      }
      
      // Create MediaRecorder with appropriate settings
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 8000000 // 8 Mbps for good quality
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Determine the output type based on mime type
        const outputType = mimeType ? mimeType.split(';')[0] : 'video/webm';
        const fileExtension = outputType.includes('mp4') ? '.mp4' : '.webm';
        
        // Create a new Blob from the recorded chunks
        const downscaledBlob = new Blob(chunks, { type: outputType });
        
        // Create a new File object with the same name but downscaled content
        const downscaledFile = new File(
          [downscaledBlob],
          videoFile.name.replace(/\.[^/.]+$/, "") + "_1080p" + fileExtension,
          { type: outputType }
        );
        
        URL.revokeObjectURL(videoURL);
        resolve(downscaledFile);
      };
      
      // Log progress for debugging
      let lastTime = 0;
      video.ontimeupdate = () => {
        if (video.currentTime - lastTime > 5) { // Log every 5 seconds
          console.log(`Processing video: ${Math.round(video.currentTime)}/${Math.round(video.duration)} seconds`);
          lastTime = video.currentTime;
        }
      };
      
      // Start recording
      mediaRecorder.start(1000); // Capture in 1-second chunks
      
      // Process video frames
      video.onplay = () => {
        console.log("Video playback started for processing");
        const processFrame = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(processFrame);
          }
        };
        processFrame();
      };
      
      // Start playing the video at a reasonable speed
      // Using 1x speed is safer for audio sync, though slower
      video.playbackRate = 1.0;
      
      video.play().catch(err => {
        console.error("Error playing video for processing:", err);
        URL.revokeObjectURL(videoURL);
        reject(err);
      });
      
      // Set a timeout to stop recording after video duration
      // Add a small buffer to ensure we capture the whole video
      setTimeout(() => {
        console.log("Processing complete, stopping recorder");
        video.pause();
        mediaRecorder.stop();
      }, (video.duration * 1000) / video.playbackRate + 2000);
    };
    
    // Handle errors
    video.onerror = (err) => {
      console.error("Error loading video for downscaling:", err);
      URL.revokeObjectURL(videoURL);
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