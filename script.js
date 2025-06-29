// ────────────────────────────────────────────────────────────────────────────────
// script.js: Risk Register with Multi‐User Auth, Text & Column Filters, 5×5 Heatmap
// ────────────────────────────────────────────────────────────────────────────────

console.log("🔧 script.js loaded");

// ─── Heatmap Plugin ────────────────────────────────────────────────────────────
const heatmapPlugin = {
  id: 'heatmapPlugin',
  beforeDatasetsDraw(chart) {
    console.log("🗺️ heatmapPlugin firing");
    const {
      ctx,
      chartArea: { top, bottom, left, right }
    } = chart;
    const cellW = (right - left) / 5;
    const cellH = (bottom - top) / 5;

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const prob  = i + 1;
        const imp   = 5 - j;
        const score = prob * imp;
        let color;

        if (score >= 15)      color = 'rgba(220,53,69,0.25)';  // red
        else if (score >= 6)  color = 'rgba(255,193,7,0.25)';  // yellow
        else                  color = 'rgba(40,167,69,0.25)';  // green

        ctx.fillStyle = color;
        ctx.fillRect(
          left + i * cellW,
          top  + j * cellH,
          cellW,
          cellH
        );
      }
    }
  }
};
Chart.register(heatmapPlugin);
// ────────────────────────────────────────────────────────────────────────────────

let matrixChart    = null;
let currentRisks   = [];  // full Firestore list
let textFilter     = "";  // 🔍 Search
let severityFilter = "";  // 🚦 All / low / medium / high
let probFilter     = "";  // 🎲 1–5 or all
let impactFilter   = "";  // 💥 1–5 or all

// ─── 1) Firebase Init ───────────────────────────────────────────────────────────
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

// ─── 2) DOM Elements ───────────────────────────────────────────────────────────
const authContainer   = document.getElementById("auth-container");
const appContainer    = document.getElementById("app-container");
const emailInput      = document.getElementById("email");
const passInput       = document.getElementById("password");
const signUpBtn       = document.getElementById("signUpBtn");
const signInBtn       = document.getElementById("signInBtn");
const signOutBtn      = document.getElementById("signOutBtn");
const form            = document.getElementById("riskForm");
const textInput       = document.getElementById("filterInput");
const severitySelect  = document.getElementById("severityFilter");
const probSelect      = document.getElementById("probFilter");
const impactSelect    = document.getElementById("impactFilter");
const tableBody       = document.getElementById("riskTable");
const clearBtn        = document.getElementById("clearRisks");
const exportBtn       = document.getElementById("exportCSV");

// Fire up filter listeners
[textInput, severitySelect, probSelect, impactSelect].forEach(el => {
  if (!el) return console.error("Missing filter element:", el);
  el.addEventListener("input", applyFilters);
  el.addEventListener("change", applyFilters);
});

function applyFilters() {
  textFilter     = textInput.value.trim().toLowerCase();
  severityFilter = severitySelect.value;
  probFilter     = probSelect.value;
  impactFilter   = impactSelect.value;
  console.log("Filters:", { textFilter, severityFilter, probFilter, impactFilter });
  renderTable();
}

// ─── 3) Auth Flow ─────────────────────────────────────────────────────────────
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

signUpBtn.addEventListener("click",  () =>
  auth.createUserWithEmailAndPassword(emailInput.value, passInput.value)
      .catch(e => alert("Sign-Up Error: " + e.mes
