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
      alert("Please log in to view and manage your playlists.");
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

  /**
   * View media in a playlist
   */
  // async function viewPlaylist(playlistId) {
  //   currentPlaylistId = playlistId;
  //   const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
  //   const playlistSnap = await getDoc(playlistRef);
  //   const playlistData = playlistSnap.data();

  //   mediaViewGrid.innerHTML = '';
  //   selectedMediaUrls = [];

  //   if (playlistData.media?.length > 0) {
  //     playlistData.media.forEach((mediaUrl) => {
  //       const mediaItem = document.createElement('div');
  //       mediaItem.classList.add('media-view-item');
  //       mediaItem.innerHTML = `
  //         <input type="checkbox" class="select-media-checkbox" data-url="${mediaUrl}" />
  //         <img src="${mediaUrl}" alt="Media in Playlist" />
          
  //       `;
  //       mediaViewGrid.appendChild(mediaItem);
  //     });

  //     document.querySelectorAll('.select-media-checkbox').forEach((checkbox) => {
  //       checkbox.addEventListener('change', (e) => {
  //         const mediaUrl = e.target.dataset.url;
  //         if (e.target.checked) {
  //           selectedMediaUrls.push(mediaUrl);
  //         } else {
  //           selectedMediaUrls = selectedMediaUrls.filter((url) => url !== mediaUrl);
  //         }
  //       });
  //     });
  //   } else {
  //     mediaViewGrid.innerHTML = '<p>No media in this playlist.</p>';
  //   }

  //   mediaViewPopup.style.display = 'block';
  // }

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
        
        // Extract and decode the filename from the URL path
        const urlParts = mediaUrl.split('%2F');
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
        
        // Determine if it's an image or video based on file extension
        const isImage = fileName.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i);
        
        // Add appropriate icon based on file type
        let fileIcon = '';
        if (isImage) {
          fileIcon = '<span class="material-icons file-icon">image</span>';
        } else if (fileName.match(/\.(mp4|webm|mov|avi|wmv)$/i)) {
          fileIcon = '<span class="material-icons file-icon">video</span>';
        } else {
          fileIcon = '<span class="material-icons file-icon">https://cdn-icons-png.flaticon.com/128/10278/10278992.png</span>';
        }
        
        mediaItem.innerHTML = `
          <div class="media-content">
            ${isImage ? 
              `<img src="${mediaUrl}" alt="Media" class="media-thumbnail" />` : 
              `<video src="${mediaUrl}" class="media-thumbnail" preload="metadata"></video>`}
          </div>
          <div class="file-item">
            ${fileIcon}
            <span class="file-name">${fileName}</span>
          </div>
          <div class="media-actions">
            <input type="checkbox" class="select-media-checkbox" data-url="${mediaUrl}" />
          </div>
        `;
        
        mediaViewGrid.appendChild(mediaItem);
      });
  
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
      alert('Please select at least one media item to delete.');
      return;
    }

    const confirmDelete = confirm('Are you sure you want to delete the selected media items?');
    if (!confirmDelete) return;

    const playlistRef = doc(db, 'users', userId, 'playlists', currentPlaylistId);

    try {
      const playlistSnap = await getDoc(playlistRef);
      const playlistData = playlistSnap.data();

      if (playlistData && playlistData.media) {
        const updatedMedia = playlistData.media.filter((url) => !selectedMediaUrls.includes(url));
        await updateDoc(playlistRef, { media: updatedMedia });

        // Update the media count in the UI
        const itemCountElement = document.querySelector(`.item-count[data-id="${currentPlaylistId}"]`);
        if (itemCountElement) {
          itemCountElement.textContent = `${updatedMedia.length} Items`;
        }

        alert('Selected media items deleted from playlist.');
        viewPlaylist(currentPlaylistId);
      }
    } catch (error) {
      console.error('Error deleting selected media:', error);
      alert('Failed to delete selected media. Please try again.');
    }
  }

  /**
   * Delete a playlist
   */
  async function deletePlaylist(playlistId, playlistName) {
    const confirmDelete = confirm(`Are you sure you want to delete the playlist "${playlistName}"?`);
    if (confirmDelete) {
      const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
      await deleteDoc(playlistRef);
      alert(`Playlist "${playlistName}" deleted.`);
      loadPlaylists(userId);
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