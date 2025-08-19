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

let currentPage = 1;
const itemsPerPage = 8;
let filteredMediaItems = [];
const paginationInfo = document.getElementById("page-info");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const mediaGrid = document.getElementById("media-grid");
  const addMediaBtn = document.getElementById("add-media-btn");
  const deleteSelectedMediaBtn = document.getElementById("delete-selected-media");
  const fileUploadInput = document.getElementById("file-upload");
  const uploadOverlay = document.getElementById("loading-overlay");
  const openPlaylistModalBtn = document.getElementById("open-playlist-modal");
  const playlistModal = document.getElementById("playlist-modal");
  const playlistOptions = document.getElementById("playlist-options");
  const newPlaylistInput = document.getElementById("new-playlist-name");
  const createPlaylistBtn = document.getElementById("create-playlist-btn");
  const addToExistingPlaylistsBtn = document.getElementById("add-to-existing-playlists-btn");
  const closeModalBtn = document.getElementById("modal-cancel");
  const uploadProgressFill = document.getElementById("upload-progress-fill");
  const uploadPercentage = document.getElementById("upload-percentage");
  const uploadMessage = document.getElementById("loading-title");

  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      loadMedia(userId);
      loadPlaylists(userId);
    } else {
      showNotification("error", "Authentication Error", "Please log in to manage your media.");
      window.location.href = "login.html";
    }
  });

  async function loadMedia(userId) {
    document.getElementById("filter-button").dispatchEvent(new Event("change"));

    mediaGrid.innerHTML = "";
    const mediaRef = collection(db, "users", userId, "media");
    const mediaSnapshot = await getDocs(mediaRef);

    // Setup Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const mediaItem = entry.target;
            const shouldAutoLoad = mediaItem.dataset.autoLoad === "true";

            if (shouldAutoLoad) {
              loadActualMedia(mediaItem);
            } else {
              showClickToLoad(mediaItem);
            }
            observer.unobserve(mediaItem);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    mediaSnapshot.forEach(async (doc) => {
      const mediaData = doc.data();
      const mediaItem = document.createElement("div");
      mediaItem.classList.add("media-item");

      mediaItem.dataset.mediaUrl = mediaData.mediaUrl;
      mediaItem.dataset.mediaType = mediaData.mediaType;
      mediaItem.dataset.docId = doc.id;
      mediaItem.dataset.autoLoad = "false";

      const fileName = mediaData.fileName || extractFileName(mediaData.mediaUrl);
      const fileType = mediaData.mediaType || "";
      const fileSize = mediaData.fileSize;
      const thumbnailUrl = mediaData.thumbnailUrl;

      const isImage = fileType.startsWith("image");
      const isVideo = fileType.startsWith("video") || fileName.toLowerCase().endsWith(".mp4") || fileName.toLowerCase().endsWith(".webm");

      let mediaElementHtml = "";

      if (thumbnailUrl) {
        mediaElementHtml = `
          <div class="media-placeholder" data-loaded="false">
            <img src="${thumbnailUrl}" alt="Thumbnail" class="media-thumbnail"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="placeholder-icon-container" style="display: none;">
              <i class="fas fa-${isImage ? "image" : isVideo ? "video" : "file-pdf"} placeholder-icon"></i>
              <span class="placeholder-text">Preview</span>
            </div>
          </div>
        `;
      } else {
        const placeholderIcon = isImage ? "image" : isVideo ? "video" : "file-pdf";
        mediaElementHtml = `
          <div class="media-placeholder" data-loaded="false">
            <div class="placeholder-icon-container">
              <i class="fas fa-${placeholderIcon} placeholder-icon"></i>
              <span class="placeholder-text">${isImage ? "Image" : isVideo ? "Video" : "File"}</span>
            </div>
          </div>
        `;
      }

      mediaItem.innerHTML = `
        ${mediaElementHtml}
        <div class="file-item">
          <div class="media-actions">
            <input type="checkbox" class="select-media-checkbox" data-id="${doc.id}" data-url="${mediaData.mediaUrl}" />
          </div>
          <span class="file-name" title="${fileName}">${truncateFileName(fileName)}</span>
          ${fileSize ? `<span class="file-size">${formatFileSize(fileSize)}</span>` : ""}
        </div>
      `;

      const placeholder = mediaItem.querySelector(".media-placeholder");

      placeholder.addEventListener("click", () => {
        if (placeholder.dataset.loaded === "false") {
          loadActualMedia(mediaItem);
        }
      });

      mediaItem.querySelector(".select-media-checkbox").addEventListener("change", (e) => {
        toggleMediaSelection(mediaData.mediaUrl, e.target.checked);
      });

      mediaGrid.appendChild(mediaItem);
      observer.observe(mediaItem);
    });

    onMediaLoaded();
  }

  function showClickToLoad(mediaItem) {
    const placeholder = mediaItem.querySelector(".media-placeholder");
    if (placeholder && placeholder.dataset.loaded === "false") {
      const clickToLoad = document.createElement("div");
      clickToLoad.className = "click-to-load-overlay";
      clickToLoad.innerHTML = `<span>Click to load</span>`;
      clickToLoad.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--text-sm);
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-fast);
      `;
      clickToLoad.addEventListener("mouseover", () => {
        clickToLoad.style.background = "rgba(0, 0, 0, 0.8)";
      });
      clickToLoad.addEventListener("mouseout", () => {
        clickToLoad.style.background = "rgba(0, 0, 0, 0.7)";
      });
      clickToLoad.addEventListener("click", () => {
        loadActualMedia(mediaItem);
      });

      placeholder.appendChild(clickToLoad);
    }
  }

  async function loadActualMedia(mediaItem) {
    const mediaUrl = mediaItem.dataset.mediaUrl;
    const mediaType = mediaItem.dataset.mediaType;
    const docId = mediaItem.dataset.docId;
    const placeholder = mediaItem.querySelector(".media-placeholder");

    if (!placeholder || placeholder.dataset.loaded === "true") {
      return;
    }

    placeholder.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <span class="loading-text">Loading...</span>
      </div>
    `;

    try {
      const storageRefObj = ref(storage, mediaUrl);
      const downloadURL = await getDownloadURL(storageRefObj);

      const fileName = extractFileName(mediaUrl);
      const isImage = mediaType && mediaType.startsWith("image");
      const isVideo = fileName.toLowerCase().endsWith(".mp4") || fileName.toLowerCase().endsWith(".webm");

      let mediaElementHtml = "";

      if (isImage) {
        mediaElementHtml = `
          <img src="${downloadURL}" alt="Media" class="media-thumbnail loaded-media"
               onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iMjAiIHk9IjI0IiBmb250LXNpemU9IjEyIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FcnJvcjwvdGV4dD48L3N2Zz4=';" />
        `;
      } else if (isVideo) {
        const videoId = `video_${docId}`;
        mediaElementHtml = `
          <video id="${videoId}" class="media-thumbnail loaded-media" preload="metadata" muted controls>
            <source src="${downloadURL}" type="${mediaType}">
            Your browser does not support the video tag.
          </video>
        `;
      } else {
        mediaElementHtml = `
          <div class="file-preview loaded-media">
            <i class="fas fa-file-pdf file-preview-icon"></i>
            <span class="file-preview-text">File loaded</span>
          </div>
        `;
      }

      placeholder.innerHTML = mediaElementHtml;
      placeholder.dataset.loaded = "true";
    } catch (error) {
      console.error("Error loading media:", error);

      if (error.code === "storage/object-not-found") {
        try {
          const docRef = doc(db, "users", userId, "media", docId);
          await deleteDoc(docRef);
          mediaItem.remove();
        } catch (deleteError) {
          console.error("Error deleting document:", deleteError);
        }
      } else {
        placeholder.innerHTML = `
          <div class="file-preview">
            <i class="fas fa-exclamation-circle file-preview-icon" style="color: var(--error);"></i>
            <span class="file-preview-text">Failed to load</span>
          </div>
        `;
      }
    }
  }

  // Utility functions
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

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    playlistModal.classList.add("hidden");
    newPlaylistInput.value = "";
    selectedMediaUrls = [];
  }

  // Event Listeners
  openPlaylistModalBtn.addEventListener("click", () => {
    if (selectedMediaUrls.length === 0) {
      showNotification("warning", "No Media Selected", "Please select at least one media item.");
      return;
    }
    playlistModal.classList.remove("hidden");
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
      showNotification("success", "Playlist Created", `Playlist "${playlistName}" created and media added.`);
      document.querySelectorAll(".select-media-checkbox").forEach((checkbox) => {
        checkbox.checked = false;
      });
      selectedMediaUrls = [];
      closeModal();
      loadPlaylists(userId);
    } else {
      showNotification("error", "Invalid Input", "Please enter a playlist name.");
    }
  });

  addToExistingPlaylistsBtn.addEventListener("click", async () => {
    const selectedPlaylists = document.querySelectorAll(".playlist-option input:checked");

    if (selectedPlaylists.length === 0) {
      showNotification("warning", "No Playlists Selected", "Please select at least one playlist to add media.");
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
        showNotification("error", "Update Failed", `Failed to update playlist: ${error.message}`);
      }
    }

    showNotification("success", "Media Added", "Selected media added to existing playlists.");
    closeModal();
  });

  deleteSelectedMediaBtn.addEventListener("click", async () => {
    if (selectedMediaUrls.length === 0) {
      showNotification("warning", "No Media Selected", "Please select at least one media item to delete.");
      return;
    }

    const userConfirmed = await confirm("Are you sure you want to delete the selected media? This will also remove them from playlists.");
    if (!userConfirmed) {
      return;
    }

    showLoader("Deleting media...");

    try {
      let deletedCount = 0;

      for (const mediaUrl of selectedMediaUrls) {
        updateLoaderText(`Deleting media... (${deletedCount + 1}/${selectedMediaUrls.length})`);

        try {
          const mediaRef = ref(storage, mediaUrl);
          await deleteObject(mediaRef);

          const mediaDocQuery = query(collection(db, "users", userId, "media"), where("mediaUrl", "==", mediaUrl));
          const mediaDocSnapshot = await getDocs(mediaDocQuery);

          for (const docSnapshot of mediaDocSnapshot.docs) {
            await deleteDoc(docSnapshot.ref);
          }

          const playlistsRef = collection(db, "users", userId, "playlists");
          const playlistsSnapshot = await getDocs(playlistsRef);

          for (const playlistDoc of playlistsSnapshot.docs) {
            const playlistData = playlistDoc.data();
            const currentMedia = playlistData.media || [];

            if (currentMedia.includes(mediaUrl)) {
              const updatedMedia = currentMedia.filter((url) => url !== mediaUrl);
              await updateDoc(doc(playlistsRef, playlistDoc.id), { media: updatedMedia });
            }
          }

          deletedCount++;
        } catch (error) {
          console.error("Error deleting media:", error);
          showNotification("error", "Deletion Failed", `Failed to delete media: ${mediaUrl}. Error: ${error.message}`);
        }
      }

      updateLoaderText("Finalizing deletion...");
      showNotification("success", "Media Deleted", "Selected media deleted successfully.");
      selectedMediaUrls = [];
      loadMedia(userId);
    } catch (error) {
      console.error("Unexpected error during deletion:", error);
      showNotification("error", "Deletion Error", "An unexpected error occurred during deletion.");
    } finally {
      hideLoader();
    }
  });

  addMediaBtn.addEventListener("click", () => {
    fileUploadInput.click();
  });

  fileUploadInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      showNotification("error", "No Files Selected", "Please select at least one file to upload.");
      return;
    }

    const allowedTypes = ["image/", "video/", "application/pdf"];
    const maxFileSize = 150 * 1024 * 1024;

    for (let file of files) {
      const isValidType = allowedTypes.some((type) => file.type.startsWith(type));
      const isValidSize = file.size <= maxFileSize;

      if (!isValidType) {
        showNotification("error", "Invalid File Type", "Only images, videos, and PDFs are allowed.");
        return;
      }

      if (!isValidSize) {
        showNotification("error", "File Too Large", "File exceeds 150MB limit.");
        return;
      }
    }

    uploadOverlay.classList.remove("hidden");
    uploadProgressFill.style.width = "0%";
    uploadPercentage.textContent = "0%";

    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      uploadMessage.textContent = `Uploading Media... (${i + 1} of ${totalFiles})`;

      try {
        const storageRef = ref(storage, `users/${userId}/media/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              uploadProgressFill.style.width = `${progress.toFixed(0)}%`;
              uploadPercentage.textContent = `${progress.toFixed(0)}%`;
            },
            (error) => {
              console.error("Upload failed:", error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const mediaType = file.type;

              const mediaRef = collection(db, "users", userId, "media");
              await addDoc(mediaRef, {
                mediaUrl: downloadURL,
                mediaType: mediaType,
                uploadedAt: new Date().toISOString(),
              });

              resolve();
            }
          );
        });
      } catch (error) {
        console.error("File upload failed:", error);
        showNotification("error", "Upload Failed", `Failed to upload ${file.name}: ${error.message}`);
      }
    }

    uploadOverlay.classList.add("hidden");
    showNotification("success", "Upload Complete", "All files uploaded successfully.");
    loadMedia(userId);
  });

  closeModalBtn.addEventListener("click", closeModal);

  const closeButton = document.querySelector(".close-btn");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      window.location.href = "service.html";
    });
  } else {
    console.error('Close button element with class "close-btn" not found');
  }
});

function paginateMediaGrid() {
  const totalItems = filteredMediaItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  document.querySelectorAll(".media-item").forEach((item) => {
    item.style.display = "none";
  });

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;

  filteredMediaItems.slice(start, end).forEach((item) => {
    item.style.display = "block";
  });

  paginationInfo.textContent = `Page ${totalPages === 0 ? 0 : currentPage} of ${totalPages}`;

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    paginateMediaGrid();
  }
});

nextBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredMediaItems.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    paginateMediaGrid();
  }
});

function onMediaLoaded() {
  const allItems = Array.from(document.querySelectorAll(".media-item"));
  filteredMediaItems = allItems;
  currentPage = 1;
  paginateMediaGrid();
}

document.getElementById("filter-button").addEventListener("change", function () {
  const selectedType = this.value.toLowerCase();
  const allItems = Array.from(document.querySelectorAll(".media-item"));

  filteredMediaItems = allItems.filter((item) => {
    const mediaType = (item.dataset.mediaType || "").toLowerCase();
    const typeCategory = mediaType.split("/")[0];

    return (
      selectedType === "all" ||
      (selectedType === "image" && typeCategory === "image") ||
      (selectedType === "video" && typeCategory === "video") ||
      (selectedType === "pdf" && mediaType === "application/pdf")
    );
  });

  currentPage = 1;
  paginateMediaGrid();
});

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

// Loading Spinner Utility
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