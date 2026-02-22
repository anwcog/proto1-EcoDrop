import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyAPQQ2a3nFFosVan31BO-aGn6t7MhkSZlQ",
  authDomain: "ecodrop-be7bb.firebaseapp.com",
  projectId: "ecodrop-be7bb",
  storageBucket: "ecodrop-be7bb.appspot.com",
  messagingSenderId: "377804166320",
  appId: "1:377804166320:web:5c12fa88a1ecf5c4ba5775"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- LOGIN ---
window.login = async function () {
  const email = emailInput();
  const password = passwordInput();
  if (!email || !password) return showNotice("Please enter email and password.");

  toggleLoading("loginBtn", true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showNotice("Login failed: " + error.message);
  } finally {
    toggleLoading("loginBtn", false);
  }
};

// --- REGISTER ---
window.register = async function () {
  const name = document.getElementById("name").value;
  const email = emailInput();
  const password = passwordInput();
  const mobile = document.getElementById("mobile").value;

  if (!name || !email || !password || !mobile) {
    return showNotice("Please fill in all fields.");
  }

  toggleLoading("regBtn", true);
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), { 
      name: name,
      email: email,
      mobile: mobile,
      points: 0,
      profilePic: null
    });
    window.location.href = "index.html";
  } catch (error) {
    showNotice("Registration failed: " + error.message);
  } finally {
    toggleLoading("regBtn", false);
  }
};

// --- LOGOUT ---
window.logout = () => signOut(auth);

// --- NAVIGATION ---
window.navigate = function(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId + "Page").classList.add("active");
};

// --- UTILITIES ---
function showNotice(msg) {
  const el = document.getElementById("authNotice");
  if (!el) return;
  el.innerText = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 6000);
}

function toggleLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const spinner = btn.querySelector(".spinner");
  const text = btn.querySelector(".btnText");
  
  btn.disabled = isLoading;
  if (spinner) spinner.classList.toggle("hidden", !isLoading);
  if (isLoading) {
    text.dataset.oldText = text.innerText;
    text.innerText = "Processing...";
  } else {
    text.innerText = text.dataset.oldText || (btnId === "loginBtn" ? "Login" : "Register");
  }
}

function emailInput() { return document.getElementById("email").value; }
function passwordInput() { return document.getElementById("password").value; }

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, async (user) => {
  const loginScreen = document.getElementById("loginScreen");
  const appScreen = document.getElementById("appScreen");

  if (user) {
    loginScreen.classList.remove("active");
    appScreen.classList.add("active");

    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      document.getElementById("userName").innerText = data.name || "User";
      document.getElementById("infoName").innerText = data.name || "";
      document.getElementById("userEmail").innerText = data.email || user.email;
      document.getElementById("infoEmail").innerText = data.email || user.email;
      document.getElementById("infoMobile").innerText = data.mobile || "";
      document.getElementById("points").innerText = data.points || 0;
      document.getElementById("profilePoints").innerText = data.points || 0;

      const avatar = document.getElementById("profileAvatar");
      if (data.profilePic) {
        avatar.innerHTML = `<img src="${data.profilePic}" alt="Profile Picture">`;
      } else {
        avatar.innerText = data.name ? data.name.charAt(0).toUpperCase() : "?";
      }
    }
    
    // Load leaderboard when user logs in
    loadLeaderboard();
  } else {
    loginScreen.classList.add("active");
    appScreen.classList.remove("active");
  }
});

// --- LOAD LEADERBOARD ---
function loadLeaderboard() {
  const leaderboardList = document.getElementById("leaderboardList");
  if (!leaderboardList) return;
  
  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

  // Load all users and sort client-side (avoids Firestore index requirements)
  const q = query(collection(db, "users"));
  
  onSnapshot(q, (snapshot) => {
    leaderboardList.innerHTML = "";
    
    if (snapshot.empty) {
      leaderboardList.innerHTML = "<li style='text-align:center;color:#888;'>No users yet</li>";
      return;
    }
    
    // Collect all users and sort by points
    const users = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    users.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    // Display top 10
    users.slice(0, 10).forEach((user, index) => {
      const li = document.createElement("li");
      li.className = "leaderboard-item";

      // Rank
      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = `#${index + 1}`;

      // Avatar
      const avatar = document.createElement("div");
      avatar.className = "leaderboard-avatar";
      if (user.profilePic) {
        const img = document.createElement("img");
        img.src = user.profilePic;
        img.alt = user.name || "User";
        avatar.appendChild(img);
      } else {
        avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : "?";
      }

      // Name
      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = user.name || "Unknown User";

      // Points
      const points = document.createElement("span");
      points.className = "leaderboard-points";
      points.textContent = `${user.points || 0} pts`;

      li.appendChild(rank);
      li.appendChild(avatar);
      li.appendChild(name);
      li.appendChild(points);

      // Highlight current user
      if (currentUserId && user.id === currentUserId) {
        li.classList.add("current-user");
      }

      leaderboardList.appendChild(li);
    });
  }, (error) => {
    console.error("Leaderboard error:", error);
    leaderboardList.innerHTML = "<li style='text-align:center;color:#e74c3c;'>Error: " + error.message + "</li>";
  });
}

