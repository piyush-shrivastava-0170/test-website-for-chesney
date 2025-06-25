// Firebase Device Management Application
// Main application file for managing devices, groups, and media content
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

/**
 * FIREBASE SETUP AND AUTHENTICATION
 */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// Global variables
let adminUID = null;
let unsubscribeListeners = []; // For cleanup of Firebase listeners

// Authentication state observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminUID = user.uid;
    initializeApp();
  } else {
    // Redirect to login if not authenticated
    window.location.href = "login.html";
  }
});


function initializeApp() {
  loadDevices();
  loadGroups();
  setupEventListeners();
  
  // Security check - verify user permissions
  verifyUserPermissions(adminUID);
}

// Verify that the current user has appropriate permissions
async function verifyUserPermissions(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data().isAdmin) {
      console.error("Permission denied");
      auth.signOut();
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error verifying permissions:", error);
    return false;
  }
}

/**
 * EVENT LISTENERS
 */
function setupEventListeners() {
  // DOM Ready event listeners
  document.addEventListener('DOMContentLoaded', () => {
    const homeButton = document.getElementById('home-button');
    const closePopupButton = document.getElementById('close-popup-button');
    
    if (homeButton) {
      homeButton.addEventListener('click', () => {
        location.href = 'home.html';
      });
    }
    
    if (closePopupButton) {
      closePopupButton.addEventListener('click', closePopup);
    }
    
    // Setup media type selection if the element exists
    const mediaTypeSelect = document.getElementById('media-type-select');
    if (mediaTypeSelect) {
      setupMediaTypeSelection();
    }
  });
}

// Close any open popup
function closePopup() {
  const popup = document.getElementById('media-popup');
  if (popup) {
    popup.style.display = 'none';
  }
}

/**
 * DEVICE MANAGEMENT
 */
function loadDevices() {
  const deviceGrid = document.getElementById("device-grid");
  if (!deviceGrid) return;
  
  const devicesRef = collection(db, "devices");
  const adminDevicesQuery = query(devicesRef, where("connectedBy", "==", adminUID));
  
  // Add listener with unsubscribe capability
  const unsubscribe = onSnapshot(adminDevicesQuery, (snapshot) => {
    deviceGrid.innerHTML = "";
    
    if (snapshot.empty) {
      deviceGrid.innerHTML = "<p class='no-data-message'>No devices found. Connect a device to get started.</p>";
      return;
    }
    
    snapshot.forEach((doc) => {
      const device = doc.data();
      const deviceCard = createDeviceCard(device, doc.id);
      deviceGrid.appendChild(deviceCard);
    });
  }, (error) => {
    console.error("Error loading devices:", error);
    deviceGrid.innerHTML = "<p class='error-message'>Error loading devices. Please refresh.</p>";
  });
  
  // Store unsubscribe function for cleanup
  unsubscribeListeners.push(unsubscribe);
}

function createDeviceCard(device, deviceId) {
  // Validate input data
  if (!device || !deviceId) {
    console.error("Invalid device data");
    return document.createElement("div");
  }
  
  const card = document.createElement("div");
  card.className = "device-card";
  
  // Sanitize device name for security
  const deviceName = sanitizeHTML(device.deviceCode || "Unnamed Device");
  const mediaCount = device.currentMedia?.length || 0;
  
  card.innerHTML = `
    <h4>${deviceName}</h4>
    <p>Media Queue: ${mediaCount} items</p>
    <button class="manage-btn" data-id="${deviceId}">Manage</button>
  `;
  
  const manageBtn = card.querySelector(".manage-btn");
  if (manageBtn) {
    manageBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openDevicePopup(device, deviceId);
    });
  }
  
  return card;
}

/**
 * GROUP MANAGEMENT
 */
function loadGroups() {
  const groupsList = document.getElementById("groups-list");
  if (!groupsList) return;
  
  const groupsRef = collection(db, `users/${adminUID}/deviceGroups`);
  
  // Add listener with unsubscribe capability
  const unsubscribe = onSnapshot(groupsRef, (snapshot) => {
    groupsList.innerHTML = "";
    
    if (snapshot.empty) {
      groupsList.innerHTML = "<p class='no-data-message'>No groups found. Create a group to manage multiple devices.</p>";
      return;
    }
    
    snapshot.forEach((doc) => {
      const group = doc.data();
      const groupCard = createGroupCard(group, doc.id);
      groupsList.appendChild(groupCard);
    });
  }, (error) => {
    console.error("Error loading groups:", error);
    groupsList.innerHTML = "<p class='error-message'>Error loading groups. Please refresh.</p>";
  });
  
  // Store unsubscribe function for cleanup
  unsubscribeListeners.push(unsubscribe);
}

