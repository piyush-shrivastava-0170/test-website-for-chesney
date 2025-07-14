import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

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

let adminUID = null;

// Authentication Check
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminUID = user.uid;
    loadDevices();
    loadGroups();
    // setupEventListeners();
    // loadPlaylists();
  } else {
    showAlert("Please log in to access this screen.");
    window.location.href = "login.html";
  }
});

// Load Devices
async function loadDevices() {
  const deviceGrid = document.getElementById("device-grid");
  const devicesRef = collection(db, "devices");
  const adminDevicesQuery = query(devicesRef, where("connectedBy", "==", adminUID));

  onSnapshot(adminDevicesQuery, (snapshot) => {
    deviceGrid.innerHTML = "";
    snapshot.forEach((doc) => {
      const device = doc.data();
      const deviceCard = createDeviceCard(device, doc.id);
      deviceGrid.appendChild(deviceCard);
    });
  });
}

// Create Device Card
function createDeviceCard(device, deviceId) {
  const card = document.createElement("div");
  card.className = "device-card";
  card.innerHTML = `
    <h4>${device.deviceCode || "Unnamed Device"}</h4>
    <p>Items: ${device.currentMedia?.length || 0} </p>
    <button class="manage-btn" data-id="${deviceId}">Manage</button>
  `;
  const manageBtn = card.querySelector(".manage-btn");
  if (manageBtn) {
    manageBtn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevents unwanted event bubbling
      openDevicePopup(device, deviceId);
    });
  } return card;
}

// Load Groups
async function loadGroups() {
  const groupsList = document.getElementById("groups-list");
  const groupsRef = collection(db, `users/${adminUID}/deviceGroups`);

  onSnapshot(groupsRef, (snapshot) => {
    groupsList.innerHTML = "";
    snapshot.forEach((doc) => {
      const group = doc.data();
      const groupCard = createGroupCard(group, doc.id);
      groupsList.appendChild(groupCard);
    });
  });
}

// Create Group Card
function createGroupCard(group, groupId) {
  const card = document.createElement("div");
  card.className = "group-card";
  card.innerHTML = `
    <h4>${group.name || "Unnamed Group"}</h4>
    <p>Devices: ${group.devices.length} </p>
    <button class="manage-group-btn" data-id="${groupId}">Manage</button>`;
  card.querySelector(".manage-group-btn").addEventListener("click", () => openGroupPopup(group, groupId));
  return card;
}


// Function to set up the media type selection functionality
function setupMediaTypeSelection() {
  const mediaTypeSelect = document.getElementById("media-type-select");
  const mediaList = document.getElementById("media-list");
  const urlInputContainer = document.getElementById("url-input-container");
  const playlistsContainer = document.getElementById("playlists-container");

  // Add event listener for media type change
  mediaTypeSelect.addEventListener("change", () => {
    const selectedType = mediaTypeSelect.value;

    // Clear previous selections
    mediaList.innerHTML = "";
    document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));

    // Show/hide appropriate containers based on selection
    if (selectedType === "url") {
      urlInputContainer.style.display = "block";
      mediaList.style.display = "none";
      playlistsContainer.style.display = "none";
    } else if (selectedType === "playlist") {
      urlInputContainer.style.display = "none";
      mediaList.style.display = "none";
      playlistsContainer.style.display = "block";
      loadPlaylistsForMediaSelection();
    } else {
      urlInputContainer.style.display = "none";
      mediaList.style.display = "block";
      playlistsContainer.style.display = "none";

      // Load appropriate media based on type
      loadMediaByType(selectedType);
    }
  });

  // Setup URL add button functionality
    const addUrlBtn = document.getElementById("url-input");
      addUrlBtn.addEventListener("click", () => {
      const urlInput = document.getElementById("url-input");
      const url = urlInput.value.trim();
      if (!url) {
        showAlert("Please enter a valid URL");
        return;
      }

      // Create a virtual media item for the URL
      const mediaItem = document.createElement("li");
      mediaItem.className = "media-item selected";

      // Determine if it's likely an image or video based on extension
      const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
      const isImage = /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(url);

      let thumbnail;
      if (isVideo) {
        thumbnail = `<video src="${url}" class="thumbnail" muted></video>`;
      } else if (isImage || !isVideo) {
        // Default to image if we can't determine or it looks like an image
        thumbnail = `<img src="${url}" alt="URL Media" class="thumbnail" />`;
      }

      mediaItem.innerHTML = `<button class="select-media-btn" data-url="${url}">
        ${thumbnail}
      </button>`;

      // Clear previous selections and show this one
      document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));
      mediaList.innerHTML = "";
      mediaList.appendChild(mediaItem);
      mediaList.style.display = "block";
    });
  }

  // document.getElementById("url-input").addEventListener("keydown", async (e) => {
  //   if (e.key === "Enter") {
  //     const urlInput = e.target;
  //     const url = urlInput.value.trim();

  //     if (!url) {
  //       showAlert("Please enter a valid URL");
  //       return;
  //     }

  //     // Validate URL type
  //     const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
  //     const isImage = /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(url);
  //     const type = isVideo ? "video" : isImage ? "image" : "unknown";

  //     try {
  //       // Save to Firestore
  //       const docRef = await addDoc(collection(db, `users/${adminUID}/media`), {
  //         url,
  //         type,
  //         addedAt: new Date()
  //       });

  //       showAlert("Media URL added successfully!");

  //       // Optional: Show media immediately (preview)
  //       const mediaItem = document.createElement("li");
  //       mediaItem.className = "media-item selected";

  //       let thumbnail = type === "video"
  //         ? `<video src="${url}" class="thumbnail" muted></video>`
  //         : `<img src="${url}" alt="URL Media" class="thumbnail" />`;

  //       mediaItem.innerHTML = `<button class="select-media-btn" data-url="${url}">
  //       ${thumbnail}
  //     </button>`;

  //       document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));
  //       mediaList.innerHTML = "";
  //       mediaList.appendChild(mediaItem);
  //       mediaList.style.display = "block";

  //     } catch (error) {
  //       console.error("Error adding document: ", error);
  //       showAlert("Failed to add media URL.");
  //     }
  //   }
  // });
