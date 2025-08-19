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

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const playlistGrid = document.getElementById("playlist-grid");
  const mediaViewPopup = document.getElementById("media-view-popup");
  const mediaViewGrid = document.getElementById("media-view-grid");
  const closeViewPopupBtn = document.getElementById("close-view-popup");
  const deleteSelectedMediaBtn = document.getElementById("delete-selected-media");
  const closeBtn = document.querySelector(".close-btn");

  // State variables
  let selectedMediaUrls = [];
  let currentPlaylistId = null;

  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      loadPlaylists(userId);
    } else {
      showNotification("error", "Authentication Error", "Please log in to view and manage your playlists.");
      window.location.href = "login.html";
    }
  });

  async function loadPlaylists(userId) {
    playlistGrid.innerHTML = "";
    const playlistsRef = collection(db, "users", userId, "playlists");
    const playlistsSnapshot = await getDocs(playlistsRef);

    playlistsSnapshot.forEach((doc) => {
      const playlistData = doc.data();
      const playlistBox = document.createElement("div");
      playlistBox.classList.add("playlist-box");
      playlistBox.innerHTML = `
        <h4>${playlistData.name}</h4>
        <p class="item-count" data-id="${doc.id}">${playlistData.media?.length || 0} Items</p>
        <button class="btn btn-primary view-playlist-btn" data-id="${doc.id}">
          <i class="fas fa-eye" aria-hidden="true"></i>
          
        </button>
        <button class="btn btn-danger delete-playlist-btn" data-id="${doc.id}">
          <i class="fas fa-trash" aria-hidden="true"></i>
          
        </button>
      `;
      playlistBox.querySelector(".view-playlist-btn").addEventListener("click", () => viewPlaylist(doc.id));
      playlistBox.querySelector(".delete-playlist-btn").addEventListener("click", () => deletePlaylist(doc.id, playlistData.name));
      playlistGrid.appendChild(playlistBox);
    });
  }

  async function viewPlaylist(playlistId) {
    currentPlaylistId = playlistId;
    const playlistRef = doc(db, "users", userId, "playlists", playlistId);
    const playlistSnap = await getDoc(playlistRef);
    const playlistData = playlistSnap.data();

    mediaViewGrid.innerHTML = "";
    selectedMediaUrls = [];

    if (playlistData.media?.length > 0) {
      playlistData.media.forEach((mediaUrl) => {
        const mediaItem = document.createElement("div");
        mediaItem.classList.add("media-view-item");

        const fileName = extractFileName(mediaUrl);
        const isImage = fileName.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i);
        const isVideo = fileName.match(/\.(mp4|webm|mov|avi|wmv)$/i);

        const placeholderIcon = isImage ? "image" : isVideo ? "video" : "file-pdf";
        const placeholderText = isImage ? "Image" : isVideo ? "Video" : "File";

        mediaItem.innerHTML = `
          <div class="media-content lazy-load" data-url="${mediaUrl}" data-type="${isImage ? "image" : isVideo ? "video" : "other"}">
            <div class="media-placeholder click-to-load-overlay">
              <i class="fas fa-${placeholderIcon} placeholder-icon"></i>
              <span>Click to Load</span>
            </div>
          </div>
          <div class="file-item">
            <input type="checkbox" class="select-media-checkbox" data-url="${mediaUrl}" />
            <span class="file-name" title="${fileName}">${truncateFileName(fileName)}</span>
          </div>
        `;

        mediaViewGrid.appendChild(mediaItem);
      });

      document.querySelectorAll(".select-media-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          const mediaUrl = e.target.dataset.url;
          if (e.target.checked) {
            selectedMediaUrls.push(mediaUrl);
          } else {
            selectedMediaUrls = selectedMediaUrls.filter((url) => url !== mediaUrl);
          }
        });
      });

      document.querySelectorAll(".lazy-load").forEach((container) => {
        container.addEventListener("click", () => {
          const mediaUrl = container.dataset.url;
          const type = container.dataset.type;

          if (type === "image") {
            container.innerHTML = `<img src="${mediaUrl}" alt="Media" class="media-thumbnail" />`;
          } else if (type === "video") {
            container.innerHTML = `<video src="${mediaUrl}" class="media-thumbnail" controls preload="metadata"></video>`;
          } else {
            container.innerHTML = `
              <div class="file-preview">
                <i class="fas fa-file-pdf file-preview-icon"></i>
                <span class="file-preview-text">File loaded</span>
              </div>
            `;
          }
        });
      });
    } else {
      mediaViewGrid.innerHTML = '<p>No media in this playlist.</p>';
    }

    mediaViewPopup.classList.remove("hidden");
  }

  async function deleteSelectedMedia() {
    if (selectedMediaUrls.length === 0) {
      showNotification("warning", "No Media Selected", "Please select at least one media item to delete.");
      return;
    }

    const confirmDelete = await confirm("Are you sure you want to delete the selected media items?");
    if (!confirmDelete) return;

    showLoader("Removing media from playlist...");

    const playlistRef = doc(db, "users", userId, "playlists", currentPlaylistId);

    try {
      updateLoaderText("Fetching playlist data...");
      const playlistSnap = await getDoc(playlistRef);
      const playlistData = playlistSnap.data();

      if (playlistData && playlistData.media) {
        updateLoaderText("Updating playlist...");
        const updatedMedia = playlistData.media.filter((url) => !selectedMediaUrls.includes(url));

        await updateDoc(playlistRef, { media: updatedMedia });

        updateLoaderText("Refreshing interface...");
        const itemCountElement = document.querySelector(`.item-count[data-id="${currentPlaylistId}"]`);
        if (itemCountElement) {
          itemCountElement.textContent = `${updatedMedia.length} Items`;
        }

        showNotification("success", "Media Deleted", "Selected media items deleted from playlist.");
        viewPlaylist(currentPlaylistId);
      }
    } catch (error) {
      console.error("Error deleting selected media:", error);
      showNotification("error", "Deletion Failed", "Failed to delete selected media. Please try again.");
    } finally {
      hideLoader();
    }
  }

  async function deletePlaylist(playlistId, playlistName) {
    const confirmDelete = await confirm(`Are you sure you want to delete the playlist "${playlistName}"?`);
    if (!confirmDelete) return;

    showLoader(`Deleting playlist "${playlistName}"...`);

    try {
      updateLoaderText("Removing playlist from database...");
      const playlistRef = doc(db, "users", userId, "playlists", playlistId);
      await deleteDoc(playlistRef);

      updateLoaderText("Refreshing playlists...");
      showNotification("success", "Playlist Deleted", `Playlist "${playlistName}" deleted.`);
      loadPlaylists(userId);
    } catch (error) {
      console.error("Error deleting playlist:", error);
      showNotification("error", "Deletion Failed", "Failed to delete playlist. Please try again.");
    } finally {
      hideLoader();
    }
  }

  // Event Listeners
  deleteSelectedMediaBtn.addEventListener("click", deleteSelectedMedia);

  closeViewPopupBtn.addEventListener("click", () => {
    mediaViewPopup.classList.add("hidden");
    mediaViewGrid.innerHTML = "";
  });

  mediaViewPopup.addEventListener("click", (e) => {
    if (e.target === mediaViewPopup) {
      mediaViewPopup.classList.add("hidden");
      mediaViewGrid.innerHTML = "";
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      window.location.href = "service.html";
    });
  } else {
    console.error('Close button element with class "close-btn" not found');
  }
});

