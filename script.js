// ────────────────────────────────────────────────────────────────────────────────
// script.js: Risk Register with Multi-User Auth, Text & Column Filters, 5×5 Heatmap
// ────────────────────────────────────────────────────────────────────────────────

console.log("🔧 script.js loaded");

// ─── Gradient Heatmap Plugin (softer colors) ─────────────────────────────────
const gradientHeatmapPlugin = {
  id: 'gradientHeatmapPlugin',
  beforeDatasetsDraw(chart) {
    const {
      ctx,
      chartArea: { top, bottom, left, right }
    } = chart;

    const cellW = (right - left) / 5;
    const cellH = (bottom - top) / 5;
    const minScore = 1, maxScore = 25;

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const prob  = i + 1;
        const imp   = 5 - j;
        const score = prob * imp;
        const t     = (score - minScore) / (maxScore - minScore);
        const hue   = (1 - t) * 120;  // 120°→0°

        // Softer palette: 80% saturation, 70% lightness
        ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;

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
Chart.register(gradientHeatmapPlugin);
// ────────────────────────────────────────────────────────────────────────────────

// ─── App State & Filters ───────────────────────────────────────────────────────
let matrixChart    = null;
let currentRisks   = [];  // full Firestore list
let textFilter     = "";  // 🔍
let severityFilter = "";  // 🚦
let probFilter     = "";  // 🎲
let impactFilter   = "";  // 💥

// ─── Firebase Init ─────────────────────────────────────────────────────────────
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

// ─── DOM Elements ─────────────────────────────────────────────────────────────
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
const dateIdInput      = document.getElementById("dateIdentified");
const dateMitInput     = document.getElementById("dateMitigated");
const commentsInput    = document.getElementById("comments");
const statusSelect     = document.getElementById("status");
const tableBody       = document.getElementById("riskTable");
const clearBtn        = document.getElementById("clearRisks");
const exportBtn       = document.getElementById("exportCSV");

// ─── Filter Listeners ──────────────────────────────────────────────────────────
[textInput, severitySelect, probSelect, impactSelect].forEach(el => {
  if (!el) return console.error("Missing filter element:", el);
  el.addEventListener("input",  applyFilters);
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

// ─── Auth Flow ────────────────────────────────────────────────────────────────
auth.onAuthStateChanged(function(user) {
  if (user) {
    authContainer.style.display = "none";
    appContainer.style.display  = "block";
    renderTable();
  } else {
    authContainer.style.display = "block";
    appContainer.style.display  = "none";
  }
});

signUpBtn.addEventListener("click", async function() {
  try {
    await auth.createUserWithEmailAndPassword(emailInput.value, passInput.value);
  } catch (e) {
    alert("Sign-Up Error: " + e.message);
  }
});

signInBtn.addEventListener("click", async function() {
  try {
    await auth.signInWithEmailAndPassword(emailInput.value, passInput.value);
  } catch (e) {
    alert("Sign-In Error: " + e.message);
  }
});

signOutBtn.addEventListener("click", function() {
  auth.signOut();
});

// ─── Firestore Helper ─────────────────────────────────────────────────────────
function userRisksRef() {
  return db
    .collection("users")
    .doc(auth.currentUser.uid)
    .collection("risks");
}

// ─── Add Risk Handler ─────────────────────────────────────────────────────────
form.addEventListener("submit", async function(e) {
  e.preventDefault();
  const title            = document.getElementById("title").value.trim();
const description      = document.getElementById("description").value.trim();
const prob             = parseInt(document.getElementById("probability").value, 10);
const impact           = parseInt(document.getElementById("impact").value,      10);
const dateIdentified   = document.getElementById("dateIdentified").value;       // YYYY-MM-DD
const dateMitigated    = document.getElementById("dateMitigated").value;        // may be empty
const comments         = document.getElementById("comments").value.trim();
const status           = document.getElementById("status").value;
const score            = prob * impact;

await userRisksRef().add({
  title,
  description,
  probability: prob,
  impact,
  score,
  dateIdentified,
  dateMitigated: dateMitigated || null,
  comments,
  status
});
  form.reset();
  renderTable();
});

// ─── Render Table & Update Chart ───────────────────────────────────────────────
async function renderTable() {
  // … your fetch + filtering logic …

  tableBody.innerHTML = ""; 
  filtered.forEach(risk => {
    // decide row class
    const cls = risk.score >= 15 ? "high"
              : risk.score >=  6 ? "medium"
              :                      "low";

    const tr = document.createElement("tr");
    tr.classList.add(cls);

    // give each cell a data-field & contenteditable
    tr.innerHTML = `
      <td data-field="title"       contenteditable>${risk.title}</td>
      <td data-field="description" contenteditable>${risk.description}</td>
      <td data-field="probability" contenteditable>${risk.probability}</td>
      <td data-field="impact"      contenteditable>${risk.impact}</td>
      <td>${risk.score}</td>                        <!-- score is computed -->
      <td data-field="dateIdentified" contenteditable>${risk.dateIdentified||""}</td>
      <td data-field="dateMitigated"   contenteditable>${risk.dateMitigated||""}</td>
      <td data-field="comments"        contenteditable>${risk.comments||""}</td>
      <td data-field="status"          contenteditable>${risk.status||""}</td>
    `;

    // when any cell loses focus, push update
    tr.querySelectorAll("[contenteditable]").forEach(cell => {
      cell.addEventListener("blur", async e => {
        const field = e.target.dataset.field;
        let newVal = e.target.innerText.trim();

        // parse numbers for probability/impact
        if (field === "probability" || field === "impact") {
          newVal = parseInt(newVal, 10);
          if (isNaN(newVal) || newVal < 1 || newVal > 5) {
            return alert("Probability & Impact must be a number 1–5");
          }
        }

        // update Firestore
        const docRef = userRisksRef().doc(risk.id);
        // recompute score if needed
        let updateObj = { [field]: newVal };
        if (field === "probability" || field === "impact") {
          const otherField = field === "probability" ? "impact" : "probability";
          const otherVal   = risk[otherField];
          updateObj.score  = (field==="probability" ? newVal : otherVal)
                           * (field==="impact"      ? newVal : otherVal);
        }

        try {
          await docRef.update(updateObj);
          renderTable();   // re-render so score & coloring stay in sync
        } catch(err) {
          console.error("Update failed:", err);
          alert("Could not save change.");
        }
      });
    });

    tableBody.appendChild(tr);
  });

  updateMatrixChart(filtered);
}


  updateMatrixChart(filtered);
}

// ─── Clear All Risks ──────────────────────────────────────────────────────────
clearBtn.addEventListener("click", async function() {
  if (!confirm("Delete ALL your risks?")) return;
  const snap = await userRisksRef().get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  renderTable();
});

// ─── Export to CSV ─────────────────────────────────────────────────────────────
exportBtn.addEventListener("click", function() {
  if (currentRisks.length === 0) {
    alert("No risks to export");
    return;
  }
 const header = [
  "Title","Description","Probability","Impact","Score",
  "Date Identified","Date Mitigated","Comments","Status"
];

const rows = currentRisks.map(r => [
  r.title,
  r.description,
  r.probability,
  r.impact,
  r.score,
  r.dateIdentified  || "",
  r.dateMitigated   || "",
  r.comments        .replace(/,/g,";"),  // avoid CSV-breaking commas
  r.status
]);
  const csv = "data:text/csv;charset=utf-8," +
              [header, ...rows].map(r => r.join(",")).join("\n");
  const link = document.createElement("a");
  link.href     = encodeURI(csv);
  link.download = "risk_register.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ─── Draw 5×5 Heatmap + Scatter ────────────────────────────────────────────────
function updateMatrixChart(risksToPlot = currentRisks) {
  const dataPoints = risksToPlot.map(function(r) {
    let color;
    if      (r.score >= 15) color = "rgba(220,53,69,0.8)";
    else if (r.score >=  6) color = "rgba(255,193,7,0.8)";
    else                    color = "rgba(40,167,69,0.8)";
    return { x: r.probability, y: r.impact, backgroundColor: color };
  });

  const cfg = {
    type: "scatter",
    data:    { datasets: [{ data: dataPoints, pointRadius: 5 }] },
    options: {
      responsive:         true,
      maintainAspectRatio:false,
      scales: {
        x: {
          title: { display: true, text: "Probability" },
          min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: "#eee" }
        },
        y: {
          title: { display: true, text: "Impact" },
          min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: "#eee" }
        }
      },
      plugins: { legend: { display: false } }
    },
    plugins: [ gradientHeatmapPlugin ]
  };

  const ctx = document.getElementById("riskMatrix").getContext("2d");
  if (matrixChart) {
    matrixChart.data.datasets[0].data = dataPoints;
    matrixChart.update();
  } else {
    matrixChart = new Chart(ctx, cfg);
  }
}