// }



// Function to load media by type from Firebase
// async function loadMediaByType(mediaType) {
//   const mediaList = document.getElementById("media-list");
//   mediaList.innerHTML = "";

//   const existingGridBtn = document.querySelector(".grid-create-button");
//   if (existingGridBtn) existingGridBtn.remove();

//   // Get reference to the media collection for the current user
//   const mediaRef = collection(db, `users/${adminUID}/media`);
//   const querySnapshot = await getDocs(mediaRef);

//   querySnapshot.forEach((doc) => {
//     const media = doc.data();

//     // Get media type and URL from the document
//     const mediaTypeValue = media.mediaType || "";
//     const mediaUrl = media.mediaUrl || "";

//     // Check if mediaType contains image or video
//     const isImage = mediaTypeValue.includes("image");
//     const isVideo = mediaTypeValue.includes("video");

//     // Filter based on the selected media type
//     if (
//       (mediaType === "image" && isImage) ||
//       (mediaType === "video" && isVideo) ||
//       (mediaType === "grid" && isImage) // For grid, we only show images
//     ) {

//       const mediaItem = document.createElement("li");
//       mediaItem.className = "media-item";

//       if (mediaType === "image" || mediaType === "grid") {
//         mediaItem.innerHTML = `<button class="select-media-btn" data-url="${mediaUrl}" data-type="${mediaTypeValue}">
//           <img src="${mediaUrl}" alt="${mediaTypeValue}" class="thumbnail" />
//         </button>`;
//       } else if (mediaType === "video") {
//         mediaItem.innerHTML = `<button class="select-media-btn" data-url="${mediaUrl}" data-type="${mediaTypeValue}">
//           <video src="${mediaUrl}" class="thumbnail" muted></video>
//         </button>`;
//       }

//       // Add click event with the current media type
//       const btn = mediaItem.querySelector(".select-media-btn");
//       btn.addEventListener("click", () => {
//         // In grid mode allow multiple selection, otherwise just single selection
//         if (mediaType !== "grid") {
//           document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));
//         }
//         mediaItem.classList.toggle("selected");
//       });

//       mediaList.appendChild(mediaItem);
//     }
//   });

//   // For grid layout, add special handling
//   if (mediaType === "grid" && mediaList.children.length > 0) {
//     addGridSelectionButton();
//   }

//   // Show a message if no media is found for the selected type
//   if (mediaList.children.length === 0) {
//     const noMediaMsg = document.createElement("p");
//     noMediaMsg.textContent = `No ${mediaType} media found.`;
//     noMediaMsg.style.textAlign = "center";
//     noMediaMsg.style.color = "#666";
//     mediaList.appendChild(noMediaMsg);
//   }
// }

