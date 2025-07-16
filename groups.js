// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  getDoc,
  query, 
  where, 
  Timestamp 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
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

// Event listeners for modal and group details
function initializeEventListeners() {
  const showGroupModalBtn = document.getElementById("showGroupModal");
  const closeGroupModalBtn = document.getElementById("closeGroupModal");
  const createGroupBtn = document.getElementById("createGroupBtn");
  const modal = document.getElementById("groupModal");
  const backToGroupsBtn = document.getElementById("back-to-groups");

  showGroupModalBtn.addEventListener("click", showGroupModal);
  closeGroupModalBtn.addEventListener("click", closeGroupModal);
  createGroupBtn.addEventListener("click", createGroup);
  backToGroupsBtn.addEventListener("click", hideGroupDetails);

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeGroupModal();
    }
  });
}

function showGroupDetails() {
  document.getElementById("groups-container").style.display = "none";
  document.getElementById("group-details").classList.add("active");
}

function hideGroupDetails() {
  document.getElementById("groups-container").style.display = "block";
  document.getElementById("group-details").classList.remove("active");
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    userId = user.uid;
    initializeEventListeners();
    loadDevices(userId);
    loadGroups(userId);
  } else {
    showAlert("Please log in to manage your groups.");
    window.location.href = "login.html";
  }
});

async function loadDevices(userId) {
  const devicesList = document.getElementById("devices-list");
  devicesList.innerHTML = "";

  try {
    const devicesRef = collection(db, "devices");
    const querySnapshot = await getDocs(query(devicesRef, where("connectedBy", "==", userId)));

    if (querySnapshot.empty) {
      devicesList.innerHTML = "<p>No connected devices found.</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const deviceData = doc.data();
      const deviceItem = document.createElement("div");
      deviceItem.classList.add("device-item");
      deviceItem.innerHTML = `
        <input type="checkbox" id="device-${doc.id}" value="${doc.id}" class="device-checkbox" />
        <label for="device-${doc.id}">${deviceData.deviceCode || `Device ${doc.id}`}</label>
      `;
      devicesList.appendChild(deviceItem);
    });

    addSelectAllFunctionality();
  } catch (error) {
    console.error("Error loading devices:", error);
    devicesList.innerHTML = "<p>Error loading devices. Please try again.</p>";
  }
}

function addSelectAllFunctionality() {
  const selectAllCheckbox = document.getElementById("select-all-devices");
  const deviceCheckboxes = document.querySelectorAll(".device-checkbox");

  selectAllCheckbox.addEventListener("change", (e) => {
    deviceCheckboxes.forEach((checkbox) => {
      checkbox.checked = e.target.checked;
    });
  });

  deviceCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const allChecked = Array.from(deviceCheckboxes).every((cb) => cb.checked);
      const someChecked = Array.from(deviceCheckboxes).some((cb) => cb.checked);
      selectAllCheckbox.checked = allChecked;
      selectAllCheckbox.indeterminate = !allChecked && someChecked;
    });
  });
}

async function loadGroups(userId) {
  const groupsList = document.getElementById("groups-list");
  groupsList.innerHTML = "";

  try {
    const groupsRef = collection(db, `users/${userId}/deviceGroups`);
    const groupsSnapshot = await getDocs(groupsRef);

    if (groupsSnapshot.empty) {
      groupsList.innerHTML = "<p>No groups assigned yet.</p>";
      return;
    }

    groupsSnapshot.forEach((doc) => {
      const groupData = doc.data();
      const groupBox = document.createElement("div");
      groupBox.classList.add("group-box");
      groupBox.innerHTML = `
        <h4>${groupData.name}</h4>
        <p>${groupData.devices.length} Devices</p>
        <button class="view-group-btn" data-id="${doc.id}">View</button>
        <button class="delete-group-btn" data-id="${doc.id}">Delete</button>
      `;

      groupBox.querySelector(".view-group-btn").addEventListener("click", () => viewGroup(doc.id));
      groupBox.querySelector(".delete-group-btn").addEventListener("click", () => deleteGroup(doc.id, groupData.name));

      groupsList.appendChild(groupBox);
    });
  } catch (error) {
    console.error("Error loading groups:", error);
    groupsList.innerHTML = "<p>Error loading groups. Please try again.</p>";
  }
}

function showGroupModal() {
  const selectedDevices = Array.from(document.querySelectorAll(".device-checkbox:checked"))
    .map((checkbox) => checkbox.value);

  if (selectedDevices.length === 0) {
    showAlert("Please select at least one device to create a group.");
    return;
  }

  const selectedDevicesList = document.getElementById("selectedDevicesList");
  selectedDevicesList.innerHTML = "";
  selectedDevices.forEach((deviceId) => {
    const listItem = document.createElement("li");
    listItem.textContent = deviceId;
    selectedDevicesList.appendChild(listItem);
  });

  document.getElementById("groupModal").style.display = "block";
}

