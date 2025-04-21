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
  const deleteSelectedMediaBtn = document.getElementById("delete-selected-media");
  const fileUploadInput = document.getElementById("file-upload");
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

  // Load media for user
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

  //       const isImage = mediaData.mediaType && mediaData.mediaType.startsWith("image");
  //       mediaItem.innerHTML = `
  //         ${isImage ? `<img src="${mediaData.mediaUrl}" alt="Media" class="media-thumbnail" />` : 
  //           `<video src="${mediaData.mediaUrl}" class="media-thumbnail" controls></video>`}
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

  fileUploadInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      alert("No files selected.");
      return;
    }

    uploadOverlay.style.display = "flex";

    for (const file of files) {
      try {
        const storageRef = ref(storage, `users/${userId}/media/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null,
            (error) => reject(error),
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
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    uploadOverlay.style.display = "none";
    loadMedia(userId);
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
            
            // Alternative approaches:
            // window.location.replace('/'); // Replaces current history entry
            // window.location.assign('/');  // Same as window.location.href = '/'
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