async function loadMediaByType(mediaType) {
  const mediaList = document.getElementById("media-list");
  mediaList.innerHTML = "";

  const existingGridBtn = document.querySelector(".grid-create-button");
  if (existingGridBtn) existingGridBtn.remove();

  const mediaRef = collection(db, `users/${adminUID}/media`);
  const querySnapshot = await getDocs(mediaRef);

  querySnapshot.forEach((doc) => {
    const media = doc.data();
    const mediaTypeValue = media.mediaType || "";
    const mediaUrl = media.mediaUrl || "";

    const isImage = mediaTypeValue.includes("image");
    const isVideo = mediaTypeValue.includes("video");
    const isPdf = mediaTypeValue.includes("pdf");

    if (
      (mediaType === "image" && isImage) ||
      (mediaType === "video" && isVideo) ||
      (mediaType === "grid" && isImage) ||
      (mediaType === "pdf" && isPdf)
    ) {
      const mediaItem = document.createElement("li");
      mediaItem.className = "media-item";

      if (mediaType === "image" || mediaType === "grid") {
        mediaItem.innerHTML = `<button class="select-media-btn" data-url="${mediaUrl}" data-type="${mediaTypeValue}">
          <img src="${mediaUrl}" alt="${mediaTypeValue}" class="thumbnail" />
        </button>`;
      } else if (mediaType === "video") {
        mediaItem.innerHTML = `<button class="select-media-btn" data-url="${mediaUrl}" data-type="${mediaTypeValue}">
          <video src="${mediaUrl}" class="thumbnail" muted></video>
        </button>`;
      } else if (mediaType === "pdf") {
        mediaItem.innerHTML = `<button class="select-media-btn" data-url="${mediaUrl}" data-type="${mediaTypeValue}">
          <img src="/assets/pdf-icon.png" alt="PDF" class="thumbnail pdf-thumbnail" />
        </button>`;
      }

      const btn = mediaItem.querySelector(".select-media-btn");
      btn.addEventListener("click", () => {
        if (mediaType !== "grid") {
          document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));
        }
        mediaItem.classList.toggle("selected");
      });

      mediaList.appendChild(mediaItem);
    }
  });

  if (mediaType === "grid" && mediaList.children.length > 0) {
    addGridSelectionButton();
  }

  if (mediaList.children.length === 0) {
    const noMediaMsg = document.createElement("p");
    noMediaMsg.textContent = `No ${mediaType} media found.`;
    noMediaMsg.style.textAlign = "center";
    noMediaMsg.style.color = "#666";
    mediaList.appendChild(noMediaMsg);
  }
}


// Function to select media (modified to handle grid mode differently)
function selectMedia(mediaItem, mediaType) {
  // In grid mode allow multiple selection, otherwise just single selection
  if (mediaType !== "grid") {
    document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));
  }
  mediaItem.classList.toggle("selected");
}

// Function to add a "Create Grid" button when in grid mode
function addGridSelectionButton() {
  const mediaList = document.getElementById("media-list");
  const gridButtonContainer = document.createElement("div");
  gridButtonContainer.className = "grid-create-button";
  gridButtonContainer.innerHTML = `
    <button id="create-grid-btn" class="modal-btn">Create Grid from Selected Images</button>
    <p style="margin-top: 5px; font-size: 12px; color: #666;">Please select at least 2  or 4 images for grid view</p>
  `;
  mediaList.parentNode.insertBefore(gridButtonContainer, mediaList.nextSibling);

  // Handle grid creation
  document.getElementById("create-grid-btn").addEventListener("click", createGridFromSelected);
}

// Function to create a grid from selected images
function createGridFromSelected() {
  const selectedItems = document.querySelectorAll(".media-item.selected");
  if (selectedItems.length < 2 || selectedItems.length % 2 !== 0) {
    showAlert("Please select an even number of images (2, 4, 6...) for the grid view");
    return;
  }

  // Create an array of selected image URLs
  const selectedUrls = Array.from(selectedItems).map(item =>
    item.querySelector(".select-media-btn").dataset.url
  );

  showAlert(`Grid will be created with ${selectedUrls.length} images`);

  // Store the selected URLs in a data attribute on the push button
  document.getElementById("push-media-btn").dataset.gridUrls = JSON.stringify(selectedUrls);
  document.getElementById("push-media-btn").dataset.isGrid = "true";
}



// Function to load playlists for the media selection dropdown
// async function loadPlaylistsForMediaSelection() {
//   const playlistSelect = document.getElementById("media-playlist-select");
//   playlistSelect.innerHTML = `<option value="">Select Playlist</option>`;

//   const playlistsRef = collection(db, `users/${adminUID}/playlists`);
//   const querySnapshot = await getDocs(playlistsRef);

//   querySnapshot.forEach((doc) => {
//     const playlist = doc.data();
//     const option = document.createElement("option");
//     option.value = doc.id;
//     option.textContent = playlist.name || "Unnamed Playlist";
//     option.dataset.media = JSON.stringify(playlist.media || []);
//     playlistSelect.appendChild(option);
//   });

//   // Add event listener for playlist selection
//   playlistSelect.addEventListener("change", () => {
//     const selectedOption = playlistSelect.options[playlistSelect.selectedIndex];
//     if (selectedOption.value) {
//       document.getElementById("push-media-btn").dataset.playlistId = selectedOption.value;
//       document.getElementById("push-media-btn").dataset.isPlaylist = "true";
//     }
//   });
// }

