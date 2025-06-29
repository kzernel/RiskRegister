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
// ─────────────────────────────────────────────────────────────────────────────

// ─── 2) Grab DOM Elements ────────────────────────────────────────────────────
const authContainer = document.getElementById("auth-container");
const appContainer  = document.getElementById("app-container");
const emailInput    = document.getElementById("email");
const passInput     = document.getElementById("password");
const signUpBtn     = document.getElementById("signUpBtn");
const signInBtn     = document.getElementById("signInBtn");
const signOutBtn    = document.getElementById("signOutBtn");
const form          = document.getElementById("riskForm");
const tableBody     = document.getElementById("riskTable");
const clearBtn      = document.getElementById("clearRisks");
const exportBtn     = document.getElementById("exportCSV");

let currentRisks = [];  // cache for CSV export

// ─── 3) Authentication Flow ───────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (user) {
    // Show the app, hide auth
    authContainer.style.display = "none";
    appContainer.style.display  = "block";
    renderTable();
  } else {
    // Show auth, hide app
    authContainer.style.display = "block";
    appContainer.style.display  = "none";
  }
});

// Sign Up
signUpBtn.addEventListener("click", () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passInput.value)
      .catch(e => alert("Sign-Up Error: "+e.message));
});

// Sign In
signInBtn.addEventListener("click", () => {
  auth.signInWithEmailAndPassword(emailInput.value, passInput.value)
      .catch(e => alert("Sign-In Error: "+e.message));
});

// Sign Out
signOutBtn.addEventListener("click", () => auth.signOut());

// ─── 4) Firestore Helpers ────────────────────────────────────────────────────
function userRisksRef() {
  return db.collection("users")
           .doc(auth.currentUser.uid)
           .collection("risks");
}

// ─── 5) Add a Risk ───────────────────────────────────────────────────────────
form.addEventListener("submit", async e => {
  e.preventDefault();
  const title       = form.title.value;
  const description = form.description.value;
  const prob        = parseInt(form.probability.value, 10);
  const impact      = parseInt(form.impact.value, 10);
  const score       = prob * impact;

  await userRisksRef().add({ title, description, probability: prob, impact, score });
  form.reset();
  renderTable();
});

// ─── 6) Render Table with Color Coding ───────────────────────────────────────
async function renderTable() {
  const snapshot = await userRisksRef()
    .orderBy("score", "desc")
    .get();

  tableBody.innerHTML = "";
  currentRisks = [];

  snapshot.forEach(doc => {
    const risk = { id: doc.id, ...doc.data() };
    currentRisks.push(risk);

    const cls = (risk.score >= 15) ? "high"
              : (risk.score >= 6)  ? "medium"
              :                       "low";

    const tr = document.createElement("tr");
    tr.classList.add(cls);
    tr.innerHTML = `
      <td>${risk.title}</td>
      <td>${risk.description}</td>
      <td>${risk.probability}</td>
      <td>${risk.impact}</td>
      <td>${risk.score}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ─── 7) Clear All Risks ──────────────────────────────────────────────────────
clearBtn.addEventListener("click", async () => {
  if (!confirm("Delete ALL your risks?")) return;
  const snapshot = await userRisksRef().get();
  const batch    = db.batch();
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  renderTable();
});

// ─── 8) Export to CSV ─────────────────────────────────────────────────────────
exportBtn.addEventListener("click", () => {
  if (currentRisks.length === 0) {
    return alert("No risks to export.");
  }

  const header = ["Title","Description","Probability","Impact","Score"];
  const rows   = currentRisks.map(r => [r.title, r.description, r.probability, r.impact, r.score]);

  const csv = "data:text/csv;charset=utf-8," 
            + [header, ...rows].map(r => r.join(",")).join("\n");

  const link = document.createElement("a");
  link.href     = encodeURI(csv);
  link.download = "risk_register.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
``

