// ────────────────────────────────────────────────────────────────────────────────
// script.js: Risk Register with Multi‐User Auth, Live Filter & 5×5 Scatter Plot
// ────────────────────────────────────────────────────────────────────────────────

console.log("🔧 script.js loaded");

let matrixChart = null;
let currentRisks = [];  // full unfiltered list
let filterTerm = "";    // current filter string

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
  filterInput.addEventListener("input", (e) => {
    filterTerm = e.target.value.trim().toLowerCase();
    console.log("🔍 filterTerm =", filterTerm);
    renderTable();
  });
} else {
  console.error("⚠️ filterInput element not found! Ensure HTML has `<input id=\"filterInput\">`.");
}

// ─── 3) Authentication Flow ───────────────────────────────────────────────────
auth.onAuthStateChanged((user) => {
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
  auth
    .createUserWithEmailAndPassword(emailInput.value, passInput.value)
    .catch((e) => alert("Sign-Up Error: " + e.message));
});

signInBtn.addEventListener("click", () => {
  auth
    .signInWithEmailAndPassword(emailInput.value, passInput.value)
    .catch((e) => alert("Sign-In Error: " + e.message));
});

signOutBtn.addEventListener("click", () => auth.signOut());

// ─── 4) Firestore Helper ──────────────────────────────────────────────────────
function userRisksRef() {
  return db
    .collection("users")
    .doc(auth.currentUser.uid)
    .collection("risks");
}

// ─── 5) Add Risk Handler ──────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title       = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const prob        = parseInt(document.getElementById("probability").value,  10);
  const impact      = parseInt(document.getElementById("impact").value,       10);

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
  currentRisks   = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // 2) Apply generic filter if needed
  const displayed = filterTerm
    ? currentRisks.filter((risk) =>
        Object.values(risk).some((val) =>
          String(val).toLowerCase().includes(filterTerm)
        )
      )
    : currentRisks;

  console.log(`📊 renderTable: showing ${displayed.length}/${currentRisks.length} risks`);

  // 3) Render rows
  tableBody.innerHTML = "";
  displayed.forEach((risk) => {
    const cls = risk.score >= 15 ? "high" : risk.score >= 6 ? "medium" : "low";
    const tr  = document.createElement("tr");
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

  // 4) Redraw the chart with the filtered set
  updateMatrixChart(displayed);
}

// ─── 7) Clear All Risks ───────────────────────────────────────────────────────
clearBtn.addEventListener("click", async () => {
  if (!confirm("Delete ALL your risks?")) return;
  const snapshot = await userRisksRef().get();
  const batch    = db.batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  renderTable();
});

// ─── 8) Export to CSV ─────────────────────────────────────────────────────────
exportBtn.addEventListener("click", () => {
  if (currentRisks.length === 0) return alert("No risks to export.");

  const header = ["Title", "Description", "Probability", "Impact", "Score"];
  const rows   = currentRisks.map((r) => [
    r.title, r.description, r.probability, r.impact, r.score
  ]);
  const csv    =
    "data:text/csv;charset=utf-8," + [header, ...rows].map((r) => r.join(",")).join("\n");

  const link = document.createElement("a");
  link.href     = encodeURI(csv);
  link.download = "risk_register.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ─── 9) 5×5 Risk Matrix Scatter Plot Helper ──────────────────────────────────
function updateMatrixChart(risksToPlot = currentRisks) {
  const dataPoints = risksToPlot.map((risk) => {
    let color;
    if (risk.score >= 15)      color = 'rgba(220,53,69,0.8)';
    else if (risk.score >= 6)  color = 'rgba(255,193,7,0.8)';
    else                        color = 'rgba(40,167,69,0.8)';
    return { x: risk.probability, y: risk.impact, backgroundColor: color };
  });

  const cfg = {
    type: 'scatter',
    data: { datasets: [{ data: dataPoints, pointRadius: 5 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Probability' },
          min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: '#eee' }
        },
        y: {
          title: { display: true, text: 'Impact' },
          min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: '#eee' }
        }
      },