function createGroupCard(group, groupId) {
  // Validate input data
  if (!group || !groupId) {
    console.error("Invalid group data");
    return document.createElement("div");
  }
  
  const card = document.createElement("div");
  card.className = "group-card";
  
  // Sanitize group name for security
  const groupName = sanitizeHTML(group.name || "Unnamed Group");
  const deviceCount = group.devices?.length || 0;
  
  card.innerHTML = `
    <h4>${groupName}</h4>
    <p>${deviceCount} Devices</p>
    <button class="manage-group-btn" data-id="${groupId}">Manage</button>
  `;
  
  const manageBtn = card.querySelector(".manage-group-btn");
  if (manageBtn) {
    manageBtn.addEventListener("click", () => {
      openGroupPopup(group, groupId);
    });
  }
  
  return card;
}

/**
 * POPUP MANAGEMENT
 */
function openDevicePopup(device, deviceId) {
  const popup = document.getElementById("media-popup");
  if (!popup || !device || !deviceId) return;
  
  popup.style.display = "flex";
  
  // Set device information
  setElementText("device-name", sanitizeHTML(device.deviceCode || "Unnamed Device"));
  setElementText("device-id", `Device ID: ${deviceId}`);
  
  // Set device settings
  setSelectValue("orientation-select", device.orientation || "landscape");
  setSelectValue("resize-select", device.resizeMode || "contain");
  setInputValue("delay-input", device.delay || 5);
  setSelectValue("audio-select", device.audio || "mute");
  
  // Initialize media selection
  initializeMediaSelection("image");
  
  // Setup action buttons
  setupActionButton("push-media-btn", () => pushMediaByType(deviceId));
  setupActionButton("clear-restart-btn", () => clearAndRestart(deviceId));
}

function openGroupPopup(group, groupId) {
  const popup = document.getElementById("media-popup");
  if (!popup || !group || !groupId) return;
  
  popup.style.display = "flex";
  
  // Set group information
  setElementText("device-name", sanitizeHTML(group.name || "Unnamed Group"));
  setElementText("device-id", `Group ID: ${groupId}`);
  
  // Initialize media selection
  initializeMediaSelection("image");
  
  // Setup action buttons
  setupActionButton("push-media-btn", () => pushMediaByTypeToGroup(group.devices));
  setupActionButton("push-playlist-btn", () => pushPlaylistToGroup(group.devices));
  setupActionButton("clear-restart-btn", () => clearAndRestartGroup(group.devices));
}

/**
 * MEDIA SELECTION AND MANAGEMENT
 */
function setupMediaTypeSelection() {
  const mediaTypeSelect = document.getElementById("media-type-select");
  if (!mediaTypeSelect) return;
  
  mediaTypeSelect.addEventListener("change", () => {
    const selectedType = mediaTypeSelect.value;
    updateMediaSelectionUI(selectedType);
  });
  
  // Setup URL input functionality
  setupUrlInputFunctionality();
}

function updateMediaSelectionUI(selectedType) {
  const mediaList = document.getElementById("media-list");
  const urlInputContainer = document.getElementById("url-input-container");
  const playlistsContainer = document.getElementById("playlists-container");
  
  // Reset selections
  if (mediaList) {
    mediaList.innerHTML = "";
    document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));
  }
  
  // Show/hide appropriate containers
  setElementDisplay(urlInputContainer, selectedType === "url" ? "block" : "none");
  setElementDisplay(mediaList, ["image", "video", "grid"].includes(selectedType) ? "block" : "none");
  setElementDisplay(playlistsContainer, selectedType === "playlist" ? "block" : "none");
  
  // Load media or playlists based on selection
  if (selectedType === "playlist") {
    loadPlaylistsForMediaSelection();
  } else if (["image", "video", "grid"].includes(selectedType)) {
    loadMediaByType(selectedType);
  }
}

