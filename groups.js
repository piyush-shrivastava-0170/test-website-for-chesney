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
    alert("Please log in to manage your groups.");
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
    alert("Please select at least one device to create a group.");
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
    alert("Please select at least one device to create a group.");
    return;
  }

  const groupNameInput = document.getElementById("groupNameInput");
  const groupName = groupNameInput.value.trim();

  if (!groupName) {
    alert("Group name is required.");
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

    closeGroupModal();
    loadGroups(userId);
  } catch (error) {
    console.error("Error creating group:", error);
    alert("Failed to create group. Please try again.");
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
    groupDevicesList.innerHTML = "";

    if (!groupData.devices.length) {
      groupDevicesList.innerHTML = "<li>No devices in this group</li>";
    } else {
      groupData.devices.forEach(deviceId => {
        const li = document.createElement("li");
        li.textContent = deviceId;
        groupDevicesList.appendChild(li);
      });
    }

    showGroupDetails();
  } catch (error) {
    console.error("Error viewing group:", error);
  }
}

async function deleteGroup(groupId, groupName) {
  const confirmDelete = confirm(`Are you sure you want to delete the group "${groupName}"?`);
  if (!confirmDelete) return;

  try {
    const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
    await deleteDoc(groupRef);
    loadGroups(userId);
  } catch (error) {
    console.error("Error deleting group:", error);
    alert("Error deleting group. Please try again.");
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

function showDevices() {
  devicesList.style.display = "grid";
  groupsList.style.display = "none";
  showDevicesBtn.classList.add("active");
  showGroupsBtn.classList.remove("active");
}

function showGroups() {
  devicesList.style.display = "none";
  groupsList.style.display = "grid";
  showGroupsBtn.classList.add("active");
  showDevicesBtn.classList.remove("active");
}

showDevicesBtn.addEventListener("click", showDevices);
showGroupsBtn.addEventListener("click", showGroups);

// Initial view
showDevices(); // Load Devices section first