// Function to load playlists for the media selection dropdown
async function loadPlaylistsForMediaSelection() {
  const oldSelect = document.getElementById("media-playlist-select");

  // Clone and replace to remove old event listeners
  const newSelect = oldSelect.cloneNode(true);
  oldSelect.parentNode.replaceChild(newSelect, oldSelect);

  newSelect.innerHTML = `<option value="">Select Playlist</option>`;

  const playlistsRef = collection(db, `users/${adminUID}/playlists`);
  const querySnapshot = await getDocs(playlistsRef);

  querySnapshot.forEach((doc) => {
    const playlist = doc.data();
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = playlist.name || "Unnamed Playlist";
    option.dataset.media = JSON.stringify(playlist.media || []);
    newSelect.appendChild(option);
  });

  // Add event listener for playlist selection
  newSelect.addEventListener("change", () => {
    const selectedOption = newSelect.options[newSelect.selectedIndex];
    if (selectedOption.value) {
      document.getElementById("push-media-btn").dataset.playlistId = selectedOption.value;
      document.getElementById("push-media-btn").dataset.isPlaylist = "true";
    }
  });
}


// Modify the openDevicePopup function to initialize the media type selection
function openDevicePopup(device, deviceId) {
  const mediaList = document.getElementById("media-list");
  const urlInputContainer = document.getElementById("url-input-container");
  const playlistsContainer = document.getElementById("playlists-container");
  urlInputContainer.style.display = "none";
  mediaList.style.display = "block";
  playlistsContainer.style.display = "none";

  const popup = document.getElementById("media-popup");
  popup.style.display = "flex";

  document.getElementById("device-name").textContent = ("Device ID: ") + device.deviceCode || "Unnamed Device";
  // document.getElementById("device-id").textContent = `Device ID: ${deviceId}`;

  document.getElementById("orientation-select").value = device.orientation || "landscape";
  document.getElementById("resize-select").value = device.resizeMode || "contain";
  document.getElementById("delay-input").value = device.delay || 5;
  document.getElementById("audio-select").value = device.audio || "mute";

  // Initialize with "image" type selected
  document.getElementById("media-type-select").value = "image";
  loadMediaByType("image");

  // Reset any stored grid or playlist data
  document.getElementById("push-media-btn").removeAttribute("data-grid-urls");
  document.getElementById("push-media-btn").removeAttribute("data-is-grid");
  document.getElementById("push-media-btn").removeAttribute("data-playlist-id");
  document.getElementById("push-media-btn").removeAttribute("data-is-playlist");

  // Setup action buttons
  document.getElementById("push-media-btn").onclick = () => pushMediaByType(deviceId);
  // document.getElementById("push-playlist-btn").onclick = () => pushPlaylist(deviceId);
  document.getElementById("clear-restart-btn").onclick = () => clearAndRestart(deviceId);
  // if (document.getElementById("close-popup")) {
  //   document.getElementById("close-popup").onclick = () => closePopup(popup);
  // }
}

// Similarly modify the openGroupPopup function
function openGroupPopup(group, groupId) {
  const mediaList = document.getElementById("media-list");
  const urlInputContainer = document.getElementById("url-input-container");
  const playlistsContainer = document.getElementById("playlists-container");
  urlInputContainer.style.display = "none";
  mediaList.style.display = "block";
  playlistsContainer.style.display = "none";
  const popup = document.getElementById("media-popup");
  popup.style.display = "flex";

  document.getElementById("device-name").textContent = group.name || "Unnamed Group";
  // document.getElementById("device-id").textContent = `Group ID: ${groupId}`;


  // Initialize with "image" type selected
  document.getElementById("media-type-select").value = "image";
  loadMediaByType("image");

  // Reset any stored grid or playlist data
  document.getElementById("push-media-btn").removeAttribute("data-grid-urls");
  document.getElementById("push-media-btn").removeAttribute("data-is-grid");
  document.getElementById("push-media-btn").removeAttribute("data-playlist-id");
  document.getElementById("push-media-btn").removeAttribute("data-is-playlist");

  // Setup action buttons
  document.getElementById("push-media-btn").onclick = () => pushMediaByTypeToGroup(group.devices);
  document.getElementById("clear-restart-btn").onclick = () => clearAndRestartGroup(group.devices);
}

// Function to push media based on selected type (single device)
// function pushMediaByType(deviceId) {
//   const mediaTypeSelect = document.getElementById("media-type-select");
//   const selectedType = mediaTypeSelect.value;
//   const pushButton = document.getElementById("push-media-btn");

//   // Get common settings
//   const orientation = document.getElementById("orientation-select").value;
//   const resizeMode = document.getElementById("resize-select").value;
//   const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
//   const audio = document.getElementById("audio-select").value;
//   const deviceRef = doc(db, "devices", deviceId);

//   let mediaContent = [];
//   let isGridView = false;
//   let webUrl = null;

//   // Handle different media types
//   if (selectedType === "url") {
//     const urlInput = document.getElementById("url-input");
//     const url = urlInput.value.trim();
//     if (!url) {
//       showAlert("Please enter a valid URL");
//       return;
//     }
//     webUrl = url;
//     mediaContent = null; // Set currentMedia to null for URL type
//   }