function setupUrlInputFunctionality() {
  const addUrlBtn = document.getElementById("add-url-btn");
  if (!addUrlBtn) return;
  
  addUrlBtn.addEventListener("click", () => {
    const urlInput = document.getElementById("url-input");
    if (!urlInput) return;
    
    const url = urlInput.value.trim();
    if (!url) {
      showNotification("Please enter a valid URL", "error");
      return;
    }
    
    // Validate URL for security
    if (!isValidUrl(url)) {
      showNotification("Invalid URL format. Please enter a valid URL", "error");
      return;
    }
    
    createMediaItemForUrl(url);
  });
}

function createMediaItemForUrl(url) {
  const mediaList = document.getElementById("media-list");
  if (!mediaList) return;
  
  // Create a virtual media item for the URL
  const mediaItem = document.createElement("li");
  mediaItem.className = "media-item selected";
  
  // Determine media type based on URL
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
  const isImage = /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(url);
  
  let thumbnail;
  if (isVideo) {
    thumbnail = `<video src="${url}" class="thumbnail" muted></video>`;
  } else {
    // Default to image for other URLs
    thumbnail = `<img src="${url}" alt="URL Media" class="thumbnail" onerror="this.src='placeholder.png';" />`;
  }
  
  mediaItem.innerHTML = `<button class="select-media-btn" data-url="${url}">
    ${thumbnail}
  </button>`;
  
  // Clear previous selections and show this one
  document.querySelectorAll(".media-item").forEach(item => item.classList.remove("selected"));
  mediaList.innerHTML = "";
  mediaList.appendChild(mediaItem);
  mediaList.style.display = "block";
}

async function loadMediaByType(mediaType) {
  const mediaList = document.getElementById("media-list");
  if (!mediaList) return;
  
  mediaList.innerHTML = "<p class='loading-message'>Loading media...</p>";
  
  try {
    // Get reference to the media collection for the current user
    const mediaRef = collection(db, `users/${adminUID}/media`);
    const querySnapshot = await getDocs(mediaRef);
    
    // Clear loading message
    mediaList.innerHTML = "";
    
    if (querySnapshot.empty) {
      mediaList.innerHTML = `<p class='no-data-message'>No ${mediaType} media found.</p>`;
      return;
    }
    
    let mediaCount = 0;
    
    querySnapshot.forEach((doc) => {
      const media = doc.data();
      
      // Get media type and URL from the document
      const mediaTypeValue = media.mediaType || "";
      const mediaUrl = media.mediaUrl || "";
      
      // Skip if URL is empty
      if (!mediaUrl) return;
      
      // Check if mediaType contains image or video
      const isImage = mediaTypeValue.includes("image");
      const isVideo = mediaTypeValue.includes("video");
      
      // Filter based on the selected media type
      if (
        (mediaType === "image" && isImage) ||
        (mediaType === "video" && isVideo) ||
        (mediaType === "grid" && isImage)
      ) {
        const mediaItem = createMediaItem(mediaUrl, mediaTypeValue, mediaType);
        mediaList.appendChild(mediaItem);
        mediaCount++;
      }
    });
    
    // For grid layout, add special handling
    if (mediaType === "grid" && mediaCount > 0) {
      addGridSelectionButton();
    }
    
    // Show a message if no media is found for the selected type
    if (mediaCount === 0) {
      mediaList.innerHTML = `<p class='no-data-message'>No ${mediaType} media found.</p>`;
    }
  } catch (error) {
    console.error("Error loading media:", error);
    mediaList.innerHTML = "<p class='error-message'>Error loading media. Please try again.</p>";
  }
}

function createMediaItem(mediaUrl, mediaType, selectionType) {
  const mediaItem = document.createElement("li");
  mediaItem.className = "media-item";
  
  if (selectionType === "image" || selectionType === "grid") {
    mediaItem.innerHTML = `<button class="select-media-btn" data-url="${mediaUrl}" data-type="${mediaType}">
      <img src="${mediaUrl}" alt="${mediaType}" class="thumbnail" onerror="this.src='placeholder.png';" />
    </button>`;
  } else if (selectionType === "video") {
    mediaItem.innerHTML = `<button class="select-media-btn" data-url="${mediaUrl}" data-type="${mediaType}">
      <video src="${mediaUrl}" class="thumbnail" muted></video>
    </button>`;
  }
  
  // Add click event for selection
  const btn = mediaItem.querySelector(".select-media-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      // In grid mode allow multiple selection, otherwise just single selection
      if (selectionType !== "grid") {
        document.querySelectorAll(".media-item").forEach(item => {
          item.classList.remove("selected");
        });
      }
      mediaItem.classList.toggle("selected");
    });
  }
  
  return mediaItem;
}

