<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Firebase config (same as admin panel)
const firebaseConfig = {
  apiKey: "AIzaSyC5Ez5hbMCbLmybJwcpqaNPR7fTwhvT_B8",
  authDomain: "peonystores-e0710.firebaseapp.com",
  projectId: "peonystores-e0710",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Redirect if already logged in
onAuthStateChanged(auth, user => {
  if(user && user.email === "peonystores26@gmail.com") {
    window.location.href = "admin.html";
  } else if(user) {
    // Not the admin email: sign out
    signOut(auth);
  }
});

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm.onsubmit = async function(e){
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if(userCredential.user.email !== "peonystores26@gmail.com"){
      loginError.textContent = "You are not authorized to access this panel.";
      await signOut(auth);
      return;
    }
    // Admin logged in
    window.location.href = "admin.html";
  } catch(err) {
    console.error(err);
    loginError.textContent = "Invalid email or password";
  }
};
</script>