function closeGroupModal() {
  document.getElementById("groupModal").style.display = "none";
  document.getElementById("groupNameInput").value = "";
  document.querySelectorAll(".device-checkbox").forEach(checkbox => checkbox.checked = false);
  document.getElementById("select-all-devices").checked = false;
  document.getElementById("select-all-devices").indeterminate = false;
}

async function createGroup() {
  const selectedDevices = Array.from(document.querySelectorAll(".device-checkbox:checked"))
    .map((checkbox) => checkbox.value);

  if (selectedDevices.length === 0) {
    showAlert("Please select at least one device to create a group.");
    return;
  }

  const groupNameInput = document.getElementById("groupNameInput");
  const groupName = groupNameInput.value.trim();

  if (!groupName) {
    showAlert("Group name is required.");
    return;
  }

  try {
    const groupId = `group_${Date.now()}`;
    const groupData = {
      name: groupName,
      devices: selectedDevices,
      createdAt: Timestamp.now(),
    };

    const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
    await setDoc(groupRef, groupData);
    showAlert("Group create successfully.");
    closeGroupModal();
    loadGroups(userId);
  } catch (error) {
    console.error("Error creating group:", error);
    showAlert("Failed to create group. Please try again.");
  }
}

async function viewGroup(groupId) {
  try {
    const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      console.error("Group not found");
      return;
    }

    const groupData = groupSnap.data();
    const groupDetailsTitle = document.getElementById("group-details-title");
    const groupDevicesList = document.getElementById("group-devices-list");
    
    groupDetailsTitle.textContent = `Group: ${groupData.name}`;
    
    // Show loading state immediately
    groupDevicesList.innerHTML = "<li>Loading devices...</li>";
    
    // Show the group details view first
    showGroupDetails();

    if (!groupData.devices.length) {
      groupDevicesList.innerHTML = "<li>No devices in this group</li>";
      return;
    }

    // Fetch device details for each device ID
    const devicePromises = groupData.devices.map(async (deviceId) => {
      try {
        const deviceRef = doc(db, "devices", deviceId);
        const deviceSnap = await getDoc(deviceRef);
        
        if (deviceSnap.exists()) {
          const deviceData = deviceSnap.data();
          return {
            id: deviceId,
            code: deviceData.deviceCode || `Device ${deviceId}`,
            data: deviceData
          };
        } else {
          console.warn(`Device ${deviceId} not found`);
          return {
            id: deviceId,
            code: `Device ${deviceId} (Not Found)`,
            data: null
          };
        }
      } catch (error) {
        console.error(`Error fetching device ${deviceId}:`, error);
        return {
          id: deviceId,
          code: `Device ${deviceId} (Error)`,
          data: null
        };
      }
    });

    // Wait for all device fetches to complete
    const devices = await Promise.all(devicePromises);
    
    // Clear loading state and display devices
    groupDevicesList.innerHTML = "";
    devices.forEach(device => {
      const li = document.createElement("li");
      li.textContent = device.code;
      groupDevicesList.appendChild(li);
    });

  } catch (error) {
    console.error("Error viewing group:", error);
    const groupDevicesList = document.getElementById("group-devices-list");
    groupDevicesList.innerHTML = "<li>Error loading devices. Please try again.</li>";
  }
}

// Alternative approach: Cache device data to reduce loading time
let deviceCache = new Map();

async function loadDevicesWithCache(userId) {
  const devicesList = document.getElementById("devices-list");
  devicesList.innerHTML = "";

  try {
    const devicesRef = collection(db, "devices");
    const querySnapshot = await getDocs(query(devicesRef, where("connectedBy", "==", userId)));

    if (querySnapshot.empty) {
      devicesList.innerHTML = "<p>No connected devices found.</p>";
      return;
    }

    // Clear and populate cache
    deviceCache.clear();
    
    querySnapshot.forEach((doc) => {
      const deviceData = doc.data();
      
      // Store in cache
      deviceCache.set(doc.id, {
        id: doc.id,
        code: deviceData.deviceCode || `Device ${doc.id}`,
        data: deviceData
      });
      
      // Create UI element
      const deviceItem = document.createElement("div");
      deviceItem.classList.add("device-item");
      deviceItem.innerHTML = `
        <input type="checkbox" id="device-${doc.id}" value="${doc.id}" class="device-checkbox" />
        <label for="device-${doc.id}">${deviceData.deviceCode || `Device ${doc.id}`}</label>
      `;
      devicesList.appendChild(deviceItem);
    });

    addSelectAllFunctionality();
  } catch (error) {
    console.error("Error loading devices:", error);
    devicesList.innerHTML = "<p>Error loading devices. Please try again.</p>";
  }
}