function addGridSelectionButton() {
  const mediaList = document.getElementById("media-list");
  if (!mediaList) return;
  
  const gridButtonContainer = document.createElement("div");
  gridButtonContainer.className = "grid-create-button";
  gridButtonContainer.innerHTML = `
    <button id="create-grid-btn" class="modal-btn">Create Grid from Selected Images</button>
    <p style="margin-top: 5px; font-size: 12px; color: #666;">
      Please select at least 4 images for grid view
    </p>
  `;
  
  mediaList.parentNode.insertBefore(gridButtonContainer, mediaList.nextSibling);
  
  // Handle grid creation
  const createGridBtn = document.getElementById("create-grid-btn");
  if (createGridBtn) {
    createGridBtn.addEventListener("click", createGridFromSelected);
  }
}

function createGridFromSelected() {
  const selectedItems = document.querySelectorAll(".media-item.selected");
  if (selectedItems.length < 4) {
    showNotification("Please select at least 4 images for the grid view", "warning");
    return;
  }
  
  // Create an array of selected image URLs
  const selectedUrls = Array.from(selectedItems).map(item => {
    const btn = item.querySelector(".select-media-btn");
    return btn ? btn.dataset.url : null;
  }).filter(url => url !== null);
  
  // Validate that we have enough valid URLs
  if (selectedUrls.length < 4) {
    showNotification("Please select at least 4 valid images", "warning");
    return;
  }
  
  showNotification(`Grid will be created with ${selectedUrls.length} images`, "info");
  
  // Store the selected URLs in a data attribute on the push button
  const pushMediaBtn = document.getElementById("push-media-btn");
  if (pushMediaBtn) {
    pushMediaBtn.dataset.gridUrls = JSON.stringify(selectedUrls);
    pushMediaBtn.dataset.isGrid = "true";
  }
}

async function loadPlaylistsForMediaSelection() {
  const playlistSelect = document.getElementById("media-playlist-select");
  if (!playlistSelect) return;
  
  playlistSelect.innerHTML = `<option value="">Select Playlist</option>`;
  
  try {
    const playlistsRef = collection(db, `users/${adminUID}/playlists`);
    const querySnapshot = await getDocs(playlistsRef);
    
    if (querySnapshot.empty) {
      const noPlaylists = document.createElement("option");
      noPlaylists.disabled = true;
      noPlaylists.textContent = "No playlists found";
      playlistSelect.appendChild(noPlaylists);
      return;
    }
    
    querySnapshot.forEach((doc) => {
      const playlist = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = sanitizeHTML(playlist.name || "Unnamed Playlist");
      option.dataset.media = JSON.stringify(playlist.media || []);
      playlistSelect.appendChild(option);
    });
    
    // Add event listener for playlist selection
    playlistSelect.addEventListener("change", () => {
      const selectedOption = playlistSelect.options[playlistSelect.selectedIndex];
      const pushMediaBtn = document.getElementById("push-media-btn");
      
      if (pushMediaBtn && selectedOption && selectedOption.value) {
        pushMediaBtn.dataset.playlistId = selectedOption.value;
        pushMediaBtn.dataset.isPlaylist = "true";
      }
    });
  } catch (error) {
    console.error("Error loading playlists:", error);
    playlistSelect.innerHTML = `<option value="" disabled>Error loading playlists</option>`;
  }
}

/**
 * MEDIA PUSH FUNCTIONS
 */