//   else if (selectedType === "pdf") {
//     const selectedMedia = document.querySelector(".media-item.selected");
//     if (!selectedMedia) {
//       showAlert("Please select a PDF to push");
//       return;
//     }
//     const mediaUrl = selectedMedia.querySelector(".select-media-btn")?.dataset.url;
//     if (!mediaUrl) {
//       showAlert("PDF URL not found");
//       return;
//     }
//     pdfUrl = mediaUrl;
//     mediaContent = null;
//   }

//   else if (selectedType === "grid" && pushButton.dataset.isGrid === "true") {
//     mediaContent = JSON.parse(pushButton.dataset.gridUrls || "[]");
//     // if (mediaContent.length < 2) {
//     //   showAlert("Please select at least 2 or 4 images for the grid view");
//     //   return;
//     // }
//     // isGridView = true;
//     if (mediaContent.length < 2 || mediaContent.length % 2 !== 0) {
//       showAlert("Please select an even number of images (2, 4, 6...) for the grid view");
//       return;
//     }
//     isGridView = true;

//   }
//   else if (selectedType === "playlist" && pushButton.dataset.isPlaylist === "true") {
//     const playlistId = pushButton.dataset.playlistId;
//     if (!playlistId) {
//       showAlert("Please select a playlist");
//       return;
//     }

//     // For playlists, we need to get the media array from Firebase
//     const playlistRef = doc(db, `users/${adminUID}/playlists`, playlistId);
//     getDoc(playlistRef)
//       .then((playlistDoc) => {
//         if (playlistDoc.exists()) {
//           updateDoc(deviceRef, {
//             currentMedia: playlistDoc.data().media,
//             webUrl: null, // Clear webUrl for playlist
//             orientation: orientation,
//             resizeMode: resizeMode,
//             delay: delaySeconds,
//             audio: audio,
//             isGridView: false,
//             lastContentPush: serverTimestamp(),
//           }).then(() => showAlert("Playlist pushed successfully!"));
//         }
//       })
//       .catch((error) => console.error("Error pushing playlist:", error));
//     return;
//   }
//   else {
//     // For image/video, get the selected media
//     const selectedMedia = document.querySelector(".media-item.selected");
//     if (!selectedMedia) {
//       showAlert("Please select media to push");
//       return;
//     }
//     const mediaUrl = selectedMedia.querySelector(".select-media-btn")?.dataset.url;

//     mediaContent = [mediaUrl];
//   }

//   // Create update data object
//   const updateData = {
//     orientation: orientation,
//     resizeMode: resizeMode,
//     delay: delaySeconds,
//     audio: audio,
//     isGridView: isGridView,
//     lastContentPush: serverTimestamp(),
//   };

//   // Set currentMedia and webUrl fields based on selected type
//   if (selectedType === "url") {
//     updateData.currentMedia = null;
//     updateData.webUrl = webUrl;
//   } else {
//     updateData.currentMedia = mediaContent;
//     updateData.webUrl = null; // Clear webUrl for non-URL media
//   }

//   // Push to Firebase with appropriate fields
//   updateDoc(deviceRef, updateData)
//     .then(() => {
//       if (selectedType === "url") {
//         showAlert("URL pushed successfully!");
//       } else if (isGridView) {
//         showAlert("Grid view pushed successfully!");
//       } else {
//         showAlert("Media pushed successfully!");
//       }
//     })
//     .catch((error) => console.error("Error pushing content:", error));
// }