function extractFileName(url) {
  try {
    const urlParts = url.split("%2F");
    return decodeURIComponent(urlParts[urlParts.length - 1].split("?")[0]);
  } catch (error) {
    return "Unknown file";
  }
}

function truncateFileName(fileName, maxLength = 20) {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.substring(fileName.lastIndexOf("."));
  const name = fileName.substring(0, fileName.lastIndexOf("."));
  const truncatedName = name.substring(0, maxLength - extension.length - 3) + "...";
  return truncatedName + extension;
}

function showNotification(type, title, message) {
  const notification = document.getElementById("notification");
  const icon = document.getElementById("notification-icon");
  const titleElement = document.getElementById("notification-title");
  const messageElement = document.getElementById("notification-message");

  icon.className = `notification-icon fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "exclamation-triangle"} ${type}`;
  titleElement.textContent = title;
  messageElement.textContent = message;

  notification.classList.remove("hidden");

  setTimeout(() => {
    notification.classList.add("hidden");
  }, 3000);
}

function closeNotification() {
  document.getElementById("notification").classList.add("hidden");
}

function confirm(message) {
  return new Promise((resolve) => {
    const confirmBox = document.getElementById("confirmation-modal");
    const messageBox = document.getElementById("modal-description");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    messageBox.textContent = message;
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

function showLoader(message = "Loading...") {
  const spinner = document.getElementById("loading-overlay");
  const textElement = document.getElementById("loading-title");

  textElement.textContent = message;
  spinner.classList.remove("hidden");
}

function hideLoader() {
  const spinner = document.getElementById("loading-overlay");
  spinner.classList.add("hidden");
}

function updateLoaderText(message) {
  const textElement = document.getElementById("loading-title");
  textElement.textContent = message;
}