// Optimized viewGroup using cache
async function viewGroupWithCache(groupId) {
  try {
    const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      console.error("Group not found");
      return;
    }

    const groupData = groupSnap.data();
    const groupDetailsTitle = document.getElementById("group-details-title");
    const groupDevicesList = document.getElementById("group-devices-list");
    
    groupDetailsTitle.textContent = `Group: ${groupData.name}`;
    groupDevicesList.innerHTML = "";

    if (!groupData.devices.length) {
      groupDevicesList.innerHTML = "<li>No devices in this group</li>";
    } else {
      // Use cached data if available, otherwise fetch
      const devices = await Promise.all(
        groupData.devices.map(async (deviceId) => {
          if (deviceCache.has(deviceId)) {
            return deviceCache.get(deviceId);
          } else {
            // Fetch if not in cache
            try {
              const deviceRef = doc(db, "devices", deviceId);
              const deviceSnap = await getDoc(deviceRef);
              
              if (deviceSnap.exists()) {
                const deviceData = deviceSnap.data();
                const device = {
                  id: deviceId,
                  code: deviceData.deviceCode || `Device ${deviceId}`,
                  data: deviceData
                };
                deviceCache.set(deviceId, device);
                return device;
              } else {
                return {
                  id: deviceId,
                  code: `Device ${deviceId} (Not Found)`,
                  data: null
                };
              }
            } catch (error) {
              console.error(`Error fetching device ${deviceId}:`, error);
              return {
                id: deviceId,
                code: `Device ${deviceId} (Error)`,
                data: null
              };
            }
          }
        })
      );
      
      // Display devices
      devices.forEach(device => {
        const li = document.createElement("li");
        li.textContent = device.code;
        groupDevicesList.appendChild(li);
      });
    }

    showGroupDetails();
  } catch (error) {
    console.error("Error viewing group:", error);
  }
}

// Progressive loading approach
async function viewGroupProgressive(groupId) {
  try {
    const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      console.error("Group not found");
      return;
    }

    const groupData = groupSnap.data();
    const groupDetailsTitle = document.getElementById("group-details-title");
    const groupDevicesList = document.getElementById("group-devices-list");
    
    groupDetailsTitle.textContent = `Group: ${groupData.name}`;
    groupDevicesList.innerHTML = "";

    // Show view immediately
    showGroupDetails();

    if (!groupData.devices.length) {
      groupDevicesList.innerHTML = "<li>No devices in this group</li>";
      return;
    }

    // Add placeholder items first
    groupData.devices.forEach(deviceId => {
      const li = document.createElement("li");
      li.textContent = "Loading...";
      li.id = `device-${deviceId}`;
      groupDevicesList.appendChild(li);
    });

    // Fetch and update each device progressively
    groupData.devices.forEach(async (deviceId) => {
      try {
        const deviceRef = doc(db, "devices", deviceId);
        const deviceSnap = await getDoc(deviceRef);
        
        const li = document.getElementById(`device-${deviceId}`);
        if (li) {
          if (deviceSnap.exists()) {
            const deviceData = deviceSnap.data();
            li.textContent = deviceData.deviceCode || `Device ${deviceId}`;
          } else {
            li.textContent = `Device ${deviceId} (Not Found)`;
          }
        }
      } catch (error) {
        console.error(`Error fetching device ${deviceId}:`, error);
        const li = document.getElementById(`device-${deviceId}`);
        if (li) {
          li.textContent = `Device ${deviceId} (Error)`;
        }
      }
    });

  } catch (error) {
    console.error("Error viewing group:", error);
  }
}

async function deleteGroup(groupId, groupName) {
  const confirmDelete = await confirm(`Are you sure you want to delete the group "${groupName}"?`);
  if (!confirmDelete) return;

  // Show loading spinner
  showLoader(`Deleting group "${groupName}"...`);

  try {
    updateLoaderText("Removing group from database...");
    const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
    await deleteDoc(groupRef);
    
    updateLoaderText("Refreshing groups...");
    loadGroups(userId);
    
    showAlert(`Group "${groupName}" deleted successfully.`);
  } catch (error) {
    console.error("Error deleting group:", error);
    showAlert("Error deleting group. Please try again.");
  } finally {
    // Always hide the loader
    hideLoader();
  }

}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get the close button element by its ID
  const closeButton = document.getElementById('close-view-popup');
  
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





const showDevicesBtn = document.getElementById("show-devices-btn");
const showGroupsBtn = document.getElementById("show-groups-btn");
const devicesList = document.getElementById("devices-list");
const groupsList = document.getElementById("groups-list");
const createGroupButton = document.getElementById("showGroupModal");
const selectAllContainer = document.getElementById("select-all-container");

function showDevices() {
  devicesList.style.display = "grid";
  groupsList.style.display = "none";
  showDevicesBtn.classList.add("active");
  showGroupsBtn.classList.remove("active");
  
   // Show create group button and select all checkbox
   createGroupButton.style.display = "block";
   selectAllContainer.style.display = "block";
 
}

function showGroups() {
  devicesList.style.display = "none";
  groupsList.style.display = "grid";
  showGroupsBtn.classList.add("active");
  showDevicesBtn.classList.remove("active");
  
  // Hide create group button and select all checkbox
  createGroupButton.style.display = "none";
  selectAllContainer.style.display = "none";
}

showDevicesBtn.addEventListener("click", showDevices);
showGroupsBtn.addEventListener("click", showGroups);

// Initial view
showDevices(); // Load Devices section first

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