function pushMediaByType(deviceId) {
  const mediaTypeSelect = document.getElementById("media-type-select");
  const selectedType = mediaTypeSelect.value;
  const pushButton = document.getElementById("push-media-btn");

  // Common settings
  const orientation = document.getElementById("orientation-select").value;
  const resizeMode = document.getElementById("resize-select").value;
  const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
  const audio = document.getElementById("audio-select").value;
  const deviceRef = doc(db, "devices", deviceId);

  let mediaContent = [];
  let isGridView = false;
  let webUrl = null;
  let pdfUrl = null;

  if (selectedType === "url") {
    const urlInput = document.getElementById("url-input");
    const url = urlInput.value.trim();
    if (!url) {
      showAlert("Please enter a valid URL");
      return;
    }
    webUrl = url;
    mediaContent = null;
  }
  else if (selectedType === "pdf") {
    const selectedMedia = document.querySelector(".media-item.selected");
    if (!selectedMedia) {
      showAlert("Please select a PDF to push");
      return;
    }
    const mediaUrl = selectedMedia.querySelector(".select-media-btn")?.dataset.url;
    if (!mediaUrl) {
      showAlert("PDF URL not found");
      return;
    }
    pdfUrl = mediaUrl;
    mediaContent = null;
  }
  else if (selectedType === "grid" && pushButton.dataset.isGrid === "true") {
    mediaContent = JSON.parse(pushButton.dataset.gridUrls || "[]");
    if (mediaContent.length < 2 || mediaContent.length % 2 !== 0) {
      showAlert("Please select an even number of images (2, 4, 6...) for the grid view");
      return;
    }
    isGridView = true;
  }
  else if (selectedType === "playlist" && pushButton.dataset.isPlaylist === "true") {
    const playlistId = pushButton.dataset.playlistId;
    if (!playlistId) {
      showAlert("Please select a playlist");
      return;
    }

    const playlistRef = doc(db, `users/${adminUID}/playlists`, playlistId);
    getDoc(playlistRef)
      .then((playlistDoc) => {
        if (playlistDoc.exists()) {
          updateDoc(deviceRef, {
            currentMedia: playlistDoc.data().media,
            webUrl: null,
            pdfUrl: null,
            orientation: orientation,
            resizeMode: resizeMode,
            delay: delaySeconds,
            audio: audio,
            isGridView: false,
            lastContentPush: serverTimestamp(),
          }).then(() => showAlert("Playlist pushed successfully!"));
        }
      })
      .catch((error) => console.error("Error pushing playlist:", error));
    return;
  }
  else {
    const selectedMedia = document.querySelector(".media-item.selected");
    if (!selectedMedia) {
      showAlert("Please select media to push");
      return;
    }
    const mediaUrl = selectedMedia.querySelector(".select-media-btn")?.dataset.url;
    mediaContent = [mediaUrl];
  }

  const updateData = {
    orientation: orientation,
    resizeMode: resizeMode,
    delay: delaySeconds,
    audio: audio,
    isGridView: isGridView,
    lastContentPush: serverTimestamp(),
  };

  // Set media fields based on selected type
  if (selectedType === "url") {
    updateData.currentMedia = null;
    updateData.webUrl = webUrl;
    updateData.pdfUrl = null;
  } else if (selectedType === "pdf") {
    updateData.currentMedia = null;
    updateData.webUrl = null;
    updateData.pdfUrl = pdfUrl;
  } else {
    updateData.currentMedia = mediaContent;
    updateData.webUrl = null;
    updateData.pdfUrl = null;
  }

  updateDoc(deviceRef, updateData)
    .then(() => {
      if (selectedType === "url") {
        showAlert("URL pushed successfully!");
      } else if (selectedType === "pdf") {
        showAlert("PDF pushed successfully!");
      } else if (isGridView) {
        showAlert("Grid view pushed successfully!");
      } else {
        showAlert("Media pushed successfully!");
      }
    })
    .catch((error) => console.error("Error pushing content:", error));
}


// Function to push media based on selected type (group of devices)
// function pushMediaByTypeToGroup(deviceIds) {
//   const mediaTypeSelect = document.getElementById("media-type-select");
//   const selectedType = mediaTypeSelect.value;
//   const pushButton = document.getElementById("push-media-btn");

//   // Get common settings
//   const orientation = document.getElementById("orientation-select").value;
//   const resizeMode = document.getElementById("resize-select").value;
//   const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
//   const audio = document.getElementById("audio-select").value;

//   let mediaContent = [];

//   // Handle different media types
//   if (selectedType === "url") {
//     const urlInput = document.getElementById("url-input");
//     const url = urlInput.value.trim();
//     if (!url) {
//       showAlert("Please enter a valid URL");
//       return;
//     }
//     mediaContent = [url];
//   }
//   else if (selectedType === "grid" && pushButton.dataset.isGrid === "true") {
//     mediaContent = JSON.parse(pushButton.dataset.gridUrls || "[]");
//     if (mediaContent.length === 0) {
//       showAlert("Please create a grid first");
//       return;
//     }
//   }
//   else if (selectedType === "playlist" && pushButton.dataset.isPlaylist === "true") {
//     const playlistId = pushButton.dataset.playlistId;
//     if (!playlistId) {
//       showAlert("Please select a playlist");
//       return;
//     }

//     // For playlists with multiple devices
//     const playlistRef = doc(db, `users/${adminUID}/playlists`, playlistId);
//     getDoc(playlistRef)
//       .then((playlistDoc) => {
//         if (playlistDoc.exists()) {
//           // Update each device in the group
//           deviceIds.forEach(async (deviceId) => {
//             const deviceRef = doc(db, "devices", deviceId);
//             await updateDoc(deviceRef, {
//               currentMedia: playlistDoc.data().media,
//               orientation: orientation,
//               resizeMode: resizeMode,
//               delay: delaySeconds,
//               audio: audio,
//               lastContentPush: serverTimestamp(),
//             });
//           });
//           showAlert("Playlist pushed to all devices in the group!");
//         }
//       })
//       .catch((error) => console.error("Error pushing playlist to group:", error));
//     return;
//   }
//   else {
//     // For image/video, get the selected media
//     const selectedMedia = document.querySelector(".media-item.selected");
//     if (!selectedMedia) {
//       showAlert("Please select media to push");
//       return;
//     }
//     const mediaUrl = selectedMedia.querySelector(".select-media-btn")?.dataset.url;

//     mediaContent = [mediaUrl];
//   }

