// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
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
const auth = getAuth();

let userId = null;

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const playlistGrid = document.getElementById('playlist-grid');
  const mediaViewPopup = document.getElementById('media-view-popup');
  const mediaViewGrid = document.getElementById('media-view-grid');
  const closeViewPopupBtn = document.getElementById('close-view-popup');
  const deleteSelectedMediaBtn = document.getElementById('delete-selected-media');

  // State variables
  let selectedMediaUrls = [];
  let currentPlaylistId = null;

  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      loadPlaylists(userId);
    } else {
      showAlert("Please log in to view and manage your playlists.");
      window.location.href = 'login.html';
    }
  });

  /**
   * Load all playlists for a user
   */
  async function loadPlaylists(userId) {
    playlistGrid.innerHTML = '';
    const playlistsRef = collection(db, 'users', userId, 'playlists');
    const playlistsSnapshot = await getDocs(playlistsRef);

    playlistsSnapshot.forEach((doc) => {
      const playlistData = doc.data();
      const playlistBox = document.createElement('div');
      playlistBox.classList.add('playlist-box');
      playlistBox.innerHTML = `
        <h4>${playlistData.name}</h4>
        <p class="item-count" data-id="${doc.id}">${playlistData.media?.length || 0} Items</p>
        <button class="view-playlist-btn" data-id="${doc.id}">View</button>
        <button class="delete-playlist-btn" data-id="${doc.id}">Delete</button>
      `;
      playlistBox.querySelector('.view-playlist-btn').addEventListener('click', () => viewPlaylist(doc.id));
      playlistBox.querySelector('.delete-playlist-btn').addEventListener('click', () => deletePlaylist(doc.id, playlistData.name));
      playlistGrid.appendChild(playlistBox);
    });
  }
 
  async function viewPlaylist(playlistId) {
    currentPlaylistId = playlistId;
    const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
    const playlistSnap = await getDoc(playlistRef);
    const playlistData = playlistSnap.data();
  
    mediaViewGrid.innerHTML = '';
    selectedMediaUrls = [];
  
    if (playlistData.media?.length > 0) {
      playlistData.media.forEach((mediaUrl) => {
        const mediaItem = document.createElement('div');
        mediaItem.classList.add('media-view-item');
  
        const urlParts = mediaUrl.split('%2F');
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
  
        const isImage = fileName.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i);
        const isVideo = fileName.match(/\.(mp4|webm|mov|avi|wmv)$/i);
  
        let fileIcon = '';
        if (isImage) {
          fileIcon = '<span class="material-icons file-icon">image</span>';
        } else if (isVideo) {
          fileIcon = '<span class="material-icons file-icon">video_library</span>';
        } else {
          fileIcon = '<img src="https://cdn-icons-png.flaticon.com/128/10278/10278992.png" class="file-icon" />';
        }
  
        // Add placeholder with a click-to-load handler
        mediaItem.innerHTML = `
          <div class="media-content lazy-load" data-url="${mediaUrl}" data-type="${isImage ? 'image' : isVideo ? 'video' : 'other'}">
            <div class="media-placeholder">Click to Load</div>
          </div>
          <div class="file-item">
             <input type="checkbox" class="select-media-checkbox" data-url="${mediaUrl}" />
            <span class="file-name">${fileName}</span>
          </div>
          
        `;
  
        mediaViewGrid.appendChild(mediaItem);
      });
  
      // Handle checkbox selection
      document.querySelectorAll('.select-media-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
          const mediaUrl = e.target.dataset.url;
          if (e.target.checked) {
            selectedMediaUrls.push(mediaUrl);
          } else {
            selectedMediaUrls = selectedMediaUrls.filter((url) => url !== mediaUrl);
          }
        });
      });
  
      // Handle click-to-load
      document.querySelectorAll('.lazy-load').forEach((container) => {
        container.addEventListener('click', () => {
          const mediaUrl = container.dataset.url;
          const type = container.dataset.type;
  
          if (type === 'image') {
            container.innerHTML = `<img src="${mediaUrl}" alt="Media" class="media-thumbnail" />`;
          } else if (type === 'video') {
            container.innerHTML = `<video src="${mediaUrl}" class="media-thumbnail" controls preload="metadata"></video>`;
          } else {
            container.innerHTML = `<p>Unsupported media type.</p>`;
          }
        });
      });
  
    } else {
      mediaViewGrid.innerHTML = '<p>No media in this playlist.</p>';
    }
  
    mediaViewPopup.style.display = 'block';
  }
  
  /**
   * Delete selected media from playlist
   */
  async function deleteSelectedMedia() {
    if (selectedMediaUrls.length === 0) {
      showAlert('Please select at least one media item to delete.');
      return;
    }

    const confirmDelete = await confirm('Are you sure you want to delete the selected media items?');
    if (!confirmDelete) return;

    // Show loading spinner
    showLoader("Removing media from playlist...");

    const playlistRef = doc(db, 'users', userId, 'playlists', currentPlaylistId);

    try {
      updateLoaderText("Fetching playlist data...");
      const playlistSnap = await getDoc(playlistRef);
      const playlistData = playlistSnap.data();

      if (playlistData && playlistData.media) {
        updateLoaderText("Updating playlist...");
        const updatedMedia = playlistData.media.filter((url) => !selectedMediaUrls.includes(url));
        
        await updateDoc(playlistRef, { media: updatedMedia });

        updateLoaderText("Refreshing interface...");
        
        // Update the media count in the UI
        const itemCountElement = document.querySelector(`.item-count[data-id="${currentPlaylistId}"]`);
        if (itemCountElement) {
          itemCountElement.textContent = `${updatedMedia.length} Items`;
        }

        showAlert('Selected media items deleted from playlist.');
        viewPlaylist(currentPlaylistId);
      }
    } catch (error) {
      console.error('Error deleting selected media:', error);
      showAlert('Failed to delete selected media. Please try again.');
    } finally {
      // Always hide the loader
      hideLoader();
    }
  }

  /**
   * Delete a playlist
   */
  async function deletePlaylist(playlistId, playlistName) {
    const confirmDelete = await confirm(`Are you sure you want to delete the playlist "${playlistName}"?`);
    if (!confirmDelete) return;

    // Show loading spinner
    showLoader(`Deleting playlist "${playlistName}"...`);

    try {
      updateLoaderText("Removing playlist from database...");
      const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
      await deleteDoc(playlistRef);
      
      updateLoaderText("Refreshing playlists...");
      showAlert(`Playlist "${playlistName}" deleted.`);
      loadPlaylists(userId);
      
    } catch (error) {
      console.error('Error deleting playlist:', error);
      showAlert('Failed to delete playlist. Please try again.');
    } finally {
      // Always hide the loader
      hideLoader();
    }
  }

  // Event Listeners
  deleteSelectedMediaBtn.addEventListener('click', deleteSelectedMedia);

  closeViewPopupBtn.addEventListener('click', () => {
    mediaViewPopup.style.display = 'none';
    mediaViewGrid.innerHTML = ''; // Clear the media view grid
  });

  mediaViewPopup.addEventListener('click', (e) => {
    if (e.target === mediaViewPopup) {
      mediaViewPopup.style.display = 'none';
      mediaViewGrid.innerHTML = ''; // Reset media view grid
    }
  });
});

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the close button element by its ID
    const closeButton = document.getElementById('close-view-popupp');
    
    // Add a click event listener to the close button
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            // Navigate to the home page
            window.location.href = 'service.html';
            
            // Alternative approaches:
            // window.location.replace('/'); // Replaces current history entry
            // window.location.assign('/');  // Same as window.location.href = '/'
        });
    } else {
        console.error('Close button element with ID "close-view-popup" not found');
    }
});