async function pushMediaByType(deviceId) {
  if (!deviceId) {
    showNotification("Invalid device ID", "error");
    return;
  }
  
  // Get common settings and prepare update data
  const updateData = getCommonMediaSettings();
  updateData.lastContentPush = serverTimestamp();
  
  try {
    // Get media content based on selected type
    const mediaResult = await getSelectedMediaContent();
    if (!mediaResult.success) {
      showNotification(mediaResult.message, "error");
      return;
    }
    
    // Update with the media content
    Object.assign(updateData, mediaResult.data);
    
    // Push to Firebase
    const deviceRef = doc(db, "devices", deviceId);
    await updateDoc(deviceRef, updateData);
    
    showNotification(`${mediaResult.type} pushed successfully!`, "success");
  } catch (error) {
    console.error("Error pushing content:", error);
    showNotification("Error pushing content. Please try again.", "error");
  }
}

async function pushMediaByTypeToGroup(deviceIds) {
  if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
    showNotification("No devices in this group", "error");
    return;
  }
  
  // Get common settings
  const updateData = getCommonMediaSettings();
  updateData.lastContentPush = serverTimestamp();
  
  try {
    // Get media content based on selected type
    const mediaResult = await getSelectedMediaContent();
    if (!mediaResult.success) {
      showNotification(mediaResult.message, "error");
      return;
    }
    
    // Update with the media content
    Object.assign(updateData, mediaResult.data);
    
    // Update each device in the group
    const updatePromises = deviceIds.map(async (deviceId) => {
      if (!deviceId) return Promise.resolve();
      
      const deviceRef = doc(db, "devices", deviceId);
      return updateDoc(deviceRef, updateData);
    });
    
    await Promise.all(updatePromises);
    
    showNotification(`${mediaResult.type} pushed to all devices in the group!`, "success");
  } catch (error) {
    console.error("Error pushing content to group:", error);
    showNotification("Error pushing content to group. Please try again.", "error");
  }
}

function getCommonMediaSettings() {
  return {
    orientation: getSelectValue("orientation-select", "landscape"),
    resizeMode: getSelectValue("resize-select", "contain"),
    delay: parseInt(getInputValue("delay-input", "5"), 10),
    audio: getSelectValue("audio-select", "mute"),
    isGridView: false, // Default value, may be overridden
  };
}

async function getSelectedMediaContent() {
  const mediaTypeSelect = document.getElementById("media-type-select");
  if (!mediaTypeSelect) {
    return { success: false, message: "Media selection not available" };
  }
  
  const selectedType = mediaTypeSelect.value;
  const pushButton = document.getElementById("push-media-btn");
  
  // Handle URL type
  if (selectedType === "url") {
    const urlInput = document.getElementById("url-input");
    if (!urlInput) {
      return { success: false, message: "URL input not available" };
    }
    
    const url = urlInput.value.trim();
    if (!url) {
      return { success: false, message: "Please enter a valid URL" };
    }
    
    if (!isValidUrl(url)) {
      return { success: false, message: "Invalid URL format" };
    }
    
    return {
      success: true,
      type: "URL",
      data: {
        currentMedia: null,
        webUrl: url,
        isGridView: false
      }
    };
  }
  
  // Handle grid type
  if (selectedType === "grid" && pushButton && pushButton.dataset.isGrid === "true") {
    const gridUrls = JSON.parse(pushButton.dataset.gridUrls || "[]");
    if (gridUrls.length < 4) {
      return { success: false, message: "Please select at least 4 images for the grid view" };
    }
    
    return {
      success: true,
      type: "Grid view",
      data: {
        currentMedia: gridUrls,
        webUrl: null,
        isGridView: true
      }
    };
  }
  
  // Handle playlist type
  if (selectedType === "playlist" && pushButton && pushButton.dataset.isPlaylist === "true") {
    const playlistId = pushButton.dataset.playlistId;
    if (!playlistId) {
      return { success: false, message: "Please select a playlist" };
    }
    
    try {
      // Get playlist media from Firebase
      const playlistRef = doc(db, `users/${adminUID}/playlists`, playlistId);
      const playlistDoc = await getDoc(playlistRef);
      
      if (!playlistDoc.exists()) {
        return { success: false, message: "Playlist not found" };
      }
      
      const playlistMedia = playlistDoc.data().media || [];
      
      return {
        success: true,
        type: "Playlist",
        data: {
          currentMedia: playlistMedia,
          webUrl: null,
          isGridView: false
        }
      };
    } catch (error) {
      console.error("Error getting playlist:", error);
      return { success: false, message: "Error loading playlist" };
    }
  }
  
  // Handle image/video type
  const selectedMedia = document.querySelector(".media-item.selected");
  if (!selectedMedia) {
    return { success: false, message: "Please select media to push" };
  }
  
  const mediaBtn = selectedMedia.querySelector(".select-media-btn");
  if (!mediaBtn) {
    return { success: false, message: "Invalid media selection" };
  }
  
  const mediaUrl = mediaBtn.dataset.url;
  if (!mediaUrl) {
    return { success: false, message: "Invalid media URL" };
  }
  
  return {
    success: true,
    type: "Media",
    data: {
      currentMedia: [mediaUrl],
      webUrl: null,
      isGridView: false
    }
  };
}