//   // Update each device in the group
//   deviceIds.forEach(async (deviceId) => {
//     const deviceRef = doc(db, "devices", deviceId);
//     await updateDoc(deviceRef, {
//       currentMedia: mediaContent,
//       orientation: orientation,
//       resizeMode: resizeMode,
//       delay: delaySeconds,
//       audio: audio,
//       lastContentPush: serverTimestamp(),
//     });
//   });

//   showAlert("Media pushed to all devices in the group!");
// }


async function pushMediaByTypeToGroup(deviceIds) {
  const mediaTypeSelect = document.getElementById("media-type-select");
  const selectedType = mediaTypeSelect.value;
  const pushButton = document.getElementById("push-media-btn");

  // Get common settings
  const orientation = document.getElementById("orientation-select").value;
  const resizeMode = document.getElementById("resize-select").value;
  const delaySeconds = parseInt(document.getElementById("delay-input").value, 10);
  const audio = document.getElementById("audio-select").value;

  let mediaContent = [];

  // Handle URL type
  if (selectedType === "url") {
    const urlInput = document.getElementById("url-input");
    const url = urlInput.value.trim();
    if (!url) {
      showAlert("Please enter a valid URL");
      return;
    }
    mediaContent = [url];
  }

  // Handle Grid type
  else if (selectedType === "grid" && pushButton.dataset.isGrid === "true") {
    mediaContent = JSON.parse(pushButton.dataset.gridUrls || "[]");
    if (mediaContent.length === 0) {
      showAlert("Please create a grid first");
      return;
    }
  }

  // Handle Playlist type
  else if (selectedType === "playlist" && pushButton.dataset.isPlaylist === "true") {
    const playlistId = pushButton.dataset.playlistId;
    if (!playlistId) {
      showAlert("Please select a playlist");
      return;
    }

    try {
      const playlistRef = doc(db, `users/${adminUID}/playlists`, playlistId);
      const playlistDoc = await getDoc(playlistRef);

      if (playlistDoc.exists()) {
        const media = playlistDoc.data().media;

        await Promise.all(
          deviceIds.map(async (deviceId) => {
            const deviceRef = doc(db, "devices", deviceId);
            await updateDoc(deviceRef, {
              currentMedia: media,
              orientation,
              resizeMode,
              delay: delaySeconds,
              audio,
              lastContentPush: serverTimestamp(),
            });
          })
        );

        showAlert("Playlist pushed to all devices in the group!");
      } else {
        showAlert("Playlist not found.");
      }
    } catch (error) {
      console.error("Error pushing playlist to group:", error);
      showAlert("An error occurred while pushing playlist to the group.");
    }

    return;
  }

  // Handle Image/Video type
  else {
    const selectedMedia = document.querySelector(".media-item.selected");
    if (!selectedMedia) {
      showAlert("Please select media to push");
      return;
    }
    const mediaUrl = selectedMedia.querySelector(".select-media-btn")?.dataset.url;


    mediaContent = [mediaUrl];
  }

  try {
    await Promise.all(
      deviceIds.map(async (deviceId) => {
        const deviceRef = doc(db, "devices", deviceId);
        await updateDoc(deviceRef, {
          currentMedia: mediaContent,
          orientation,
          resizeMode,
          delay: delaySeconds,
          audio,
          lastContentPush: serverTimestamp(),
        });
      })
    );

    showAlert("Media pushed to all devices in the group!");
  } catch (error) {
    console.error("Error pushing media to group:", error);
    showAlert("An error occurred while pushing media to the group.");
  }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Get references to the buttons
  setupMediaTypeSelection();                                                //Image video is calling from here
  const closePopupButton = document.getElementById('close-popup-button');

  if (closePopupButton) {
    closePopupButton.addEventListener('click', function () {
      // Get the popup element
      const popup = document.getElementById('media-popup');

      // Hide the popup by setting display to none
      if (popup) {
        popup.style.display = 'none';
      }
    });
  }

  // Get the close button element by its ID
  const closeButton = document.getElementById('close-view-popup');

  // Add a click event listener to the close button
  if (closeButton) {
    closeButton.addEventListener('click', function () {
      // Navigate to the home page
      window.location.href = 'service.html';


    });
  } else {
    console.error('Close button element with ID "close-view-popup" not found');
  }
});

// async function clearAndRestart(deviceId) {
//   try {
//     const userConfirmed = showConfirm("All media in the application will be deleted. Do you want to proceed?");

//     if (!userConfirmed) {
//       return; // Exit if the user cancels
//     }

//     const deviceRef = doc(db, "devices", deviceId);

//     // Set commands to true
//     await updateDoc(deviceRef, {
//       currentMedia: null,
//       webUrl: null,
//       commands: {
//         clearContent: true,
//         restartApp: true,
//       },
//     });