// --- UPDATE NAME ---
window.updateName = async function () {
  const newName = document.getElementById("editName").value;
  const user = auth.currentUser;
  if (!user || !newName) return showNotice("Please enter a new name.");

  try {
    await updateDoc(doc(db, "users", user.uid), { name: newName });
    document.getElementById("userName").innerText = newName;
    document.getElementById("infoName").innerText = newName;
    document.getElementById("profileAvatar").innerText = newName.charAt(0).toUpperCase();
    showNotice("Name updated successfully!");
  } catch (error) {
    showNotice("Failed to update name: " + error.message);
  }
};

// --- UPDATE PROFILE PICTURE ---
window.updateProfilePic = async function (event) {
  const file = event.target.files[0];
  const user = auth.currentUser;
  if (!file || !user) return;

  try {
    const storageRef = ref(storage, `profilePics/${user.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", user.uid), { profilePic: url });

    const avatar = document.getElementById("profileAvatar");
    avatar.innerHTML = `<img src="${url}" alt="Profile Picture">`;

    showNotice("Profile picture updated successfully!");
  } catch (error) {
    showNotice("Failed to update profile picture: " + error.message);
  }
};

// --- FILE UPLOAD HANDLER FOR REWARDS ---
window.handleUpload = async function (event) {
  const file = event.target.files[0];
  const notice = document.getElementById("rewardNotice");

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    notice.innerText = "Please upload an image file.";
    notice.classList.remove("hidden");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists() && snap.data().rewardClaimed) {
    notice.innerText = "Reward already claimed!";
    notice.classList.remove("hidden");
    return;
  }

  await setDoc(userRef, { rewardClaimed: true, points: (snap.data().points || 0) + 10 }, { merge: true });
  document.getElementById("points").innerText = (snap.data().points || 0) + 10;
  document.getElementById("profilePoints").innerText = (snap.data().points || 0) + 10;

  notice.innerText = "✅ File uploaded successfully! Reward verified.";
  notice.classList.remove("hidden");

  setTimeout(() => notice.classList.add("hidden"), 5000);
};

// Toggle edit form
window.toggleEdit = function () {
  const form = document.getElementById("editForm");
  const btn = document.getElementById("editToggleBtn");
  form.classList.toggle("hidden");
  btn.innerText = form.classList.contains("hidden") ? "Edit Account" : "Stop Editing";
};

// Preview profile picture before saving
window.previewProfilePic = function (event) {
  const file = event.target.files[0];
  if (!file) return;
  const avatar = document.getElementById("editAvatar");
  avatar.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Preview">`;
};

// Save all changes at once
window.saveChanges = async function () {
  const user = auth.currentUser;
  if (!user) return showNotice("No user logged in.");

  const newName = document.getElementById("editName").value.trim();
  const newMobile = document.getElementById("editMobile").value.trim();
  const file = document.getElementById("profilePicUpload").files[0];

  try {
    let profilePicUrl = null;
    if (file) {
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      profilePicUrl = await getDownloadURL(storageRef);
    }

    const updates = {};
    if (newName) updates.name = newName;
    if (newMobile) updates.mobile = newMobile;
    if (profilePicUrl) updates.profilePic = profilePicUrl;

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, "users", user.uid), updates);

      // Update UI immediately
      if (updates.name) {
        document.getElementById("userName").innerText = updates.name;
        document.getElementById("infoName").innerText = updates.name;
        document.getElementById("profileAvatar").innerHTML = `<div style="font-size:24px;">${updates.name.charAt(0).toUpperCase()}</div>`;
      }
      if (updates.mobile) {
        document.getElementById("infoMobile").innerText = updates.mobile;
      }
      if (updates.profilePic) {
        const img = document.createElement("img");
        img.src = updates.profilePic;
        img.alt = "Profile Picture";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        document.getElementById("profileAvatar").innerHTML = "";
        document.getElementById("profileAvatar").appendChild(img);
      }

      showNotice("✅ Changes saved successfully!");
      
      // Clear form
      document.getElementById("editName").value = "";
      document.getElementById("editMobile").value = "";
      document.getElementById("profilePicUpload").value = "";
      document.getElementById("editAvatar").innerHTML = "+";
    } else {
      showNotice("No changes to save.");
    }

    // Exit edit mode
    toggleEdit();
  } catch (error) {
    showNotice("❌ Failed to save changes: " + error.message);
    console.error("Save error:", error);
  }
};

function navigate(page) {
  // Show loader
  document.getElementById("loader").classList.remove("hidden");

  // Hide all pages
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  // Delay before showing target page
  setTimeout(() => {
    document.getElementById(page + "Page").classList.add("active");

    // Hide loader
    document.getElementById("loader").classList.add("hidden");
  }, 1500); // 1 second delay

  // If showing the map page, ensure Leaflet map resizes properly
  if (page === "map") {
    setTimeout(() => {
      if (window._ecoMap) window._ecoMap.invalidateSize && window._ecoMap.invalidateSize();
    }, 300);
  }
}

// Initialize Leaflet map (OpenStreetMap) once DOM is ready
function initLeafletMap() {
  if (typeof L === 'undefined') return console.warn('Leaflet not loaded');
  if (window._ecoMap) return; // already initialized

  try {
    // Create map centered on world view
    const map = L.map('map', { zoomControl: true });
    window._ecoMap = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Try to center on user's location
    map.locate({ setView: true, maxZoom: 15 });
    map.on('locationfound', (e) => {
      L.marker(e.latlng).addTo(map).bindPopup('You are here').openPopup();
    });

    // Fallback center
    map.setView([20, 0], 2);
  } catch (err) {
    console.error('Leaflet init error:', err);
  }
}

document.addEventListener('DOMContentLoaded', initLeafletMap);