/**
 * DEVICE CONTROL FUNCTIONS
 */
async function clearAndRestart(deviceId) {
  try {
    const userConfirmed = confirm("All media in the application will be deleted. Do you want to proceed?");
    
    if (!userConfirmed) {
      return;
    }
    
    const deviceRef = doc(db, "devices", deviceId);
    
    // Set commands to true
    await updateDoc(deviceRef, {
      currentMedia: null,
      webUrl: null,
      commands: {
        clearContent: true,
        restartApp: true
      }
    });
    
    // Reset commands after a delay using a transaction
    setTimeout(async () => {
      try {
        await runTransaction(db, async (transaction) => {
          const deviceSnapshot = await transaction.get(deviceRef);
          if (!deviceSnapshot.exists()) {
            throw new Error("Device does not exist!");
          }
          
          transaction.update(deviceRef, {
            commands: {
              clearContent: false,
              restartApp: false
            }
          });
        });
      } catch (error) {
        console.error("Error resetting commands:", error);
      }
    }, 2000);
    
    showNotification("Media cleared and restart command sent!", "success");
  } catch (error) {
    console.error("Error clearing and restarting device:", error);
    showNotification("Error clearing device. Please try again.", "error");
  }
}

async function clearAndRestartGroup(deviceIds) {
  if (!deviceIds || deviceIds.length === 0) {
    showNotification("No devices in this group", "error");
    return;
  }
  
  try {
    const userConfirmed = confirm(
      "All media in the application will be deleted for all selected devices. Do you want to proceed?"
    );
    
    if (!userConfirmed) {
      return;
    }
    
    // Process devices in batches to avoid overwhelming the database
    const batchSize = 5;
    for (let i = 0; i < deviceIds.length; i += batchSize) {
      const batch = deviceIds.slice(i, i + batchSize);
      
      // Process current batch
      await Promise.all(batch.map(async (deviceId) => {
        if (!deviceId) return;
        
        const deviceRef = doc(db, "devices", deviceId);
        
        // Set commands to true
        await updateDoc(deviceRef, {
          currentMedia: null,
          webUrl: null,
          commands: {
            clearContent: true,
            restartApp: true
          }
        });
        
        // Schedule command reset
        setTimeout(async () => {
          try {
            await updateDoc(deviceRef, {
              commands: {
                clearContent: false,
                restartApp: false
              }
            });
          } catch (error) {
            console.error(`Error resetting commands for device ${deviceId}:`, error);
          }
        }, 2000);
      }));
    }
    
    showNotification("Media cleared and restart commands sent to all devices in the group!", "success");
  } catch (error) {
    console.error("Error clearing and restarting group devices:", error);
    showNotification("Error processing group command. Please try again.", "error");
  }
}

/**
 * UTILITY FUNCTIONS
 */

// HTML sanitization to prevent XSS attacks
function sanitizeHTML(text) {
  if (!text) return "";
  
  const element = document.createElement('div');
  element.textContent = text;
  return element.innerHTML;
}

// URL validation
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Show notification to user
function showNotification(message, type = "info") {
  if (!message) return;
  
  // Use toast notification if available
  if (window.showToast && typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }
  
  // Fallback to alert for critical messages
  if (type === "error" || type === "warning") {
    alert(message);
  } else {
    console.log(message);
  }
}

// Helper functions for DOM manipulation
function setElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

function setElementDisplay(element, displayValue) {
  if (element) {
    element.style.display = displayValue;
  }
}

function setSelectValue(selectId, value) {
  const select = document.getElementById(selectId);
  if (select) {
    select.value = value;
  }
}

