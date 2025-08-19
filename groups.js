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

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const showGroupModalBtn = document.getElementById("showGroupModal");
  const closeGroupModalBtn = document.getElementById("closeGroupModal");
  const createGroupBtn = document.getElementById("createGroupBtn");
  const modal = document.getElementById("groupModal");
  const backToGroupsBtn = document.getElementById("back-to-groups");
  const showDevicesBtn = document.getElementById("show-devices-btn");
  const showGroupsBtn = document.getElementById("show-groups-btn");
  const devicesList = document.getElementById("devices-list");
  const groupsList = document.getElementById("groups-list");
  const selectAllContainer = document.getElementById("select-all-container");
  const closeBtn = document.querySelector(".close-btn");

  // Event listeners for modal and group details
  showGroupModalBtn.addEventListener("click", showGroupModal);
  closeGroupModalBtn.addEventListener("click", closeGroupModal);
  createGroupBtn.addEventListener("click", createGroup);
  backToGroupsBtn.addEventListener("click", hideGroupDetails);

  // Close modal when clicking outside
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeGroupModal();
    }
  });

  // Toggle between devices and groups
  showDevicesBtn.addEventListener("click", showDevices);
  showGroupsBtn.addEventListener("click", showGroups);

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      window.location.href = "service.html";
    });
  } else {
    console.error('Close button element with class "close-btn" not found');
  }

  // Initial view
  showDevices();

  // Auth state observer
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      loadDevices(userId);
      loadGroups(userId);
    } else {
      showNotification("error", "Authentication Error", "Please log in to manage your groups.");
      window.location.href = "login.html";
    }
  });

  function showDevices() {
    devicesList.style.display = "grid";
    groupsList.style.display = "none";
    showDevicesBtn.classList.add("active");
    showGroupsBtn.classList.remove("active");
    showGroupModalBtn.style.display = "block";
    selectAllContainer.style.display = "flex";
  }

  function showGroups() {
    devicesList.style.display = "none";
    groupsList.style.display = "grid";
    showGroupsBtn.classList.add("active");
    showDevicesBtn.classList.remove("active");
    showGroupModalBtn.style.display = "none";
    selectAllContainer.style.display = "none";
  }

  function showGroupDetails() {
    document.getElementById("groups-container").style.display = "none";
    document.getElementById("group-details").classList.add("active");
  }

  function hideGroupDetails() {
    document.getElementById("groups-container").style.display = "block";
    document.getElementById("group-details").classList.remove("active");
  }

  async function loadDevices(userId) {
    showLoader("Loading devices...");
    const devicesList = document.getElementById("devices-list");
    devicesList.innerHTML = "";

    try {
      const devicesRef = collection(db, "devices");
      const querySnapshot = await getDocs(query(devicesRef, where("connectedBy", "==", userId)));

      if (querySnapshot.empty) {
        devicesList.innerHTML = "<p>No connected devices found.</p>";
        hideLoader();
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
      showNotification("error", "Load Failed", "Error loading devices. Please try again.");
    } finally {
      hideLoader();
    }
  }

  function addSelectAllFunctionality() {
    const selectAllCheckbox = document.getElementById("select-all-devices");
    const deviceCheckboxes = document.querySelectorAll(".device-checkbox");

    selectAllCheckbox.addEventListener("change", (e) => {
      deviceCheckboxes.forEach((checkbox) => {
        checkbox.checked = e.target.checked;
      });
      selectAllCheckbox.indeterminate = false;
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
    showLoader("Loading groups...");
    const groupsList = document.getElementById("groups-list");
    groupsList.innerHTML = "";

    try {
      const groupsRef = collection(db, `users/${userId}/deviceGroups`);
      const groupsSnapshot = await getDocs(groupsRef);

      if (groupsSnapshot.empty) {
        groupsList.innerHTML = "<p>No groups assigned yet.</p>";
        hideLoader();
        return;
      }

      groupsSnapshot.forEach((doc) => {
        const groupData = doc.data();
        const groupBox = document.createElement("div");
        groupBox.classList.add("group-box");
        groupBox.innerHTML = `
          <h4>${groupData.name}</h4>
          <p>${groupData.devices.length} Devices</p>
          <button class="btn btn-primary view-group-btn" data-id="${doc.id}">
            <i class="fas fa-eye" aria-hidden="true"></i>
          
          </button>
          <button class="btn btn-danger delete-group-btn" data-id="${doc.id}">
            <i class="fas fa-trash" aria-hidden="true"></i>
          
          </button>
        `;

        groupBox.querySelector(".view-group-btn").addEventListener("click", () => viewGroup(doc.id));
        groupBox.querySelector(".delete-group-btn").addEventListener("click", () => deleteGroup(doc.id, groupData.name));

        groupsList.appendChild(groupBox);
      });
    } catch (error) {
      console.error("Error loading groups:", error);
      groupsList.innerHTML = "<p>Error loading groups. Please try again.</p>";
      showNotification("error", "Load Failed", "Error loading groups. Please try again.");
    } finally {
      hideLoader();
    }
  }

  function showGroupModal() {
    const selectedDevices = Array.from(document.querySelectorAll(".device-checkbox:checked"))
      .map((checkbox) => checkbox.value);

    if (selectedDevices.length === 0) {
      showNotification("warning", "No Devices Selected", "Please select at least one device to create a group.");
      return;
    }

    const selectedDevicesList = document.getElementById("selectedDevicesList");
    selectedDevicesList.innerHTML = "";
    selectedDevices.forEach((deviceId) => {
      const listItem = document.createElement("li");
      listItem.textContent = deviceId;
      selectedDevicesList.appendChild(listItem);
    });

    modal.classList.remove("hidden");
  }

  function closeGroupModal() {
    modal.classList.add("hidden");
    document.getElementById("groupNameInput").value = "";
    document.querySelectorAll(".device-checkbox").forEach(checkbox => checkbox.checked = false);
    document.getElementById("select-all-devices").checked = false;
    document.getElementById("select-all-devices").indeterminate = false;
  }

  async function createGroup() {
    const selectedDevices = Array.from(document.querySelectorAll(".device-checkbox:checked"))
      .map((checkbox) => checkbox.value);

    if (selectedDevices.length === 0) {
      showNotification("warning", "No Devices Selected", "Please select at least one device to create a group.");
      return;
    }

    const groupNameInput = document.getElementById("groupNameInput");
    const groupName = groupNameInput.value.trim();

    if (!groupName) {
      showNotification("error", "Invalid Input", "Group name is required.");
      return;
    }

    showLoader("Creating group...");

    try {
      const groupId = `group_${Date.now()}`;
      const groupData = {
        name: groupName,
        devices: selectedDevices,
        createdAt: Timestamp.now(),
      };

      const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
      await setDoc(groupRef, groupData);
      showNotification("success", "Group Created", `Group "${groupName}" created successfully.`);
      closeGroupModal();
      loadGroups(userId);
    } catch (error) {
      console.error("Error creating group:", error);
      showNotification("error", "Creation Failed", "Failed to create group. Please try again.");
    } finally {
      hideLoader();
    }
  }

  async function viewGroup(groupId) {
    showLoader("Loading group details...");
    try {
      const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        showNotification("error", "Group Not Found", "The selected group does not exist.");
        hideLoader();
        return;
      }

      const groupData = groupSnap.data();
      const groupDetailsTitle = document.getElementById("group-details-title");
      const groupDevicesList = document.getElementById("group-devices-list");

      groupDetailsTitle.textContent = `Group: ${groupData.name}`;
      groupDevicesList.innerHTML = "";

      if (!groupData.devices.length) {
        groupDevicesList.innerHTML = "<li>No devices in this group</li>";
        showGroupDetails();
        hideLoader();
        return;
      }

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

      const devices = await Promise.all(devicePromises);
      devices.forEach(device => {
        const li = document.createElement("li");
        li.textContent = device.code;
        groupDevicesList.appendChild(li);
      });

      showGroupDetails();
    } catch (error) {
      console.error("Error viewing group:", error);
      showNotification("error", "Load Failed", "Error loading group details. Please try again.");
    } finally {
      hideLoader();
    }
  }

  async function deleteGroup(groupId, groupName) {
    const confirmDelete = await confirm(`Are you sure you want to delete the group "${groupName}"?`);
    if (!confirmDelete) return;

    showLoader(`Deleting group "${groupName}"...`);

    try {
      updateLoaderText("Removing group from database...");
      const groupRef = doc(db, `users/${userId}/deviceGroups/${groupId}`);
      await deleteDoc(groupRef);

      updateLoaderText("Refreshing groups...");
      loadGroups(userId);
      showNotification("success", "Group Deleted", `Group "${groupName}" deleted successfully.`);
    } catch (error) {
      console.error("Error deleting group:", error);
      showNotification("error", "Deletion Failed", "Error deleting group. Please try again.");
    } finally {
      hideLoader();
    }
  }
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