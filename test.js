mport { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
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
  apiKey: "apiKey",
  authDomain: "authDomain",
  projectId: "projectId",
  storageBucket: "storageBucket",
  messagingSenderId: "messageSenderId",
  appId: "appId",
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
let adminUID = null;
let currentPopupListeners = [];
// Clear previous event listeners
function clearPreviousListeners() {
  currentPopupListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  currentPopupListeners = [];
}
// Authentication Check
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminUID = user.uid;
    loadDevices();
    loadGroups();
  } else {
    showAlert("Please log in to access this screen.");
    window.location.href = "login.html";
  }
});
// Load Devices with improved snapshot handling
function loadDevices() {
  const deviceGrid = document.getElementById("device-grid");
  const devicesRef = collection(db, "devices");
  const adminDevicesQuery = query(devicesRef, where("connectedBy", "==", adminUID));
  // Unsubscribe from previous snapshots to prevent duplicate listeners
  const unsubscribe = onSnapshot(adminDevicesQuery, (snapshot) => {
    deviceGrid.innerHTML = "";
    snapshot.forEach((doc) => {
      const device = doc.data();
      const deviceCard = createDeviceCard(device, doc.id);
      deviceGrid.appendChild(deviceCard);
    });
  });
  // Optional: Store unsubscribe method if you want to remove the listener later
  return unsubscribe;
}
// Load Groups with improved snapshot handling
function loadGroups() {
  const groupsList = document.getElementById("groups-list");
  const groupsRef = collection(db, `users/${adminUID}/deviceGroups`);
  const unsubscribe = onSnapshot(groupsRef, (snapshot) => {
    groupsList.innerHTML = "";
    snapshot.forEach((doc) => {
      const group = doc.data();
      const groupCard = createGroupCard(group, doc.id);
      groupsList.appendChild(groupCard);
    });
  });
  return unsubscribe;
}
// Media Type Selection Setup with Improved Event Management
function setupMediaTypeSelection() {
  const mediaTypeSelect = document.getElementById("media-type-select");
  const mediaList = document.getElementById("media-list");
  const urlInputContainer = document.getElementById("url-input-container");
  const playlistsContainer = document.getElementById("playlists-container");
  // Clear previous event listeners
  clearPreviousListeners();
  const mediaTypeHandler = () => {
    const selectedType = mediaTypeSelect.value;
    // Reset all containers
    mediaList.innerHTML = "";
    urlInputContainer.style.display = "none";
    mediaList.style.display = "none";
    playlistsContainer.style.display = "none";
    // Show appropriate container based on selection
    switch(selectedType) {
      case "url":
        urlInputContainer.style.display = "block";
        break;
      case "playlist":
        playlistsContainer.style.display = "block";
        loadPlaylistsForMediaSelection();
        break;
      default:
        mediaList.style.display = "block";
        loadMediaByType(selectedType);
    }
  };
  // Add event listener and track it
  mediaTypeSelect.addEventListener("change", mediaTypeHandler);
  currentPopupListeners.push({
    element: mediaTypeSelect,
    event: "change",
    handler: mediaTypeHandler
  });
}
// Optimized Media Loading
async function loadMediaByType(mediaType) {
  const mediaList = document.getElementById("media-list");
  mediaList.innerHTML = "";
  try {
    const mediaRef = collection(db, `users/${adminUID}/media`);
    const querySnapshot = await getDocs(mediaRef);
    const filteredMedia = querySnapshot.docs
      .map(doc => doc.data())
      .filter(media => {
        const mediaTypeValue = media.mediaType || "";
        return (
          (mediaType === "image" && mediaTypeValue.includes("image")) ||
          (mediaType === "video" && mediaTypeValue.includes("video")) ||
          (mediaType === "grid" && mediaTypeValue.includes("image"))
        );
      });
    if (filteredMedia.length === 0) {
      const noMediaMsg = document.createElement("p");
      noMediaMsg.textContent = `No ${mediaType} media found.`;
      noMediaMsg.style.textAlign = "center";
      noMediaMsg.style.color = "#666";
      mediaList.appendChild(noMediaMsg);
      return;
    }
    filteredMedia.forEach(media => {
      const mediaItem = document.createElement("li");
      mediaItem.className = "media-item";
      mediaItem.innerHTML = `
        <button class="select-media-btn" data-url="${media.mediaUrl}" data-type="${media.mediaType}">
          ${media.mediaType.includes("image")
            ? `<img src="${media.mediaUrl}" alt="${media.mediaType}" class="thumbnail" />`
            : `<video src="${media.mediaUrl}" class="thumbnail" muted></video>`
          }
        </button>
      `;
      mediaItem.querySelector(".select-media-btn").addEventListener("click", () => {
        mediaList.querySelectorAll(".media-item").forEach(item =>
          item.classList.remove("selected")
        );
        mediaItem.classList.add("selected");
      });
      mediaList.appendChild(mediaItem);
    });
    if (mediaType === "grid" && filteredMedia.length > 0) {
      addGridSelectionButton();
    }
  } catch (error) {
    console.error("Error loading media:", error);
    showAlert("Failed to load media. Please try again.");
  }
}
// Popup Management Functions
function openDevicePopup(device, deviceId) {
  const popup = document.getElementById("media-popup");
  popup.style.display = "flex";
  // Clear previous listeners
  clearPreviousListeners();
  // Populate device details
  document.getElementById("device-name").textContent = device.deviceCode || "Unnamed Device";
  document.getElementById("orientation-select").value = device.orientation || "landscape";
  document.getElementById("resize-select").value = device.resizeMode || "contain";
  document.getElementById("delay-input").value = device.delay || 5;
  document.getElementById("audio-select").value = device.audio || "mute";
  // Reset media selection
  document.getElementById("media-type-select").value = "image";
  document.getElementById("push-media-btn").removeAttribute("data-grid-urls");
  document.getElementById("push-media-btn").removeAttribute("data-is-grid");
  document.getElementById("push-media-btn").removeAttribute("data-playlist-id");
  document.getElementById("push-media-btn").removeAttribute("data-is-playlist");
  // Setup event listeners
  setupMediaTypeSelection();
  loadMediaByType("image");
  // Action button handlers
  const pushHandler = () => pushMediaByType(deviceId);
  const clearHandler = () => clearAndRestart(deviceId);
  document.getElementById("push-media-btn").addEventListener("click", pushHandler);
  document.getElementById("clear-restart-btn").addEventListener("click", clearHandler);
  currentPopupListeners.push(
    { element: document.getElementById("push-media-btn"), event: "click", handler: pushHandler },
    { element: document.getElementById("clear-restart-btn"), event: "click", handler: clearHandler }
  );
}
// Close Popup Function
function closePopup() {
  const popup = document.getElementById("media-popup");
  popup.style.display = "none";
  clearPreviousListeners();
}
// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  const closePopupButton = document.getElementById('close-popup-button');
  const closeViewPopup = document.getElementById('close-view-popup');
  if (closePopupButton) {
    closePopupButton.addEventListener('click', closePopup);
  }
  if (closeViewPopup) {
    closeViewPopup.addEventListener('click', () => {
      window.location.href = 'service.html';
    });
  }
  // Prevent context menu and dev tools
  document.addEventListener('contextmenu', event => event.preventDefault());
  document.onkeydown = function(e) {
    if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 'I'.charCodeAt(0))) {
      return false;
    }
  };
});
// Alert and Confirm Utilities (Existing implementation)
function showAlert(message) { /* Existing implementation */ }
function closeAlert() { /* Existing implementation */ }
function showConfirm(message) { /* Existing implementation */ }
// Other existing functions like pushMediaByType, clearAndRestart remain the same