//     // Wait for 1 second before resetting commands
//     setTimeout(async () => {
//       await updateDoc(deviceRef, {
//         commands: {
//           clearContent: false,
//           restartApp: false,
//         },
//       });
//     }, 1000);

//     showAlert("Media cleared and restart command sent!");
//   } catch (error) {
//     console.error("Error clearing and restarting device:", error);
//   }
// }

async function clearAndRestart(deviceId) {
  try {
    const userConfirmed = await showConfirm("All media in the application will be deleted. Do you want to proceed?");

    if (!userConfirmed) {
      return;
    }

    const deviceRef = doc(db, "devices", deviceId);

    await updateDoc(deviceRef, {
      currentMedia: null,
      webUrl: null,
      isGridView: false,
      pdfUrl: null,
      commands: {
        clearContent: true,
        restartApp: true,
      },
    });

    setTimeout(async () => {
      await updateDoc(deviceRef, {
        commands: {
          clearContent: false,
          restartApp: false,
        },
      });
    }, 1000);

    showAlert("Media cleared and restart command sent!");
  } catch (error) {
    console.error("Error clearing and restarting device:", error);
  }
}

// async function clearAndRestartGroup(deviceIds) {
//   try {
//     const userConfirmed = showConfirm(
//       "All media in the application will be deleted for all selected devices. Do you want to proceed?"
//     );

//     if (!userConfirmed) {
//       return; // Exit if the user cancels
//     }

//     for (const deviceId of deviceIds) {
//       const deviceRef = doc(db, "devices", deviceId);

//       // Set commands to true
//       await updateDoc(deviceRef, {
//         currentMedia: null,
//         webUrl: null,
//         isGridView: false,
//         pdfUrl: null,
//         commands: {
//           clearContent: true,
//           restartApp: true,
//         },
//       });

//       // Wait for 1 second then reset commands
//       setTimeout(async () => {
//         await updateDoc(deviceRef, {
//           commands: {
//             clearContent: false,
//             restartApp: false,
//           },
//         });
//       }, 1000);
//     }

//     showAlert("Media cleared and restart command sent to all devices in the group!");
//   } catch (error) {
//     console.error("Error clearing and restarting group devices:", error);
//   }
// }

async function clearAndRestartGroup(deviceIds) {
  try {
    const userConfirmed = await showConfirm(
      "All media in the application will be deleted for all selected devices. Do you want to proceed?"
    );

    if (!userConfirmed) return;

    for (const deviceId of deviceIds) {
      const deviceRef = doc(db, "devices", deviceId);

      await updateDoc(deviceRef, {
        currentMedia: null,
        webUrl: null,
        isGridView: false,
        pdfUrl: null,
        commands: {
          clearContent: true,
          restartApp: true,
        },
      });

      setTimeout(async () => {
        await updateDoc(deviceRef, {
          commands: {
            clearContent: false,
            restartApp: false,
          },
        });
      }, 1000);
    }

    showAlert("Media cleared and restart command sent to all devices in the group!");
  } catch (error) {
    console.error("Error clearing and restarting group devices:", error);
  }
}



document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function (e) {
  if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0))) {
    return false;
  }
};

function showAlert(message) {
  const alertBox = document.getElementById("custom-alert");
  const alertMessage = document.getElementById("alert-message");
  alertMessage.textContent = message;
  alertBox.classList.remove("hidden");

  // Auto-close after 3 seconds
  setTimeout(() => {
    alertBox.classList.add("hidden");
  }, 2000);
}

function closeAlert() {
  document.getElementById("custom-alert").classList.add("hidden");
}


function showConfirm(message) {
  return new Promise((resolve) => {
    const confirmBox = document.getElementById("custom-confirm");
    const messageBox = document.getElementById("confirm-message");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    messageBox.textContent = message;
    confirmBox.classList.remove("hidden");

    const cleanup = () => {
      confirmBox.classList.add("hidden");
      yesBtn.onclick = null;
      noBtn.onclick = null;
    };

    yesBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    noBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}

const devicesTab = document.getElementById('devices-tab');
const groupsTab = document.getElementById('groups-tab');
const deviceGrid = document.getElementById('device-grid');
const groupsGrid = document.getElementById('groups-list');
const tabHeader = document.getElementById('tab-header');

devicesTab.addEventListener('click', () => {
  devicesTab.classList.add('active-tab');
  groupsTab.classList.remove('active-tab');

  deviceGrid.classList.remove('hidden');
  groupsGrid.classList.add('hidden');

  tabHeader.innerHTML = `
  <h3>Devices</h3>
  <h3>Media Queue</h3>
  <h3>Action</h3>
`;
});

groupsTab.addEventListener('click', () => {
  groupsTab.classList.add('active-tab');
  devicesTab.classList.remove('active-tab');

  deviceGrid.classList.add('hidden');
  groupsGrid.classList.remove('hidden');

  tabHeader.innerHTML = `
  <h3>Group Name</h3>
  <h3>Group Devices</h3>
  <h3>Action</h3>
`;
});
