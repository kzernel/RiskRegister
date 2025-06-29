// ────────────────────────────────────────────────────────────────────────────────
// script.js: Risk Register with Multi-User, Generic Filter & 5×5 Scatter Plot
// ────────────────────────────────────────────────────────────────────────────────

console.log("🔧 script.js loaded");

let matrixChart = null;
let currentRisks = [];    // full list from Firestore
let filterTerm = "";      // current filter string

// ─── 1) Firebase Initialization ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCI_brM58_psBt8IpYQlDCJ0u2pZO1EtAE",
  authDomain: "risk-register-63ef2.firebaseapp.com",
  projectId: "risk-register-63ef2",
  storageBucket: "risk-register-63ef2.appspot.com",
  messagingSenderId: "189252582282",
  appId: "1:189252582282:web:14f2dc7b79da2dbd0fa673",
  measurementId: "G-LY31GS5RKV"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ─── 2) Grab DOM Elements ────────────────────────────────────────────────────
const authContainer = document.getElementById("auth-container");
const appContainer  = document.getElementById("app-container");
const emailInput    = document.getElementById("email");
const passInput     = document.getElementById("password");
const signUpBtn     = document.getElementById("signUpBtn");
const signInBtn     = document.getElementById("signInBtn");
const signOutBtn    = document.getElementById("signOutBtn");
const form          = document.getElementById("riskForm");
const filterInput   = document.getElementById("filterInput");
const tableBody     = document.getElementById("riskTable");
const clearBtn      = document.getElementById("clearRisks");
const exportBtn     = document.getElementById("exportCSV");

console.log("🔧 filterInput =", filterInput);
if (filterInput) {
  filterInput.addEventListener("input", e => {
    filterTerm = e.target.value.trim().toLowerCase();
    console.log("🔍 filterTerm =", filterTerm);
    renderTable();
  });
} else {
  console.error("⚠️ filterInput element not found—check your HTML!");
}

// ─── 3) Authentication Flow ───────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (user) {
    authContainer.style.display = "none";
    appContainer.style.display  = "block";
    renderTable();
  } else {
    authContainer.style.display = "block";
    appContainer.style.display  = "none";
  }
});

signUpBtn.addEventListener("click", () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passInput.value)
      .catch(e => alert("Sign-Up Error: " + e.message));
});

signInBtn.addEventListener("click", () => {
  auth.signInWithEmailAndPassword(emailInput.value, passInput.value)
      .catch(e => alert("Sign-In Error: " + e.message));
});

signOutBtn.addEventListener("click", () => auth.signOut());

// ─── 4) Firestore Helper ──────────────────────────────────────────────────────
function userRisksRef() {
  return db.collection("users")
           .doc(auth.currentUser.uid)
           .collection("risks");
}

// ─── 5) Add Risk Handler ──────────────────────────────────────────────────────
form.addEventListener("submit", async e => {
  e.preventDefault();
  const title       = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const prob        = parseInt(document.getElementById("probability").value, 10);
  const impact      = parseInt(document.getElementById("impact").value, 10);

  if (!title || !description || isNaN(prob) || isNaN(impact)) {
    return alert("All fields are required, and Probability/Impact must be numbers.");
  }
  const score = prob * impact;

  await userRisksRef().add({ title, description, probability: prob, impact, score });
  form.reset();
  renderTable();
});

// ─── 6) Render Table & Update Chart ────────────────────────────────────────────
async function renderTable() {
  // 1) Fetch & build full list
  const snapshot = await userRisksRef().orderBy("score", "desc").get();
  currentRisks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 2) Apply generic filter (if filterTerm is non-empty)
  const displayed = filterTerm
    ? currentRisks.filter(risk =>
        Object.values(risk).some(val =>
          String(val).toLowerCase().includes(filterTerm)
        )
      )
    : currentRisks;

  console.log(`📊 renderTable: showing ${displayed.length}/${currentRisks.length} risks`);

  // 3) Render rows for *displayed* only
  tableBody.innerHTML = "";
  displayed.forEach(risk => {
    c