// Disable right click in the page
// document.addEventListener('contextmenu', event => event.preventDefault());
// document.onkeydown = function (e) {
//   if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0))) {
//     return false;
//   }
// };

function showAlert(message) {
  const alertBox = document.getElementById("custom-alert");
  const alertMessage = document.getElementById("alert-message");
  alertMessage.textContent = message;
  alertBox.classList.remove("hidden");

  // Auto-close after 3 seconds
  setTimeout(() => {
    alertBox.classList.add("hidden");
  }, 3000);
}

function closeAlert() {
  document.getElementById("custom-alert").classList.add("hidden");

}

function confirm(message) {
  return new Promise((resolve) => {  // ← This return was missing!
    const confirmBox = document.getElementById("custom-confirm");
    const messageBox = document.getElementById("confirm-message");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    // Set message
    messageBox.textContent = message;

    // Show the confirm box
    confirmBox.classList.remove("hidden");

    let resolved = false;

    const handleResponse = (response) => {
      if (resolved) return;
      resolved = true;

      confirmBox.classList.add("hidden");
      cleanup();
      resolve(response);
    };

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        handleResponse(false);
      } else if (e.key === "Enter") {
        handleResponse(true);
      }
    };

    const cleanup = () => {
      document.removeEventListener("keydown", keyHandler);
    };

    yesBtn.addEventListener("click", () => handleResponse(true), { once: true });
    noBtn.addEventListener("click", () => handleResponse(false), { once: true });
    document.addEventListener("keydown", keyHandler);
  });
}

// Loading Spinner Utility
const LoadingSpinner = {
  element: null,
  textElement: null,

  init() {
    this.element = document.getElementById("loading-spinner");
    this.textElement = document.getElementById("loading-text");
  },

  show(message = "Loading...") {
    if (!this.element) this.init();
    this.textElement.textContent = message;
    this.element.classList.remove("hidden");
  },

  hide() {
    if (!this.element) this.init();
    this.element.classList.add("hidden");
  },

  updateText(message) {
    if (!this.textElement) this.init();
    this.textElement.textContent = message;
  }
};

// Alternative: Simple functions
function showLoader(message = "Loading...") {
  const spinner = document.getElementById("loading-spinner");
  const textElement = document.getElementById("loading-text");

  textElement.textContent = message;
  spinner.classList.remove("hidden");
}

function hideLoader() {
  const spinner = document.getElementById("loading-spinner");
  spinner.classList.add("hidden");
}

function updateLoaderText(message) {
  const textElement = document.getElementById("loading-text");
  textElement.textContent = message;
}