function getSelectValue(selectId, defaultValue) {
  const select = document.getElementById(selectId);
  return select ? select.value : defaultValue;
}

function setInputValue(inputId, value) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = value;
  }
}

function getInputValue(inputId, defaultValue) {
  const input = document.getElementById(inputId);
  return input ? input.value : defaultValue;
}

function setupActionButton(buttonId, clickHandler) {
  const button = document.getElementById(buttonId);
  if (button && typeof clickHandler === "function") {
    // Remove existing event listeners to prevent duplicates
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add new event listener
    newButton.addEventListener("click", clickHandler);
  }
}

// Initialize media selection
function initializeMediaSelection(defaultType) {
  const mediaTypeSelect = document.getElementById("media-type-select");
  if (mediaTypeSelect) {
    // Set default type
    mediaTypeSelect.value = defaultType || "image";
    
    // Clear previous data
    const pushMediaBtn = document.getElementById("push-media-btn");
    if (pushMediaBtn) {
      pushMediaBtn.removeAttribute("data-grid-urls");
      pushMediaBtn.removeAttribute("data-is-grid");
      pushMediaBtn.removeAttribute("data-playlist-id");
      pushMediaBtn.removeAttribute("data-is-playlist");
    }
    
    // Update UI for the selected type
    updateMediaSelectionUI(mediaTypeSelect.value);
  }
}

/**
 * APPLICATION CLEANUP
 */
function cleanupApplication() {
  // Unsubscribe from all Firebase listeners to prevent memory leaks
  unsubscribeListeners.forEach(unsubscribe => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  });
  
  // Clear unsubscribe array
  unsubscribeListeners = [];
  
  // Remove event listeners
  const elements = [
    "push-media-btn",
    "push-playlist-btn",
    "clear-restart-btn",
    "close-popup-button",
    "home-button",
    "create-grid-btn",
    "add-url-btn",
    "media-type-select",
    "media-playlist-select"
  ];
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      const newElement = element.cloneNode(true);
      if (element.parentNode) {
        element.parentNode.replaceChild(newElement, element);
      }
    }
  });
}

// Call cleanup when leaving the page
window.addEventListener("beforeunload", cleanupApplication);

/**
 * SECURITY MEASURES
 */

// Rate limiting for API calls
const rateLimiter = {
  limits: {}, // Store timestamps of actions
  
  // Check if an action can be performed
  checkLimit: function(action, limit = 5, timeWindow = 60000) {
    const now = Date.now();
    
    // Initialize action if not exists
    if (!this.limits[action]) {
      this.limits[action] = [];
    }
    
    // Remove timestamps outside the time window
    this.limits[action] = this.limits[action].filter(time => now - time < timeWindow);
    
    // Check if under limit
    if (this.limits[action].length < limit) {
      this.limits[action].push(now);
      return true;
    }
    
    return false;
  }
};



// Anti-spam protection for content push
function canPushContent(deviceId) {
  const key = `push_${deviceId}`;
  
  // Allow max 10 pushes in 1 minute
  if (!rateLimiter.checkLimit(key, 10, 60000)) {
    showNotification("Too many push requests. Please wait a moment before trying again.", "warning");
    return false;
  }
  
  return true;
}

// Implement CSRF protection
function setupCSRFProtection() {
  // Generate CSRF token on page load
  const csrfToken = generateRandomToken();
  localStorage.setItem('csrf_token', csrfToken);
  
  // Add token to all forms
  document.querySelectorAll('form').forEach(form => {
    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'csrf_token';
    tokenInput.value = csrfToken;
    form.appendChild(tokenInput);
  });
}

function generateRandomToken() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Input validation for all field types
function validateInput(input, type) {
  if (!input) return false;
  
  switch(type) {
    case 'url':
      return isValidUrl(input);
    case 'number':
      return !isNaN(input) && input > 0;
    case 'text':
      // Basic text validation - no HTML, reasonable length
      return typeof input === 'string' && 
             input.length > 0 && 
             input.length < 100 &&
             !/[<>]/.test(input);
    default:
      return true;
  }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Setup CSRF protection
  setupCSRFProtection();
  
  // The auth state observer will handle initializing the app
  console.log("Application initialized successfully");
});